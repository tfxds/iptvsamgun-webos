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
