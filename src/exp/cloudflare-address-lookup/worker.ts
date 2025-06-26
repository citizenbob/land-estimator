// worker.ts
// Cloudflare Worker for address lookup using KV storage

interface Env {
  ADDRESS_INDEX: {
    get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  };
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Parse query parameters
    const url = new URL(request.url);
    const prefix = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '5', 10);

    try {
      // Fetch the compressed index from KV
      const raw = await env.ADDRESS_INDEX.get(
        'address-index.json.gz',
        'arrayBuffer'
      );
      if (!raw) {
        return new Response('Address index not found', { status: 404 });
      }

      // For POC: use a simpler approach - assume data is already decompressed for now
      // In production, you'd need proper gzip handling in the worker
      let addresses: Array<{ searchable: string; [key: string]: unknown }>;

      try {
        // Try to parse as if it's already JSON (for testing)
        const text = new TextDecoder().decode(new Uint8Array(raw));
        addresses = JSON.parse(text);
      } catch {
        return new Response(
          'Error: This POC expects uncompressed JSON. Upload uncompressed data or implement gzip decompression.',
          {
            status: 500
          }
        );
      }

      // Filter by prefix and limit results
      const results = addresses
        .filter(
          (addr) =>
            addr.searchable &&
            addr.searchable.toLowerCase().startsWith(prefix.toLowerCase())
        )
        .slice(0, limit);

      return new Response(JSON.stringify(results), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300'
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(`Error: ${message}`, { status: 500 });
    }
  }
};

export default worker;
