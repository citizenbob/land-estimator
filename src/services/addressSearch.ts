import IndexClass from 'flexsearch/dist/module/index';
import type { Index as IndexType } from 'flexsearch';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { logEvent } from './logger';
import {
  AddressSearchCacheHit,
  AddressSearchShardLoaded,
  AddressSearchShardLoadError,
  AddressSearchSearchPerformed,
  AddressSearchSearchError
} from '../types/analytics';

interface ShardRecord {
  id: string;
  full_address: string;
  latitude: number;
  longitude: number;
  region: string;
  estimated_landscapable_area: number;
  record_reference: string;
}

interface NominatimResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: { state?: string };
}

const shardCache: Record<string, IndexType<string>> = {};

export async function loadShard(
  type: 'city' | 'county',
  letter: string
): Promise<ShardRecord[]> {
  const key = `${type}-${letter}`;
  if (shardCache[key]) {
    const cacheHitEvent: AddressSearchCacheHit = { shard: key };
    logEvent('cache_hit', cacheHitEvent);
    const filePath = resolve(
      process.cwd(),
      'src/data/flexsearch_shards',
      `${key}.json`
    );
    const shardData: ShardRecord[] = JSON.parse(
      await readFile(filePath, 'utf-8')
    );
    return shardData;
  }

  try {
    const filePath = resolve(
      process.cwd(),
      'src/data/flexsearch_shards',
      `${key}.json`
    );
    const shardData: ShardRecord[] = JSON.parse(
      await readFile(filePath, 'utf-8')
    );

    const index = new IndexClass<string>({
      tokenize: 'strict',
      resolution: 9
    });

    shardData.forEach((record: ShardRecord) => {
      index.add(record.id, record.full_address);
    });

    shardCache[key] = index;
    const shardLoadedEvent: AddressSearchShardLoaded = {
      shard: key,
      recordCount: shardData.length,
      load_time_ms: performance.now() - performance.now()
    };
    logEvent('shard_loaded', shardLoadedEvent);
    return shardData;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorEvent: AddressSearchShardLoadError = {
      shard: key,
      error: errorMessage
    };
    logEvent('shard_load_error', errorEvent);
    console.error(`Error loading shard ${key}:`, error);
    throw new Error(`Failed to load or process shard ${key}.`);
  }
}

export async function searchShard(
  type: 'city' | 'county',
  letter: string,
  query: string
): Promise<ShardRecord[]> {
  try {
    const shard = await loadShard(type, letter);
    const indexInstance = shardCache[`${type}-${letter}`];

    if (!indexInstance) {
      const errorMessage = `Shard index for ${type}-${letter} not loaded or available in cache.`;
      const searchErrorEvent: AddressSearchSearchError = {
        shard: `${type}-${letter}`,
        query,
        error: errorMessage
      };
      logEvent('search_error', searchErrorEvent);
      throw new Error(errorMessage);
    }

    const resultIds = await indexInstance.search(query, {
      limit: 10
    });

    const results = resultIds
      .map((id: string | number) =>
        shard.find((record: ShardRecord) => record.id === String(id))
      )
      .filter((record): record is ShardRecord => record !== undefined);

    if (results.length > 0) {
      const searchPerformedEvent: AddressSearchSearchPerformed = {
        shard: `${type}-${letter}`,
        query,
        resultCount: results.length
      };
      logEvent('search_performed', searchPerformedEvent);

      return results;
    }

    // Fallback to Nominatim if no local results
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json`
    );

    if (!nominatimResponse.ok) {
      throw new Error('Nominatim API request failed');
    }

    const nominatimResults: NominatimResult[] = await nominatimResponse.json();

    const fallbackEvent: AddressSearchSearchPerformed = {
      shard: 'nominatim',
      query,
      resultCount: nominatimResults.length
    };
    logEvent('search_performed', fallbackEvent);

    return nominatimResults.map((result) => ({
      id: result.place_id,
      full_address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      region: result.address?.state || '',
      // Placeholder value, as Nominatim doesn't provide this
      estimated_landscapable_area: 0,
      record_reference: 'nominatim'
    }));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const searchErrorEvent: AddressSearchSearchError = {
      shard: `${type}-${letter}`,
      query,
      error: errorMessage
    };
    logEvent('search_error', searchErrorEvent);
    throw new Error(errorMessage);
  }
}
