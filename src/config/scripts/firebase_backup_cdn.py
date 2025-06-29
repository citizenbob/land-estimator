#!/usr/bin/env python3
"""
Firebase Storage Backup CDN Client

Provides redundant CDN storage for index files using Firebase Storage
as a backup to Vercel Blob Storage.
"""

import os
import json
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, List

try:
    from dotenv import load_dotenv
    # Load environment variables
    project_root = Path(__file__).parent.parent.parent.parent
    env_path = project_root / '.env.local'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

try:
    import firebase_admin
    from firebase_admin import credentials, storage
    print("✅ Firebase Admin SDK available")
except ImportError:
    print("❌ Firebase Admin SDK not available. Install with: pip install firebase-admin")
    firebase_admin = None
    storage = None

class FirebaseBackupCDN:
    """Firebase Storage backup CDN client"""
    
    def __init__(self):
        self.app = None
        self.bucket = None
        self.initialized = False
        
    def initialize(self):
        """Initialize Firebase Admin SDK if available"""
        if not firebase_admin:
            print("⚠️ Firebase Admin SDK not available - backup CDN disabled")
            return False
            
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Load credentials from environment
                project_id = os.getenv("FIREBASE_PROJECT_ID")
                private_key = os.getenv("FIREBASE_PRIVATE_KEY")
                client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
                storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET") or f"{project_id}.firebasestorage.app"
                
                # Validate required fields
                if not all([project_id, private_key, client_email]):
                    missing = []
                    if not project_id: missing.append("FIREBASE_PROJECT_ID")
                    if not private_key: missing.append("FIREBASE_PRIVATE_KEY") 
                    if not client_email: missing.append("FIREBASE_CLIENT_EMAIL")
                    print(f"⚠️ Missing Firebase credentials: {missing}")
                    print("Firebase backup CDN will be disabled")
                    return False
                
                firebase_config = {
                    "type": "service_account",
                    "project_id": project_id,
                    "private_key": private_key.replace("\\n", "\n"),
                    "client_email": client_email,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email}"
                }
                
                print(f"🔥 Initializing Firebase with project: {project_id}")
                print(f"🗄️ Storage bucket: {storage_bucket}")
                
                # Create temporary credentials file
                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                    json.dump(firebase_config, f)
                    cred_path = f.name
                
                # Initialize Firebase
                cred = credentials.Certificate(cred_path)
                self.app = firebase_admin.initialize_app(cred, {
                    'storageBucket': storage_bucket
                })
                
                # Clean up temp file
                os.unlink(cred_path)
            else:
                self.app = firebase_admin.get_app()
            
            self.bucket = storage.bucket()
            self.initialized = True
            print("✅ Firebase backup CDN initialized successfully")
            return True
            
        except Exception as e:
            print(f"❌ Failed to initialize Firebase backup CDN: {e}")
            print(f"📍 Make sure Firebase Admin SDK is installed: pip install firebase-admin")
            return False
    
    def upload_file(self, local_path: Path, remote_path: str) -> Optional[Dict[str, str]]:
        """Upload file to Firebase Storage backup CDN"""
        if not self.initialized:
            if not self.initialize():
                return None
        
        try:
            # Upload directly to the cdn/ folder to match the structure you showed
            blob = self.bucket.blob(remote_path)
            
            # Set metadata
            blob.metadata = {
                'uploaded_at': datetime.now().isoformat(),
                'source': 'ingest_pipeline_backup',
                'original_path': str(local_path)
            }
            
            # Upload file
            blob.upload_from_filename(str(local_path))
            
            # Make publicly accessible
            blob.make_public()
            
            download_url = blob.public_url
            print(f"✅ Backup uploaded to Firebase: {remote_path}")
            print(f"🔗 Backup URL: {download_url}")
            
            return {
                'download_url': download_url,
                'firebase_path': remote_path
            }
            
        except Exception as e:
            print(f"❌ Firebase backup upload failed for {remote_path}: {e}")
            return None
    
    def generate_backup_manifest(self, current_version: str, backup_urls: Dict[str, str]):
        """Generate backup version manifest for Firebase CDN"""
        if not self.initialized:
            return None
            
        try:
            manifest = {
                "generated_at": datetime.now().isoformat(),
                "backup_cdn": "firebase",
                "current": {
                    "version": current_version,
                    "files": backup_urls
                },
                "note": "Backup CDN for Vercel Blob Storage redundancy"
            }
            
            # Create temporary manifest file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(manifest, f, indent=2)
                manifest_path = f.name
            
            # Upload manifest
            manifest_url = self.upload_file(Path(manifest_path), "version-manifest-backup.json")
            
            # Clean up temp file
            os.unlink(manifest_path)
            
            if manifest_url:
                print(f"✅ Backup manifest uploaded")
                print(f"📋 Backup manifest URL: {manifest_url}")
            
            return manifest_url
            
        except Exception as e:
            print(f"❌ Failed to generate backup manifest: {e}")
            return None
    
    def list_backup_files(self, prefix: str = "cdn/") -> List[str]:
        """List files in backup CDN"""
        if not self.initialized:
            if not self.initialize():
                return []
        
        try:
            blobs = self.bucket.list_blobs(prefix=prefix)
            return [blob.name for blob in blobs]
        except Exception as e:
            print(f"❌ Failed to list backup files: {e}")
            return []
    
    def cleanup_old_backups(self, keep_versions: int = 3):
        """Remove old backup versions, keeping only the latest N versions"""
        if not self.initialized:
            return
        
        try:
            backup_files = self.list_backup_files()
            
            # Group by file type and extract versions
            version_groups = {}
            for file_path in backup_files:
                if 'address-index-v' in file_path or 'parcel-metadata-v' in file_path:
                    # Extract base name and version
                    parts = file_path.split('/')
                    filename = parts[-1]
                    
                    if 'address-index-v' in filename:
                        base_name = 'address-index'
                    elif 'parcel-metadata-v' in filename:
                        base_name = 'parcel-metadata'
                    else:
                        continue
                    
                    # Extract version
                    version_match = filename.split('-v')[1].split('.json.gz')[0]
                    
                    if base_name not in version_groups:
                        version_groups[base_name] = []
                    
                    version_groups[base_name].append((version_match, file_path))
            
            # Clean up old versions for each file type
            for base_name, versions in version_groups.items():
                # Sort by version (semantic versioning)
                sorted_versions = sorted(versions, key=lambda x: [int(v) for v in x[0].split('.')])
                
                if len(sorted_versions) > keep_versions:
                    to_delete = sorted_versions[:-keep_versions]
                    
                    for version, file_path in to_delete:
                        try:
                            blob = self.bucket.blob(file_path)
                            blob.delete()
                            print(f"🗑️ Deleted old backup: {file_path}")
                        except Exception as e:
                            print(f"❌ Failed to delete backup {file_path}: {e}")
            
        except Exception as e:
            print(f"❌ Failed to cleanup old backups: {e}")
