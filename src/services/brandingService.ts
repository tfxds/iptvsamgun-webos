// Branding do revendedor (logo/bg) — persistido p/ reabrir o app ja mostrar a logo.
const KEY = 'sa_branding';

export interface Branding {
  imgLogo: string;
  imgBg: string;
}

export function getBranding(): Branding {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Branding;
  } catch {
    /* noop */
  }
  return { imgLogo: '', imgBg: '' };
}

export function setBranding(b: Branding): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* noop */
  }
}
