import { decompressSync } from 'fflate';

/**
 * Node.js modules interface for testing and dynamic imports
 */
export interface NodeModules {
  fs: {
    readFileSync: (path: string) => Uint8Array;
    existsSync: (path: string) => boolean;
    readdirSync: (path: string) => string[];
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
          fs: {
            readFileSync: fs.readFileSync,
            existsSync: fs.existsSync,
            readdirSync: fs.readdirSync
          },
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
  // Add comprehensive debugging
  console.log('🔍 Environment Debug:', {
    isBrowser: isBrowser(),
    VERCEL: process.env.VERCEL,
    VERCEL_URL: process.env.VERCEL_URL,
    AWS_LAMBDA: process.env.AWS_LAMBDA_FUNCTION_NAME,
    NODE_ENV: process.env.NODE_ENV,
    cwd: typeof process !== 'undefined' ? process.cwd() : 'browser'
  });

  const isServerless =
    !isBrowser() &&
    (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  console.log('🔍 Is Serverless:', isServerless);

  if (isBrowser()) {
    // Browser environment - use fetch with relative URLs
    const possibleUrls = [`/${filename}`, `/public/${filename}`];

    console.log('🔍 Trying URLs:', possibleUrls);

    for (const url of possibleUrls) {
      try {
        console.log(`📁 Attempting fetch from: ${url}`);
        const response = await fetch(url);

        console.log(
          '📊 Response status:',
          response.status,
          response.statusText
        );

        if (response.ok) {
          console.log('✅ Successfully fetched file');
          return new Uint8Array(await response.arrayBuffer());
        }

        console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(
          `❌ Fetch error for ${url}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    throw new Error(
      `Failed to fetch ${filename} from any URL: ${possibleUrls.join(', ')}`
    );
  } else if (isServerless) {
    // Serverless environment - try filesystem first (files should be bundled via includeFiles)
    // then fallback to HTTP if needed
    try {
      const { fs, path } = await importNodeModules();
      const serverlessRoot = process.cwd();

      // In Vercel serverless, files should be accessible at the function root
      const possiblePaths = [
        path.join(serverlessRoot, filename),
        path.join(serverlessRoot, 'public', filename),
        path.join(serverlessRoot, '.next', 'server', 'public', filename),
        // Try direct paths that Vercel might use
        `./public/${filename}`,
        `./${filename}`
      ];

      console.log('🔍 Trying serverless filesystem paths:', possiblePaths);

      for (const filePath of possiblePaths) {
        try {
          if (fs.existsSync(filePath)) {
            console.log(`📁 Found file in serverless at: ${filePath}`);
            return fs.readFileSync(filePath);
          } else {
            console.log(`❌ File not found at: ${filePath}`);
          }
        } catch (error) {
          console.log(
            `❌ Error accessing ${filePath}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      // If filesystem fails, try HTTP as fallback
      console.log('� Filesystem failed, trying HTTP fallback...');
      const possibleUrls = [
        `https://${process.env.VERCEL_URL}/${filename}`,
        `https://land-estimator.vercel.app/${filename}`
      ];

      for (const url of possibleUrls) {
        try {
          console.log(`📁 Attempting fetch from: ${url}`);
          const response = await fetch(url);

          console.log(
            '📊 Response status:',
            response.status,
            response.statusText
          );

          if (response.ok) {
            console.log('✅ Successfully fetched file via HTTP');
            return new Uint8Array(await response.arrayBuffer());
          }
        } catch (error) {
          console.log(
            `❌ HTTP fetch error for ${url}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      throw new Error(
        `Failed to load ${filename} in serverless environment. Tried filesystem paths: ${possiblePaths.join(', ')} and URLs: ${possibleUrls.join(', ')}`
      );
    } catch (error) {
      console.log(
        '❌ Serverless loading failed:',
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  } else {
    // Local development - read from filesystem
    const { fs, path } = await importNodeModules();
    const projectRoot = process.cwd();

    const possiblePaths = [
      path.join(projectRoot, 'public', filename),
      path.join(projectRoot, '.next', 'server', 'public', filename),
      path.join(projectRoot, '.next', 'static', filename),
      path.join(projectRoot, filename),
      `./public/${filename}`
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log(`📁 Found file at: ${filePath}`);
        return fs.readFileSync(filePath);
      }
    }

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
