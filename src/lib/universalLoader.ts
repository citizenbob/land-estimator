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

  if (isBrowser() || isServerless) {
    // Use HTTP fetch for both browser and serverless
    // Files in public/ should be served as static assets by Vercel

    // Add deep debugging for serverless environment
    if (isServerless) {
      console.log('🔍 Deep serverless debugging...');
      try {
        const { fs, path } = await importNodeModules();

        // Check what's actually in the serverless environment
        const checkPaths = [
          '/var/task',
          '/var/runtime',
          '/tmp',
          process.cwd(),
          '.',
          '..'
        ];

        for (const checkPath of checkPaths) {
          try {
            if (fs.existsSync(checkPath)) {
              const contents = fs.readdirSync(checkPath);
              console.log(`📂 ${checkPath}:`, contents);
            } else {
              console.log(`❌ ${checkPath}: does not exist`);
            }
          } catch (error) {
            console.log(
              `❌ Error reading ${checkPath}:`,
              error instanceof Error ? error.message : error
            );
          }
        }

        // Check if we can read the .next directory structure
        try {
          const nextPath = path.join(process.cwd(), '.next');
          if (fs.existsSync(nextPath)) {
            const nextContents = fs.readdirSync(nextPath);
            console.log('📂 .next contents:', nextContents);

            // Check .next/server if it exists
            const serverPath = path.join(nextPath, 'server');
            if (fs.existsSync(serverPath)) {
              const serverContents = fs.readdirSync(serverPath);
              console.log('📂 .next/server contents:', serverContents);
            }

            // Check .next/static if it exists
            const staticPath = path.join(nextPath, 'static');
            if (fs.existsSync(staticPath)) {
              const staticContents = fs.readdirSync(staticPath);
              console.log('📂 .next/static contents:', staticContents);
            }
          }
        } catch (error) {
          console.log(
            '❌ Error exploring .next:',
            error instanceof Error ? error.message : error
          );
        }
      } catch (error) {
        console.log(
          '❌ Error in deep debugging:',
          error instanceof Error ? error.message : error
        );
      }
    }

    const possibleUrls = isServerless
      ? [
          // For serverless, use absolute URLs
          `https://${process.env.VERCEL_URL}/${filename}`,
          // Try without custom domain as fallback
          `https://land-estimator.vercel.app/${filename}`
        ]
      : [
          // For browser, relative URLs work fine
          `/${filename}`
        ];

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
