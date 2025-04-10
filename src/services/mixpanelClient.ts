// src/services/mixpanelClient.ts
import mixpanel from 'mixpanel-browser';

try {
  if (process.env.NEXT_PUBLIC_MIXPANEL) {
    mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL, {
      debug: process.env.NODE_ENV === 'development'
    });
    mixpanel.register({
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development'
    });
  } else {
    console.warn(
      'Mixpanel token is not set. Please add NEXT_PUBLIC_MIXPANEL to your .env.local file.'
    );
  }
} catch (error) {
  console.error('Mixpanel initialization failed:', error);
}

export default mixpanel;
