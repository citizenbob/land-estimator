import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { createTestRequest } from '@lib/testUtils';
import { createTestSuite } from '@lib/testUtils';

const mockAdd = vi.fn();

vi.mock('@config/firebaseAdmin', () => ({
  firestoreAdmin: {
    collection: () => ({ add: mockAdd })
  }
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP'
  }
}));

describe('/api/log POST handler', () => {
  const testSuite = createTestSuite();

  beforeEach(() => {
    testSuite.beforeEachSetup();
  });

  afterEach(() => {
    testSuite.afterEachCleanup();
  });

  it('should write event and return success', async () => {
    const payload = { eventName: 'test_event', data: { foo: 'bar' } };
    const req = createTestRequest(payload);
    const resp = await POST(req);

    expect(mockAdd).toHaveBeenCalledWith({
      eventName: payload.eventName,
      data: payload.data,
      timestamp: 'SERVER_TIMESTAMP'
    });

    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body).toEqual({ success: true });
  });

  it('should catch errors and return 500', async () => {
    mockAdd.mockRejectedValueOnce(new Error('fail'));
    const payload = { eventName: 'e', data: { x: 1 } };
    const req = createTestRequest(payload);
    const resp = await POST(req);

    const body = await resp.json();
    expect(resp.status).toBe(500);
    expect(body).toHaveProperty('error', 'fail');
  });
});
