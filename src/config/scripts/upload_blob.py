#!/usr/bin/env python3
"""
Python wrapper for Vercel Blob client using Node.js uploader subprocess
"""

import subprocess
import json
from pathlib import Path
from typing import Optional, Dict, Any


class BlobClient:
    """Python client for Vercel Blob Storage using Node.js subprocess"""
    
    def __init__(self):
        self.uploader_script = Path(__file__).parent / "upload_blob.js"
        
        if not self.uploader_script.exists():
            raise FileNotFoundError(f"Node.js uploader script not found: {self.uploader_script}")
    
    def upload_file(self, local_file_path: Path, blob_path: str) -> Optional[Dict[str, Any]]:
        """
        Upload a file to Vercel Blob Storage
        
        Args:
            local_file_path: Path to the local file to upload
            blob_path: Target path in blob storage (e.g., "cdn/file.json")
            
        Returns:
            Dict with upload result or None on failure
        """
        try:
            # Call the Node.js uploader via subprocess
            result = subprocess.run(
                ["node", str(self.uploader_script), str(local_file_path), blob_path],
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout per upload
            )
            
            if result.returncode == 0:
                # The Node.js script outputs status messages to stdout, 
                # but the last line should be JSON with the result
                stdout_lines = result.stdout.strip().split('\n')
                last_line = stdout_lines[-1] if stdout_lines else ""
                
                try:
                    # Try to parse the last line as JSON
                    response = json.loads(last_line)
                    return response
                except json.JSONDecodeError:
                    # If JSON parsing fails, look for the URL in the output
                    for line in stdout_lines:
                        if "Upload successful:" in line:
                            url = line.split("Upload successful: ")[-1]
                            return {"success": True, "url": url}
                    
                    # Fallback - upload appears successful but no parseable response
                    return {"success": True, "url": "unknown"}
            else:
                print(f"❌ Upload failed: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            print(f"❌ Upload timed out for {blob_path}")
            return None
        except Exception as e:
            print(f"❌ Upload error for {blob_path}: {e}")
            return None
    
    def list_blobs(self, prefix: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        List blobs with optional prefix filter
        
        Args:
            prefix: Optional prefix to filter blobs
            
        Returns:
            Dict with list result or None on failure
        """
        try:
            cmd = ["node", str(self.uploader_script), "--list"]
            if prefix:
                cmd.extend(["--prefix", prefix])
                
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                try:
                    response = json.loads(result.stdout.strip())
                    return response
                except json.JSONDecodeError:
                    print(f"⚠️ Could not parse list response: {result.stdout}")
                    return None
            else:
                print(f"❌ List failed: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"❌ List error: {e}")
            return None
    
    def delete_blob(self, blob_path: str) -> bool:
        """
        Delete a blob from storage
        
        Args:
            blob_path: Path of the blob to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            result = subprocess.run(
                ["node", str(self.uploader_script), "--delete", blob_path],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                return True
            else:
                print(f"❌ Delete failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Delete error: {e}")
            return False
    
    def download_file(self, blob_path: str, local_path: Path) -> bool:
        """
        Download a file from blob storage
        
        Args:
            blob_path: Path of the blob to download
            local_path: Local path where to save the file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Use requests to download the file directly
            import requests
            
            # Get the blob URL first - use parent directory as prefix to find the blob
            prefix_path = "/".join(blob_path.split("/")[:-1]) + "/"  # Get parent directory
            print(f"🔍 Searching for blob with prefix: {prefix_path}")
            
            blob_list = self.list_blobs(prefix=prefix_path)
            if not blob_list or 'blobs' not in blob_list:
                print(f"❌ No blobs found with prefix: {prefix_path}")
                # Try without prefix as fallback
                print("🔍 Trying to list all blobs...")
                blob_list = self.list_blobs()
                if not blob_list or 'blobs' not in blob_list:
                    print(f"❌ Blob not found: {blob_path}")
                    return False
            
            # Find the exact blob
            blob_url = None
            for blob in blob_list['blobs']:
                print(f"🔍 Checking blob: {blob['pathname']} vs {blob_path}")
                if blob['pathname'] == blob_path:
                    blob_url = blob.get('downloadUrl') or blob.get('url')
                    print(f"✅ Found blob URL: {blob_url}")
                    break
            
            if not blob_url:
                print(f"❌ Blob URL not found for: {blob_path}")
                print(f"Available blobs: {[blob['pathname'] for blob in blob_list['blobs']]}")
                return False
            
            # Download the file
            print(f"📥 Downloading from: {blob_url}")
            response = requests.get(blob_url, stream=True)
            response.raise_for_status()
            
            # Save to local file
            local_path.parent.mkdir(parents=True, exist_ok=True)
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"✅ Downloaded {blob_path} to {local_path}")
            return True
            
        except Exception as e:
            print(f"❌ Download error for {blob_path}: {e}")
            return False
    
    def list_files(self, prefix: Optional[str] = None) -> list:
        """
        List files in blob storage (alias for list_blobs that returns just the files)
        
        Args:
            prefix: Optional prefix to filter files
            
        Returns:
            List of file info dicts
        """
        blob_list = self.list_blobs(prefix)
        if blob_list and 'blobs' in blob_list:
            return blob_list['blobs']
        return []
    
    def delete_file(self, blob_path: str) -> bool:
        """
        Delete a file from blob storage (alias for delete_blob)
        
        Args:
            blob_path: Path of the blob to delete
            
        Returns:
            True if successful, False otherwise
        """
        return self.delete_blob(blob_path)
