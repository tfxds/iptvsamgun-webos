import { describe, it, expect } from 'vitest';
import { xorEncrypt, xorDecrypt } from './xorCrypto';

describe('xorCrypto', () => {
  it('matches the server (PHP/Python) for a known vector', () => {
    expect(xorEncrypt('{"v":"hello"}')).toBe('MVnqwRWHALRXGqYwkg==');
  });

  it('round-trips arbitrary JSON (incl. acentos)', () => {
    const s = JSON.stringify({
      id_user: 'JBPOWER',
      version: 'reseller_dns',
      msg: 'Revendedor não encontrado',
      n: 12345,
    });
    expect(xorDecrypt(xorEncrypt(s))).toBe(s);
  });
});
