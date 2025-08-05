export interface FlexSearchConfig {
  tokenize: 'strict' | 'forward' | 'reverse' | 'full';
  cache: number;
  resolution: number;
  threshold: number;
  depth: number;
  bidirectional: boolean;
  suggest: boolean;
}

export interface FlexSearchOptions {
  bool: 'and' | 'or';
  limit: number;
  offset?: number;
}

export interface SearchConfig {
  defaultLimit: number;
  maxLimit: number;
  indexConfig: FlexSearchConfig;
  searchOptions: FlexSearchOptions;
}

export interface ServiceConfig {
  value: 'design' | 'installation' | 'maintenance';
  label: string;
}

export interface LandscapeEstimatorConfig {
  defaultServices: Array<'design' | 'installation'>;
  serviceOptions: readonly ServiceConfig[];
  pricingConfig: {
    minimumServiceFee: number;
    baseRateRange: {
      min: number;
      max: number;
    };
    commercialMultiplier: number;
  };
}

export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket?: string;
}

export interface MixpanelConfig {
  token: string;
  debug: boolean;
  environment: 'development' | 'production' | 'test';
}

export interface ApiConfig {
  endpoints: {
    log: string;
    parcelMetadata: string;
  };
  timeouts: {
    default: number;
    search: number;
    metadata: number;
  };
  retries: {
    default: number;
    network: number;
  };
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  outputs: Array<'console' | 'mixpanel' | 'firestore'>;
  enableDevLogs: boolean;
}

export interface CacheConfig {
  addressIndex: {
    enabled: boolean;
    maxAge: number;
  };
  parcelMetadata: {
    enabled: boolean;
    maxAge: number;
    maxSize: number;
  };
}

export interface GeographicConfig {
  defaultRegion: 'stl_city' | 'stl_county';
  supportedRegions: readonly string[];
  coordinatePrecision: number;
  boundingBoxDefaults: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

export interface PerformanceConfig {
  enableProgressiveLoading: boolean;
  chunkSize: number;
  backgroundPreload: boolean;
  compressionEnabled: boolean;
  debounceTime: {
    search: number;
    input: number;
  };
}

export interface SecurityConfig {
  enableCors: boolean;
  allowedOrigins: string[];
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    windowMs: number;
  };
}

export interface UIConfig {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    errorColor: string;
    successColor: string;
  };
  animation: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  accessibility: {
    highContrast: boolean;
    screenReaderSupport: boolean;
    keyboardNavigation: boolean;
  };
}

export interface TestConfig {
  mocks: {
    enableNetworkMocks: boolean;
    mockMixpanel: boolean;
    mockFirebase: boolean;
  };
  fixtures: {
    defaultParcelData: string;
    defaultAddressData: string;
  };
  timeouts: {
    unitTest: number;
    integrationTest: number;
    e2eTest: number;
  };
}

export interface AppConfig {
  environment: 'development' | 'production' | 'test';
  version: string;
  buildId?: string;
  search: SearchConfig;
  landscape: LandscapeEstimatorConfig;
  firebase: FirebaseConfig;
  mixpanel: MixpanelConfig;
  api: ApiConfig;
  logging: LoggingConfig;
  cache: CacheConfig;
  geographic: GeographicConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  ui: UIConfig;
  test?: TestConfig;
}

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_MIXPANEL?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  FIREBASE_STORAGE_BUCKET?: string;
  BLOB_READ_WRITE_TOKEN?: string;
  VERCEL_ENV?: string;
  ENABLE_LOGGING?: string;
}

export interface RuntimeConfig {
  isServer: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  enableDevLogs: boolean;
}

export interface FeatureFlags {
  enableProgressiveSearch: boolean;
  enableBackgroundPreload: boolean;
  enableAdvancedAnalytics: boolean;
  enableExperimentalFeatures: boolean;
  enablePerformanceMonitoring: boolean;
}
