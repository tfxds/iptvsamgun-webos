import { xorEncrypt, xorDecrypt } from './xorCrypto';
import { getDeviceId, getAppType } from './deviceService';

const AUTH_URL = 'https://streamapps.dev/saplayer/api/auth.php';
const WEB_TOKEN = 'saw_147e48d198769d504c42bc1523323c82c043a69d';

export interface DnsOption {
  id: string;
  title: string;
  url: string;
}
export interface ResellerDnsResult {
  success: boolean;
  message?: string;
  resellerId?: string;
  dns: DnsOption[];
}
export interface LoginResult {
  success: boolean;
  message?: string;
  macAddress?: string;
}

export interface PlaylistEntry {
  id: string;
  dnsId: string;
  username: string;
  password: string;
  url: string;
  name: string;
}
export interface AppConfig {
  macRegistered: boolean;
  playlists: PlaylistEntry[];
  imgLogo: string;
  imgBg: string;
  theme: string;
  appName: string;
  message?: string;
}

async function callPanel(payload: Record<string, unknown>): Promise<any> {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Saplayer-Web': WEB_TOKEN },
    body: JSON.stringify({ data: xorEncrypt(JSON.stringify(payload)) }),
  });
  const outer = await res.json();
  if (outer && typeof outer.data === 'string') return JSON.parse(xorDecrypt(outer.data));
  return outer;
}

export async function resellerDns(code: string): Promise<ResellerDnsResult> {
  const d = await callPanel({
    app_device_id: getDeviceId(),
    app_type: getAppType(),
    version: 'reseller_dns',
    id_user: code,
  });
  return {
    success: !!d.success,
    message: d.message,
    resellerId: d.reseller_id,
    dns: Array.isArray(d.dns) ? d.dns : [],
  };
}

export async function login(p: {
  dnsId: string;
  username: string;
  password: string;
  code: string;
}): Promise<LoginResult> {
  const d = await callPanel({
    app_device_id: getDeviceId(),
    app_type: getAppType(),
    version: 'login',
    dns_id: p.dnsId,
    username: p.username,
    password: p.password,
    id_user: p.code,
  });
  return { success: !!d.success, message: d.message, macAddress: d.mac_address };
}

export async function logout(): Promise<void> {
  await callPanel({ app_device_id: getDeviceId(), app_type: getAppType(), version: 'logout' });
}

const PANEL_BASE = AUTH_URL.replace(/api\/auth\.php$/, ''); // https://streamapps.dev/saplayer/

function resolveAsset(p: string): string {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  return PANEL_BASE + p.replace(/^\.?\//, '');
}

// Auto-login + branding: o painel acha a playlist pelo MAC (app_device_id) e devolve
// as creds (urls) + a logo/bg do revendedor. version != login/reseller_dns/logout.
export async function getConfig(): Promise<AppConfig> {
  const d = await callPanel({
    app_device_id: getDeviceId(),
    app_type: getAppType(),
    version: 'config',
  });
  const urls = Array.isArray(d.urls) ? d.urls : [];
  return {
    macRegistered: !!d.mac_registered,
    playlists: urls.map((u: any) => ({
      id: String(u.id ?? ''),
      dnsId: String(u.dns_id ?? ''),
      username: String(u.username ?? ''),
      password: String(u.password ?? ''),
      url: String(u.url ?? ''),
      name: String(u.name ?? ''),
    })),
    imgLogo: resolveAsset(d.img_logo || ''),
    imgBg: resolveAsset(d.img_bg || ''),
    theme: String(d.theme || '1'),
    appName: String(d.app_name || 'S.A Player'),
    message: d.message,
  };
}
