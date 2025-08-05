import mixpanel from 'mixpanel-browser';
import { logError } from '@lib/errorUtils';
import { MixpanelConfig } from '@app-types/configTypes';

function getMixpanelConfig(): MixpanelConfig | null {
  const token = process.env.NEXT_PUBLIC_MIXPANEL;
  if (!token) {
    return null;
  }

  return {
    token,
    debug: process.env.NODE_ENV === 'development',
    environment:
      (process.env.VERCEL_ENV as 'development' | 'production' | 'test') ??
      (process.env.NODE_ENV as 'development' | 'production' | 'test') ??
      'development'
  };
}

try {
  const config = getMixpanelConfig();

  if (config) {
    mixpanel.init(config.token, {
      debug: config.debug
    });
    mixpanel.register({
      env: config.environment
    });
  } else {
    console.warn(
      'Mixpanel token is not set. Please add NEXT_PUBLIC_MIXPANEL to your .env.local file.'
    );
  }
} catch (error) {
  logError(error, {
    operation: 'mixpanel_init'
  });
}

export default mixpanel;
