import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadShard, searchShard } from './addressSearch';
import { logEvent } from './logger';

const shardCache: { [key: string]: unknown } = {};

vi.mock('./logger', () => ({
  logEvent: vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(shardCache).forEach((key) => delete shardCache[key]);
});

vi.mock('path', () => ({
  resolve: (...args: string[]) => {
    // Simple mock that just joins the path segments
    return args.join('/').replace(/\/+/g, '/');
  }
}));

vi.mock('fs/promises', () => {
  const readFile = vi.fn(async (path) => {
    if (path.includes('city-C.json')) {
      return JSON.stringify([
        {
          id: 'city-123',
          full_address: '123 MAIN ST, SAINT LOUIS, MO',
          latitude: 38.123456,
          longitude: -90.123456,
          region: 'St. Louis City',
          estimated_landscapable_area: 5000,
          record_reference: 'city/city-123'
        }
      ]);
    }
    if (path.includes('city-Z.json')) {
      throw new Error('File not found');
    }
    throw new Error('Unexpected file path');
  });

  return {
    readFile,
    default: { readFile }
  };
});

describe('addressSearch with logging', () => {
  it('loads and indexes the correct shard based on query', async () => {
    const shard = await loadShard('city', 'C');
    expect(shard).toEqual([
      {
        id: 'city-123',
        full_address: '123 MAIN ST, SAINT LOUIS, MO',
        latitude: 38.123456,
        longitude: -90.123456,
        region: 'St. Louis City',
        estimated_landscapable_area: 5000,
        record_reference: 'city/city-123'
      }
    ]);
  });

  it('returns FlexSearch matches for known addresses', async () => {
    const results = await searchShard('city', 'C', '123 MAIN');
    expect(results).toHaveLength(1);
    expect(results[0].full_address).toBe('123 MAIN ST, SAINT LOUIS, MO');
  });

  it('handles missing or invalid shards gracefully', async () => {
    await expect(loadShard('city', 'Z')).rejects.toThrow(
      'Failed to load or process shard city-Z.'
    );
  });

  it('logs cache hits when shard is already loaded', async () => {
    await loadShard('city', 'C');
    vi.clearAllMocks();

    await loadShard('city', 'C');
    expect(logEvent).toHaveBeenCalledWith('cache_hit', { shard: 'city-C' });
  });

  it('logs shard loading events', async () => {
    vi.resetModules();
    vi.mock('./logger', () => ({
      logEvent: vi.fn()
    }));

    const { loadShard } = await import('./addressSearch');
    const { logEvent } = await import('./logger');

    await loadShard('city', 'C');
    expect(logEvent).toHaveBeenCalledWith(
      'shard_loaded',
      expect.objectContaining({
        shard: 'city-C',
        recordCount: 1
      })
    );
  });

  it('logs errors during shard loading', async () => {
    await expect(loadShard('city', 'Z')).rejects.toThrow(
      'Failed to load or process shard city-Z.'
    );
    expect(logEvent).toHaveBeenCalledWith('shard_load_error', {
      shard: 'city-Z',
      error: 'File not found'
    });
  });

  it('logs search performance', async () => {
    await searchShard('city', 'C', '123 MAIN');
    expect(logEvent).toHaveBeenCalledWith('search_performed', {
      shard: 'city-C',
      query: '123 MAIN',
      resultCount: 1
    });
  });

  it('logs errors during search', async () => {
    await expect(searchShard('city', 'Z', '123 MAIN')).rejects.toThrow(
      'Failed to load or process shard city-Z.'
    );
    expect(logEvent).toHaveBeenCalledWith('shard_load_error', {
      shard: 'city-Z',
      error: 'File not found'
    });
  });
});
