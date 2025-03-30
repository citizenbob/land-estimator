// src/services/mixpanelClient.ts
import mixpanel from 'mixpanel-browser';

try {
  if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN, {
      debug: process.env.NODE_ENV === 'development'
    });
  } else {
    console.warn(
      'Mixpanel token is not set. Please add NEXT_PUBLIC_MIXPANEL_TOKEN to your .env.local file.'
    );
  }
} catch (error) {
  console.error('Mixpanel initialization failed:', error);
}

export default mixpanel;
