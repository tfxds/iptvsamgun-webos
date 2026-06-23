const STORAGE_KEY = 'sa_device_id';

export function getAppType(): string {
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
  if (ua.includes('web0s') || ua.includes('webos')) return 'webos';
  if (ua.includes('tizen')) return 'tizen';
  return 'web';
}

function readNativeDeviceId(): string {
  try {
    // Tizen: DUID do aparelho
    // @ts-expect-error API nativa Tizen presente só no aparelho
    if (typeof webapis !== 'undefined' && webapis.productinfo && webapis.productinfo.getDuid) {
      // @ts-expect-error idem
      const duid = webapis.productinfo.getDuid();
      if (duid) return 'tz_' + duid;
    }
  } catch {
    /* fora do aparelho */
  }
  return '';
}

function generateUuid(): string {
  return (
    'web_' +
    'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
  );
}

export function getDeviceId(): string {
  let id = '';
  try {
    id = localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    /* noop */
  }
  if (id) return id;
  id = readNativeDeviceId() || generateUuid();
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* noop */
  }
  return id;
}
