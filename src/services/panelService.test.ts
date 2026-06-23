import { describe, it, expect, vi, beforeEach } from 'vitest';
import { xorEncrypt } from './xorCrypto';
import * as device from './deviceService';
import { resellerDns, login } from './panelService';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(device, 'getDeviceId').mockReturnValue('dev-1');
  vi.spyOn(device, 'getAppType').mockReturnValue('tizen');
});

function mockFetchReturning(obj: unknown) {
  const fn = vi
    .fn()
    .mockResolvedValue({ json: async () => ({ data: xorEncrypt(JSON.stringify(obj)) }) });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('panelService', () => {
  it('resellerDns: envia envelope cifrado + header web token, parseia DNS', async () => {
    const fn = mockFetchReturning({
      success: true,
      reseller_id: '68',
      dns: [{ id: '1', title: 'Jb', url: 'http://x' }],
    });
    const r = await resellerDns('JBPOWER');
    expect(r.success).toBe(true);
    expect(r.dns).toEqual([{ id: '1', title: 'Jb', url: 'http://x' }]);
    const init = fn.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string).data).toBeTypeOf('string');
    expect((init.headers as Record<string, string>)['X-Saplayer-Web']).toBe(
      'saw_147e48d198769d504c42bc1523323c82c043a69d',
    );
  });

  it('login: mapeia success e message', async () => {
    mockFetchReturning({ success: false, message: 'Revendedor expirado' });
    const r = await login({ dnsId: '1', username: 'u', password: 'p', code: 'JBPOWER' });
    expect(r.success).toBe(false);
    expect(r.message).toBe('Revendedor expirado');
  });
});
