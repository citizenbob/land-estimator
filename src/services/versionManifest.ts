import { logError } from '@lib/errorUtils';

export interface VersionManifest {
  generated_at: string;
  current: {
    version: string;
    files: {
      address_index: string;
      parcel_metadata: string;
      parcel_geometry: string;
    };
  };
  previous: {
    version: string;
    files: {
      address_index: string;
      parcel_metadata: string;
      parcel_geometry: string;
    };
  } | null;
  available_versions: string[];
}

interface VersionManifestCache {
  data: VersionManifest;
  timestamp: number;
}

// Cache manifest for 5 minutes to avoid excessive CDN requests
const CACHE_DURATION = 5 * 60 * 1000;
let manifestCache: VersionManifestCache | null = null;

/**
 * Clears the version manifest cache (useful for testing)
 */
export function clearVersionManifestCache(): void {
  manifestCache = null;
}

/**
 * Fetches the current version manifest from CDN with caching and error handling
 * @returns Promise<VersionManifest> Current version manifest
 * @throws Error when manifest cannot be loaded or is invalid
 */
export async function getVersionManifest(): Promise<VersionManifest> {
  // In development mode, return a mock manifest for local files
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Using development version manifest (local files)');
    return {
      generated_at: new Date().toISOString(),
      current: {
        version: 'dev-local',
        files: {
          address_index: '/address-index.json.gz',
          parcel_metadata: '/parcel-metadata.json.gz',
          parcel_geometry: '/parcel-geometry.json.gz'
        }
      },
      previous: null,
      available_versions: ['dev-local']
    };
  }

  // Check cache first
  if (manifestCache && Date.now() - manifestCache.timestamp < CACHE_DURATION) {
    console.log('📦 Using cached version manifest');
    return manifestCache.data;
  }

  try {
    console.log('🔍 Fetching version manifest from CDN...');
    const response = await fetch(
      'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/version-manifest.json',
      {
        // Add cache control to ensure we get fresh data when needed
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, must-revalidate'
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Version manifest fetch failed: ${response.status} ${response.statusText}`
      );
    }

    const manifest: VersionManifest = await response.json();

    // Validate manifest structure
    if (!manifest.current?.version || !manifest.current?.files) {
      throw new Error(
        'Invalid version manifest structure: missing current version or files'
      );
    }

    // Cache the manifest
    manifestCache = {
      data: manifest,
      timestamp: Date.now()
    };

    console.log(
      `✅ Version manifest loaded: current=${manifest.current.version}, previous=${manifest.previous?.version || 'none'}`
    );
    return manifest;
  } catch (error) {
    logError(error, {
      operation: 'version_manifest_fetch',
      endpoint: 'cdn/version-manifest.json'
    });
    throw new Error(`Failed to load version manifest: ${error}`);
  }
}

/**
 * Gets the current version from the manifest
 * @returns Promise<string> Current version string
 */
export async function getCurrentVersion(): Promise<string> {
  const manifest = await getVersionManifest();
  return manifest.current.version;
}

/**
 * Gets the previous version from the manifest (for fallback)
 * @returns Promise<string | null> Previous version string or null if none exists
 */
export async function getPreviousVersion(): Promise<string | null> {
  const manifest = await getVersionManifest();
  return manifest.previous?.version || null;
}
