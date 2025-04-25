import { describe, it, expect, vi } from 'vitest';
import { logEvent } from '@services/logger';
import mixpanel from '@services/mixpanelClient';
import { addDoc } from 'firebase/firestore';

const setupLoggerMocks = () => {
  vi.mock('mixpanel-browser', () => ({
    default: {
      track: vi.fn(() => true)
    }
  }));

  vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(() => ({})),
    addDoc: vi.fn(async () => ({ id: 'mockDocId' }))
  }));

  return {
    mockMixpanelTrack: mixpanel.track as ReturnType<typeof vi.fn>,
    mockAddDoc: addDoc as ReturnType<typeof vi.fn>
  };
};

describe('logEvent', () => {
  const { mockMixpanelTrack, mockAddDoc } = setupLoggerMocks();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs the event name and data to Mixpanel', async () => {
    const testData = { key: 'value' };
    await logEvent({
      eventName: 'Test Event',
      data: testData,
      toMixpanel: true,
      toFirestore: true
    });

    expect(mockMixpanelTrack).toHaveBeenCalledWith('Test Event', testData);
  });

  it('logs the full payload to Firestore', async () => {
    await logEvent({
      eventName: 'Test Event',
      data: { key: 'value' },
      toMixpanel: true,
      toFirestore: true
    });

    expect(mockAddDoc).toHaveBeenCalledWith(expect.any(Object), {
      eventName: 'Test Event',
      data: { key: 'value' },
      timestamp: expect.any(String)
    });
  });

  it('handles Mixpanel logging errors gracefully', async () => {
    mockMixpanelTrack.mockImplementationOnce(() => {
      throw new Error('Mixpanel error');
    });

    await expect(
      logEvent({
        eventName: 'Test Event',
        data: { key: 'value' },
        toMixpanel: true,
        toFirestore: false
      })
    ).resolves.not.toThrow();
  });

  it('handles Firestore logging errors gracefully', async () => {
    mockAddDoc.mockImplementationOnce(() => {
      throw new Error('Firestore error');
    });

    await expect(
      logEvent({
        eventName: 'Test Event',
        data: { key: 'value' },
        toMixpanel: false,
        toFirestore: true
      })
    ).resolves.not.toThrow();
  });

  it('does not log to Mixpanel when toMixpanel is false', async () => {
    await logEvent({
      eventName: 'Test Event',
      data: { key: 'value' },
      toMixpanel: false,
      toFirestore: true
    });

    expect(mockMixpanelTrack).not.toHaveBeenCalled();
  });

  it('does not log to Firestore when toFirestore is false', async () => {
    await logEvent({
      eventName: 'Test Event',
      data: { key: 'value' },
      toMixpanel: true,
      toFirestore: false
    });

    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});
