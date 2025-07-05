/**
 * Tests for fileSystemLoader - Server-side static file loading
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadStaticFilesFromFileSystem } from '@lib/fileSystemLoader';
import type { StaticAddressManifest, AddressLookupData } from '@app-types';

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn()
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}));

vi.mock('path', () => ({
  default: {
    join: vi.fn()
  },
  join: vi.fn()
}));

import fs from 'fs';
import path from 'path';

const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

describe('fileSystemLoader', () => {
  const mockManifest: StaticAddressManifest = {
    version: 'v20250704-test1234',
    timestamp: '2025-07-04T12:00:00.000Z',
    recordCount: 1000,
    config: {
      tokenize: 'forward',
      cache: 100,
      resolution: 3
    },
    files: [
      'address-v20250704-test1234-lookup.json',
      'address-v20250704-test1234-metadata.json'
    ]
  };

  const mockLookupData: AddressLookupData = {
    parcelIds: ['12345', '67890', '11111'],
    searchStrings: [
      '123 Main St 12345',
      '456 Oak Ave 67890',
      '789 Pine Rd 11111'
    ],
    addressData: {
      '12345': '123 Main St',
      '67890': '456 Oak Ave',
      '11111': '789 Pine Rd'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPath.join.mockImplementation((...segments) => segments.join('/'));

    vi.stubGlobal('process', {
      cwd: () => '/mock/project/root'
    });

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads manifest and lookup data when files exist', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync
      .mockReturnValueOnce(JSON.stringify(mockManifest))
      .mockReturnValueOnce(JSON.stringify(mockLookupData));

    const result = await loadStaticFilesFromFileSystem();

    expect(result).toEqual({
      manifest: mockManifest,
      lookupData: mockLookupData
    });

    expect(mockPath.join).toHaveBeenCalledWith(
      '/mock/project/root',
      'public',
      'search'
    );
    expect(mockPath.join).toHaveBeenCalledWith(
      '/mock/project/root/public/search',
      'latest.json'
    );
    expect(mockPath.join).toHaveBeenCalledWith(
      '/mock/project/root/public/search',
      'address-v20250704-test1234-lookup.json'
    );

    expect(mockFs.existsSync).toHaveBeenCalledTimes(2);
    expect(mockFs.readFileSync).toHaveBeenCalledTimes(2);

    expect(console.log).toHaveBeenCalledWith(
      '📊 Found static address index vv20250704-test1234 with 1000 records (filesystem)'
    );
    expect(console.log).toHaveBeenCalledWith(
      '✅ Static lookup data loaded: 3 addresses (filesystem)'
    );
  });

  it('returns null when manifest file missing', async () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = await loadStaticFilesFromFileSystem();

    expect(result).toBeNull();
    expect(mockFs.existsSync).toHaveBeenCalledWith(
      '/mock/project/root/public/search/latest.json'
    );
    expect(mockFs.readFileSync).not.toHaveBeenCalled();

    expect(console.log).toHaveBeenCalledWith(
      '📭 Static manifest not found on filesystem, will try CDN fallback'
    );
  });

  it('returns null when lookup file missing', async () => {
    mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
    mockFs.readFileSync.mockReturnValueOnce(JSON.stringify(mockManifest));

    const result = await loadStaticFilesFromFileSystem();

    expect(result).toBeNull();
    expect(mockFs.existsSync).toHaveBeenCalledTimes(2);
    expect(mockFs.readFileSync).toHaveBeenCalledTimes(1);

    expect(console.log).toHaveBeenCalledWith(
      '📭 Static lookup file missing on filesystem, will try CDN fallback'
    );
  });

  it('returns null when manifest has no lookup file', async () => {
    const manifestWithoutLookup = {
      ...mockManifest,
      files: ['address-v20250704-test1234-metadata.json']
    };

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValueOnce(
      JSON.stringify(manifestWithoutLookup)
    );

    const result = await loadStaticFilesFromFileSystem();

    expect(result).toBeNull();
    expect(console.log).toHaveBeenCalledWith(
      '📭 Static lookup file not found on filesystem, will try CDN fallback'
    );
  });

  it('handles malformed JSON gracefully', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('{ invalid json }');

    const result = await loadStaticFilesFromFileSystem();

    expect(result).toBeNull();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('⚠️ Filesystem loading failed:')
    );
  });

  it('handles filesystem permission errors', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });

    const result = await loadStaticFilesFromFileSystem();

    expect(result).toBeNull();
    expect(console.log).toHaveBeenCalledWith(
      '⚠️ Filesystem loading failed: Error: EACCES: permission denied'
    );
  });

  it('uses correct file paths (public/search/)', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync
      .mockReturnValueOnce(JSON.stringify(mockManifest))
      .mockReturnValueOnce(JSON.stringify(mockLookupData));

    await loadStaticFilesFromFileSystem();

    expect(mockPath.join).toHaveBeenCalledWith(
      '/mock/project/root',
      'public',
      'search'
    );
    expect(mockPath.join).toHaveBeenCalledWith(
      '/mock/project/root/public/search',
      'latest.json'
    );
    expect(mockPath.join).toHaveBeenCalledWith(
      '/mock/project/root/public/search',
      'address-v20250704-test1234-lookup.json'
    );
  });

  it('parses manifest.files correctly', async () => {
    const manifestWithMultipleFiles = {
      ...mockManifest,
      files: [
        'address-v20250704-test1234-metadata.json',
        'address-v20250704-test1234-lookup.json',
        'other-file.json'
      ]
    };

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync
      .mockReturnValueOnce(JSON.stringify(manifestWithMultipleFiles))
      .mockReturnValueOnce(JSON.stringify(mockLookupData));

    const result = await loadStaticFilesFromFileSystem();

    expect(result).not.toBeNull();
    expect(result?.manifest).toEqual(manifestWithMultipleFiles);

    expect(mockPath.join).toHaveBeenCalledWith(
      '/mock/project/root/public/search',
      'address-v20250704-test1234-lookup.json'
    );
  });

  it('logs appropriate messages for each scenario', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync
      .mockReturnValueOnce(JSON.stringify(mockManifest))
      .mockReturnValueOnce(JSON.stringify(mockLookupData));

    await loadStaticFilesFromFileSystem();

    expect(console.log).toHaveBeenCalledWith(
      '📊 Found static address index vv20250704-test1234 with 1000 records (filesystem)'
    );
    expect(console.log).toHaveBeenCalledWith(
      '✅ Static lookup data loaded: 3 addresses (filesystem)'
    );

    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    mockFs.existsSync.mockImplementation(() => {
      throw new Error('Disk full');
    });

    await loadStaticFilesFromFileSystem();

    expect(console.log).toHaveBeenCalledWith(
      '⚠️ Filesystem loading failed: Error: Disk full'
    );
  });

  it('handles edge case with empty files array', async () => {
    const manifestWithEmptyFiles = {
      ...mockManifest,
      files: []
    };

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValueOnce(
      JSON.stringify(manifestWithEmptyFiles)
    );

    const result = await loadStaticFilesFromFileSystem();

    expect(result).toBeNull();
    expect(console.log).toHaveBeenCalledWith(
      '📭 Static lookup file not found on filesystem, will try CDN fallback'
    );
  });
});
