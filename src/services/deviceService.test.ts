import { describe, it, expect, beforeEach } from 'vitest';
import { getDeviceId } from './deviceService';

describe('deviceService', () => {
  beforeEach(() => localStorage.clear());

  it('generates an id and caches it (estável entre chamadas)', () => {
    const a = getDeviceId();
    const b = getDeviceId();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(localStorage.getItem('sa_device_id')).toBe(a);
  });

  it('reuses an existing cached id', () => {
    localStorage.setItem('sa_device_id', 'fixed-123');
    expect(getDeviceId()).toBe('fixed-123');
  });
});
