import { decompressSync } from 'fflate';

/**
 * Node.js modules interface for testing and dynamic imports
 */
export interface NodeModules {
  fs: {
    readFileSync: (path: string) => Uint8Array;
    existsSync: (path: string) => boolean;
  };
  path: { join: (...paths: string[]) => string };
}

/**
 * Mock storage for test environments
 */
let _testMockNodeModules: NodeModules | null = null;

/**
 * Detects if code is running in browser environment
 */
export function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.document !== 'undefined' &&
    typeof fetch !== 'undefined'
  );
}

/**
 * Sets mock Node.js modules for testing
 */
export function setTestMockNodeModules(mockModules: NodeModules | null): void {
  _testMockNodeModules = mockModules;
}

/**
 * Dynamically imports Node.js modules only in server environment
 */
export async function importNodeModules(): Promise<NodeModules> {
  if (_testMockNodeModules) {
    return _testMockNodeModules;
  }
  if (isBrowser()) {
    throw new Error(
      'Node.js modules cannot be imported in browser environment'
    );
  }

  try {
    const fsModule = await new Function('return import("node:fs")')();
    const pathModule = await new Function('return import("node:path")')();

    return {
      fs: fsModule,
      path: pathModule
    };
  } catch (error) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path');
        return {
          fs: { readFileSync: fs.readFileSync, existsSync: fs.existsSync },
          path: { join: path.join }
        };
      } catch {
        throw new Error('Cannot import Node.js modules in test environment');
      }
    }
    throw error;
  }
}

/**
 * Universal data loader that works in both browser and Node.js environments
 */
export async function loadGzippedData(filename: string): Promise<Uint8Array> {
  if (isBrowser()) {
    const response = await fetch(`/${filename}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${filename}: ${response.status} ${response.statusText}`
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  } else {
    const { fs, path } = await importNodeModules();

    const projectRoot = process.cwd();

    // Vercel-specific paths (production environment)
    const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

    let possiblePaths: string[];

    if (isVercel) {
      // Vercel moves public files to the root in production
      possiblePaths = [
        path.join(projectRoot, filename),
        path.join('/var/task', filename),
        path.join('/var/task/public', filename),
        path.join(projectRoot, 'public', filename)
      ];
    } else {
      // Local development paths
      possiblePaths = [
        path.join(projectRoot, 'public', filename),
        path.join(projectRoot, '.next', 'server', 'public', filename),
        path.join(projectRoot, '.next', 'static', filename),
        path.join(projectRoot, filename),
        `./public/${filename}`
      ];
    }

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log(`📁 Found file at: ${filePath}`);
        return fs.readFileSync(filePath);
      }
    }

    // Debug: Log environment info in production
    console.log('🔍 Debug info:', {
      cwd: projectRoot,
      isVercel,
      env: {
        VERCEL: process.env.VERCEL,
        AWS_LAMBDA: process.env.AWS_LAMBDA_FUNCTION_NAME,
        NODE_ENV: process.env.NODE_ENV
      }
    });

    // If no file found, throw error with all attempted paths
    throw new Error(
      `File not found: ${filename}. Tried paths: ${possiblePaths.join(', ')}`
    );
  }
}

/**
 * Decompresses and parses gzipped JSON data
 */
export function decompressJsonData<T>(gzippedData: Uint8Array): T {
  const decompressed = decompressSync(gzippedData);
  const jsonString = new TextDecoder().decode(decompressed);
  return JSON.parse(jsonString);
}
