declare module 'flexsearch' {
  namespace FlexSearch {
    interface IndexOptions {
      tokenize?: string;
      cache?: number | boolean;
      resolution?: number;
      preset?: string;
      optimize?: boolean;
      fastupdate?: boolean;
    }

    interface DocumentOptions<T> {
      tokenize?: string;
      cache?: number | boolean;
      resolution?: number;
      preset?: string;
      optimize?: boolean;
      fastupdate?: boolean;
      document: {
        id: keyof T;
        index: (keyof T)[];
      };
    }

    interface SearchResult<T> {
      field: string;
      result: T[];
    }

    interface ExportData {
      [key: string]: unknown;
    }

    type ExportHandler = (key: string, data: ExportData) => ExportData;

    class Index {
      constructor(options?: IndexOptions);
      add(id: number | string, text: string): this;
      search(
        query: string,
        options?: { bool?: 'and' | 'or'; limit?: number }
      ): number[];
      remove(id: number | string): this;
      update(id: number | string, text: string): this;
      export(): string | object;
      import(data: string | object): this;
    }

    class Document<T> {
      constructor(options: DocumentOptions<T>);
      add(document: T): this;
      search(
        query: string,
        options?: {
          limit?: number;
          enrich?: boolean;
          bool?: 'and' | 'or';
        }
      ): SearchResult<T>[] | number[];
      remove(id: number | string): this;
      update(document: T): this;
      export(handler?: ExportHandler): ExportData;
      import(data: ExportData): this;
    }

    interface PrecomputedIndexData {
      parcelIds: string[];
      searchStrings: string[];
      timestamp: string;
      recordCount: number;
      version: string;
      exportMethod: string;
    }

    interface FlexSearchIndexBundle {
      index: Index;
      parcelIds: string[];
      addressData: Record<string, string>;
    }

    interface StaticAddressManifest {
      version: string;
      timestamp: string;
      recordCount: number;
      config: {
        tokenize: string;
        cache: number;
        resolution: number;
      };
      files: string[];
    }

    interface AddressLookupData {
      parcelIds: string[];
      searchStrings: string[];
      addressData: Record<string, string>;
    }

    interface AddressDocument {
      id: number;
      searchText: string;
    }
  }

  export = FlexSearch;
}
