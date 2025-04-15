import { describe, it, expect, vi } from 'vitest';
import { logEvent } from '@services/logger';
import mixpanel from '@services/mixpanelClient';
import { addDoc } from 'firebase/firestore';

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

describe('logEvent', () => {
  const mockMixpanelTrack = mixpanel.track as ReturnType<typeof vi.fn>;
  const mockAddDoc = addDoc as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs only the event name to Mixpanel', async () => {
    await logEvent({
      eventName: 'Test Event',
      data: { key: 'value' },
      toMixpanel: true,
      toFirestore: true
    });

    expect(mockMixpanelTrack).toHaveBeenCalledWith('Test Event');
    expect(mockMixpanelTrack).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: 'value' })
    );
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
        toFirestore: true
      })
    ).resolves.not.toThrow();

    expect(mockMixpanelTrack).toHaveBeenCalled();
  });

  it('handles Firestore logging errors gracefully', async () => {
    mockAddDoc.mockImplementationOnce(() => {
      throw new Error('Firestore error');
    });

    await expect(
      logEvent({
        eventName: 'Test Event',
        data: { key: 'value' },
        toMixpanel: true,
        toFirestore: true
      })
    ).resolves.not.toThrow();

    expect(mockAddDoc).toHaveBeenCalled();
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
