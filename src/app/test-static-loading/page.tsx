'use client';

import { useState, useEffect } from 'react';
import {
  loadAddressIndex,
  clearAddressIndexCache
} from '@services/loadAddressIndex';

export default function TestStaticLoadingPage() {
  const [loadingStatus, setLoadingStatus] = useState<string>('Not started');
  const [addressCount, setAddressCount] = useState<number>(0);
  const [loadTime, setLoadTime] = useState<number>(0);
  const [networkLogs, setNetworkLogs] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);

  // Monitor network requests
  useEffect(() => {
    const originalFetch = window.fetch;
    const logs: string[] = [];

    window.fetch = async (...args) => {
      const url = args[0]?.toString() || 'unknown';
      const timestamp = new Date().toLocaleTimeString();

      if (
        url.includes('/search/') ||
        url.includes('address') ||
        url.includes('flexsearch')
      ) {
        logs.push(`[${timestamp}] 🌐 Fetching: ${url}`);
        setNetworkLogs([...logs]);
      }

      return originalFetch(...args);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const testStaticLoading = async () => {
    try {
      setLoadingStatus('🔄 Loading...');
      setNetworkLogs([]);
      clearAddressIndexCache();

      const startTime = performance.now();
      const result = await loadAddressIndex();
      const endTime = performance.now();

      setLoadTime(endTime - startTime);
      setAddressCount(result.parcelIds.length);
      setLoadingStatus('✅ Success!');

      // Test some searches
      const testQueries = ['Gateway', 'Arch', 'Main St'];
      const results: string[] = [];

      for (const query of testQueries) {
        const searchResults = result.index.search(query, { limit: 3 });
        const addresses = Array.isArray(searchResults)
          ? searchResults
              .map((idx) => result.addressData[result.parcelIds[idx as number]])
              .filter(Boolean)
          : [];
        results.push(`"${query}": ${addresses.length} results`);
        if (addresses.length > 0) {
          results.push(`  → ${addresses[0]}`);
        }
      }

      setSearchResults(results);
    } catch (error) {
      setLoadingStatus(`❌ Error: ${error}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Static File Loading Test</h1>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={testStaticLoading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Address Index Loading
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>📊 Loading Status</h3>
        <p>
          <strong>Status:</strong> {loadingStatus}
        </p>
        <p>
          <strong>Load Time:</strong> {loadTime.toFixed(2)}ms
        </p>
        <p>
          <strong>Address Count:</strong> {addressCount.toLocaleString()}
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>🌐 Network Requests</h3>
        <div
          style={{
            backgroundColor: '#f5f5f5',
            padding: '10px',
            borderRadius: '5px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {networkLogs.length === 0 ? (
            <p>No requests captured yet...</p>
          ) : (
            networkLogs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  color: log.includes('/search/') ? '#00aa00' : '#0070f3',
                  marginBottom: '5px'
                }}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>🔍 Search Test Results</h3>
        <div
          style={{
            backgroundColor: '#f0f8ff',
            padding: '10px',
            borderRadius: '5px'
          }}
        >
          {searchResults.length === 0 ? (
            <p>Run the test to see search results...</p>
          ) : (
            searchResults.map((result, idx) => (
              <div key={idx} style={{ marginBottom: '3px' }}>
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3>🎯 What to Look For</h3>
        <ul>
          <li>
            ✅ <strong>Static loading:</strong> Requests to{' '}
            <code>/search/latest.json</code> and{' '}
            <code>/search/address-*.json</code>
          </li>
          <li>
            ❌ <strong>CDN fallback:</strong> Requests to external domains or
            versioned bundle URLs
          </li>
          <li>
            ⚡ <strong>Fast loading:</strong> Should be under 1000ms for static
            files
          </li>
          <li>
            📊 <strong>Real data:</strong> Should show ~535,000 addresses
          </li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>
          💡 <strong>Tip:</strong> Open browser DevTools → Network tab before
          clicking the test button to see all requests
        </p>
      </div>
    </div>
  );
}
