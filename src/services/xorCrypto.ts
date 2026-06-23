const KEY_HEX = '4A7B9CE32FA568D13B76C912EF458A1DB4592CF7639E3154A87DC2164E9328BF';
const KEY = Uint8Array.from(KEY_HEX.match(/.{2}/g)!.map((h) => parseInt(h, 16)));

function xorBytes(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ KEY[i % KEY.length];
  return out;
}

export function xorEncrypt(plain: string): string {
  const x = xorBytes(new TextEncoder().encode(plain));
  let bin = '';
  for (let i = 0; i < x.length; i++) bin += String.fromCharCode(x[i]);
  return btoa(bin);
}

export function xorDecrypt(b64: string): string {
  const bin = atob(b64);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(xorBytes(data));
}
