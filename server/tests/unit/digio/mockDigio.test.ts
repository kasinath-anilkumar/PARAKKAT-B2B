import { describe, expect, it } from 'vitest';
import { MockDigioClient } from '../../../src/lib/digio/mockDigio';

describe('MockDigioClient', () => {
  it('returns a provider reference tagged with the check type', async () => {
    const client = new MockDigioClient();
    const result = await client.initiateCheck({ applicationId: 'app-1', checkType: 'GST', gstin: '27AABCU9603R1ZM' });
    expect(result.providerRef).toMatch(/^mock-gst-/);
    expect(result.requestPayload).toMatchObject({ checkType: 'GST', hasGstin: true });
  });

  it('does not leak raw sensitive values into the request payload', async () => {
    const client = new MockDigioClient();
    const result = await client.initiateCheck({
      applicationId: 'app-1',
      checkType: 'BANK',
      bankAccount: '000123456789',
    });
    expect(JSON.stringify(result.requestPayload)).not.toContain('000123456789');
    expect(result.requestPayload).toMatchObject({ hasBank: true });
  });
});
