# S.A Player — Fase 1 (Login) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrandar o NeoStream-TV pra S.A Player e fazer o login por código de revendedor (2 passos) validado no painel streamapps.dev, chegando autenticado no app com conteúdo real do revendedor.

**Architecture:** Abordagem A (camada adaptadora). Novos serviços (`xorCrypto`, `deviceService`, `panelService`) fazem o login pelo painel; no sucesso entregam `{dnsUrl, user, senha}` pro motor Xtream que o NeoStream já tem (`api.authenticate`). Player/catálogo/navegação não mudam. O painel ganha um caminho aditivo pro app web (header `X-Saplayer-Web` + CORS), sem tocar no fluxo Roku/Android.

**Tech Stack:** React 19 + Vite + TypeScript (app); Vitest + jsdom (testes); PHP/SQLite (painel, via FTP).

**Diretório do app:** `/root/NeoStream-TV` (renomeado pra `saplayer` no fim — Task 8). Todos os caminhos abaixo são relativos a essa pasta salvo indicação.

**Segredos fixos:**
- XOR key (hex): `4A7B9CE32FA568D13B76C912EF458A1DB4592CF7639E3154A87DC2164E9328BF`
- Web token (header `X-Saplayer-Web`): `saw_147e48d198769d504c42bc1523323c82c043a69d`
- Endpoint painel: `https://streamapps.dev/saplayer/api/auth.php`
- FTP painel: `ftp.playtectv.xyz` user `thiago.ferreira@streamapps.dev` senha `P@ssw0rd375225` pasta `saplayer/`

---

### Task 1: Painel — liberar app web no auth.php (header + CORS), sem quebrar Roku/Android

**Files:**
- Modify (LIVE via FTP): `saplayer/api/auth.php` (baixar → editar local em `/tmp/auth_edit.php` → backup → subir)

- [ ] **Step 1: Baixar o auth.php live + backup**

```bash
CRED="thiago.ferreira@streamapps.dev:P@ssw0rd375225"; FTP="ftp.playtectv.xyz"
curl -s -u "$CRED" "ftp://$FTP/saplayer/api/auth.php" -o /tmp/auth_edit.php
curl -s -u "$CRED" -T /tmp/auth_edit.php "ftp://$FTP/saplayer/api/auth.php.bak-webapp-20260622"
php -l /tmp/auth_edit.php
```
Expected: `No syntax errors detected` e backup OK.

- [ ] **Step 2: Editar `is_valid_request()` pra aceitar o token web (aditivo)**

Trocar a função (em `/tmp/auth_edit.php`):
```php
function is_valid_request(): bool
{
	$ua  = $_SERVER['HTTP_USER_AGENT'] ?? '';
	$web = $_SERVER['HTTP_X_SAPLAYER_WEB'] ?? '';
	return $_SERVER['REQUEST_METHOD'] === 'POST'
		&& ($ua === 'smart-tv' || $web === 'saw_147e48d198769d504c42bc1523323c82c043a69d');
}
```

- [ ] **Step 3: Inserir CORS + tratamento de OPTIONS ANTES do `if (!is_valid_request())`**

Logo acima da linha `if (!is_valid_request()) {`:
```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Saplayer-Web');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
	http_response_code(204);
	exit;
}
```

- [ ] **Step 4: Validar sintaxe e subir**

```bash
php -l /tmp/auth_edit.php
curl -s -u "$CRED" -T /tmp/auth_edit.php "ftp://$FTP/saplayer/api/auth.php"
```
Expected: `No syntax errors detected`.

- [ ] **Step 5: Verificar que Roku/Android NÃO quebrou (caminho UA smart-tv) + app web funciona (header)**

```bash
# caminho nativo (UA smart-tv) — TEM que continuar achando o revendedor
curl -s -X POST "https://streamapps.dev/saplayer/api/auth.php" -H "User-Agent: smart-tv" -H "Content-Type: application/json" \
  -d "$(python3 -c "import json,base64; K=bytes.fromhex('4A7B9CE32FA568D13B76C912EF458A1DB4592CF7639E3154A87DC2164E9328BF'); p=json.dumps({'app_device_id':'t','app_type':'tizen','version':'reseller_dns','id_user':'JBPOWER'}).encode(); x=bytes(p[i]^K[i%len(K)] for i in range(len(p))); print(json.dumps({'data':base64.b64encode(x).decode()}))")" | head -c 200
echo
# caminho web (sem UA smart-tv, COM header X-Saplayer-Web) — TEM que funcionar igual
curl -s -X POST "https://streamapps.dev/saplayer/api/auth.php" -H "X-Saplayer-Web: saw_147e48d198769d504c42bc1523323c82c043a69d" -H "Content-Type: application/json" \
  -d "$(python3 -c "import json,base64; K=bytes.fromhex('4A7B9CE32FA568D13B76C912EF458A1DB4592CF7639E3154A87DC2164E9328BF'); p=json.dumps({'app_device_id':'t','app_type':'tizen','version':'reseller_dns','id_user':'JBPOWER'}).encode(); x=bytes(p[i]^K[i%len(K)] for i in range(len(p))); print(json.dumps({'data':base64.b64encode(x).decode()}))")" | head -c 200
echo
# sem nada — TEM que ser rejeitado (404/redirect)
curl -s -o /dev/null -w "sem auth -> HTTP %{http_code}\n" -X POST "https://streamapps.dev/saplayer/api/auth.php" -d "{}"
```
Expected: os 2 primeiros retornam `{"data":"..."}` (decodificável = success); o terceiro NÃO retorna dado válido (redirect 302 pra 404.html).

---

### Task 2: App — setup de testes (Vitest + jsdom) e limpeza do devMock

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Delete: `src/devMock.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Instalar vitest + jsdom**

```bash
cd /root/NeoStream-TV
npm install -D vitest@^2 jsdom@^25
```
Expected: instala sem erro.

- [ ] **Step 2: Adicionar scripts de teste no package.json**

Em `package.json` `"scripts"`, adicionar:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Criar vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 4: Remover o devMock (mock de conteúdo da demo)**

```bash
rm -f src/devMock.ts
```
Em `src/main.tsx`, remover a linha:
```ts
import './devMock'
```

- [ ] **Step 5: Verificar build ainda compila**

```bash
npm run build
```
Expected: build sem erro (sem referência ao devMock).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: add vitest, remove demo devMock"
```

---

### Task 3: xorCrypto (TDD) — cripto compatível com o auth.php

**Files:**
- Create: `src/services/xorCrypto.ts`
- Test: `src/services/xorCrypto.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`src/services/xorCrypto.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { xorEncrypt, xorDecrypt } from './xorCrypto';

describe('xorCrypto', () => {
  it('matches the server (PHP/Python) for a known vector', () => {
    expect(xorEncrypt('{"v":"hello"}')).toBe('MVnqwRWHALRXGqYwkg==');
  });

  it('round-trips arbitrary JSON (incl. acentos)', () => {
    const s = JSON.stringify({ id_user: 'JBPOWER', version: 'reseller_dns', msg: 'Revendedor não encontrado', n: 12345 });
    expect(xorDecrypt(xorEncrypt(s))).toBe(s);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm test -- xorCrypto
```
Expected: FAIL ("xorEncrypt is not a function" / módulo não existe).

- [ ] **Step 3: Implementar**

`src/services/xorCrypto.ts`:
```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npm test -- xorCrypto
```
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/services/xorCrypto.ts src/services/xorCrypto.test.ts && git commit -m "feat: xor crypto compatible with panel auth.php"
```

---

### Task 4: deviceService (TDD) — app_device_id fixo por TV + app_type

**Files:**
- Create: `src/services/deviceService.ts`
- Test: `src/services/deviceService.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`src/services/deviceService.test.ts`:
```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm test -- deviceService
```
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

`src/services/deviceService.ts`:
```ts
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
  return 'web_' + 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  let id = '';
  try { id = localStorage.getItem(STORAGE_KEY) || ''; } catch { /* noop */ }
  if (id) return id;
  id = readNativeDeviceId() || generateUuid();
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* noop */ }
  return id;
}
```
**Nota:** no webOS o id nativo (luna-service) é assíncrono; v1 usa UUID cacheado (estável por instalação). Wire do id luna fica pra Fase 2. No Tizen usa o DUID real.

- [ ] **Step 4: Rodar e ver passar**

```bash
npm test -- deviceService
```
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/services/deviceService.ts src/services/deviceService.test.ts && git commit -m "feat: stable per-TV device id + app_type detection"
```

---

### Task 5: panelService (TDD) — reseller_dns / login / logout

**Files:**
- Create: `src/services/panelService.ts`
- Test: `src/services/panelService.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`src/services/panelService.test.ts`:
```ts
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
  const fn = vi.fn().mockResolvedValue({ json: async () => ({ data: xorEncrypt(JSON.stringify(obj)) }) });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('panelService', () => {
  it('resellerDns: envia envelope cifrado + header web token, parseia DNS', async () => {
    const fn = mockFetchReturning({ success: true, reseller_id: '68', dns: [{ id: '1', title: 'Jb', url: 'http://x' }] });
    const r = await resellerDns('JBPOWER');
    expect(r.success).toBe(true);
    expect(r.dns).toEqual([{ id: '1', title: 'Jb', url: 'http://x' }]);
    const [, init] = fn.mock.calls[0];
    expect(JSON.parse((init as any).body).data).toBeTypeOf('string');
    expect((init as any).headers['X-Saplayer-Web']).toBe('saw_147e48d198769d504c42bc1523323c82c043a69d');
  });

  it('login: mapeia success e message', async () => {
    mockFetchReturning({ success: false, message: 'Revendedor expirado' });
    const r = await login({ dnsId: '1', username: 'u', password: 'p', code: 'JBPOWER' });
    expect(r.success).toBe(false);
    expect(r.message).toBe('Revendedor expirado');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm test -- panelService
```
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

`src/services/panelService.ts`:
```ts
import { xorEncrypt, xorDecrypt } from './xorCrypto';
import { getDeviceId, getAppType } from './deviceService';

const AUTH_URL = 'https://streamapps.dev/saplayer/api/auth.php';
const WEB_TOKEN = 'saw_147e48d198769d504c42bc1523323c82c043a69d';

export interface DnsOption { id: string; title: string; url: string; }
export interface ResellerDnsResult { success: boolean; message?: string; resellerId?: string; dns: DnsOption[]; }
export interface LoginResult { success: boolean; message?: string; macAddress?: string; }

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
  const d = await callPanel({ app_device_id: getDeviceId(), app_type: getAppType(), version: 'reseller_dns', id_user: code });
  return { success: !!d.success, message: d.message, resellerId: d.reseller_id, dns: Array.isArray(d.dns) ? d.dns : [] };
}

export async function login(p: { dnsId: string; username: string; password: string; code: string }): Promise<LoginResult> {
  const d = await callPanel({
    app_device_id: getDeviceId(), app_type: getAppType(), version: 'login',
    dns_id: p.dnsId, username: p.username, password: p.password, id_user: p.code,
  });
  return { success: !!d.success, message: d.message, macAddress: d.mac_address };
}

export async function logout(): Promise<void> {
  await callPanel({ app_device_id: getDeviceId(), app_type: getAppType(), version: 'logout' });
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npm test -- panelService
```
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/services/panelService.ts src/services/panelService.test.ts && git commit -m "feat: panelService (reseller_dns/login/logout) via web token"
```

---

### Task 6: Tema sky/dark (paleta webstreamapps)

**Files:**
- Create: `src/theme.css`
- Modify: `src/main.tsx` (import do css)

- [ ] **Step 1: Criar o theme.css**

`src/theme.css`:
```css
:root {
  --sa-bg: #060912;
  --sa-bg2: #0a0f1c;
  --sa-accent: #0ea5e9;
  --sa-accent2: #38bdf8;
  --sa-grad: linear-gradient(135deg, #0ea5e9, #38bdf8);
  --sa-text: #f1f5f9;
  --sa-muted: #94a3b8;
  --sa-card: rgba(255, 255, 255, 0.04);
  --sa-border: rgba(255, 255, 255, 0.10);
}
html, body, #root { background-color: var(--sa-bg); color: var(--sa-text); }
```

- [ ] **Step 2: Importar no main.tsx (depois do index.css)**

Em `src/main.tsx`, após `import './index.css'`:
```ts
import './theme.css'
```

- [ ] **Step 3: Verificar build + commit**

```bash
npm run build && git add src/theme.css src/main.tsx && git commit -m "feat: sky/dark theme vars (S.A Player palette)"
```
Expected: build OK.

---

### Task 7: Login.tsx — fluxo 2 passos (código → DNS → user/senha), logo S.A Player, sem checkboxes

**Files:**
- Modify: `src/pages/Login.tsx` (reescrever o componente; ler o atual antes pra manter props/spatial-nav)
- Reference: `src/services/api.ts` (Xtream — usar `api.authenticate(url, user, pass)`), `src/services/storage.ts` (`saveCredentials`)

- [ ] **Step 1: Ler o Login.tsx atual + como o app navega pós-login**

```bash
sed -n '1,140p' src/pages/Login.tsx
grep -n "authenticate\|saveCredentials\|FocusInput\|FocusButton\|onLoginSuccess\|useFocusable" src/pages/Login.tsx src/services/api.ts src/services/storage.ts
```
Anotar: assinatura de `onLoginSuccess`, componentes de foco (`FocusInput`/`FocusButton`) e como `api.authenticate` salva credenciais.

- [ ] **Step 2: Reescrever o estado/handlers do Login (lógica central)**

Substituir o miolo do componente `Login` por uma máquina de 2 passos. Manter o uso dos componentes de foco já existentes no arquivo. Lógica central:
```tsx
// imports no topo
import * as panel from '../services/panel'; // ajustar p/ '../services/panelService'
import { api } from '../services/api';
import { storage } from '../services/storage';
import type { DnsOption } from '../services/panelService';

// dentro do componente:
const [step, setStep] = useState<'code' | 'creds'>('code');
const [code, setCode] = useState('');
const [dnsList, setDnsList] = useState<DnsOption[]>([]);
const [dnsId, setDnsId] = useState('');
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const handleCode = useCallback(async () => {
  setError('');
  const c = code.trim().toUpperCase();
  if (!c) { setError('Informe o código do revendedor.'); return; }
  setLoading(true);
  try {
    const r = await panel.resellerDns(c);
    if (!r.success) { setError(r.message || 'Revendedor não encontrado.'); return; }
    if (!r.dns.length) { setError('Nenhuma DNS liberada para este revendedor.'); return; }
    setDnsList(r.dns);
    setDnsId(r.dns[0].id);     // auto-seleciona a 1ª; se >1, usuário troca
    setStep('creds');
  } catch { setError('Erro de conexão. Tente novamente.'); }
  finally { setLoading(false); }
}, [code]);

const handleLogin = useCallback(async () => {
  setError('');
  if (!username.trim() || !password.trim()) { setError('Informe usuário e senha.'); return; }
  setLoading(true);
  try {
    const c = code.trim().toUpperCase();
    const r = await panel.login({ dnsId, username: username.trim(), password: password.trim(), code: c });
    if (!r.success) { setError(r.message || 'Falha na validação do revendedor.'); return; }
    const dnsUrl = dnsList.find((d) => d.id === dnsId)?.url || '';
    await api.authenticate(dnsUrl, username.trim(), password.trim()); // Xtream no servidor do revendedor
    storage.saveCredentials({ url: dnsUrl, username: username.trim(), password: password.trim() });
    onLoginSuccess();
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    setError(m.includes('401') || m.toLowerCase().includes('auth') ? 'Credenciais inválidas ou conta inativa.' : 'Erro ao conectar no servidor.');
  } finally { setLoading(false); }
}, [username, password, dnsId, dnsList, code, onLoginSuccess]);
```
**Ajustes obrigatórios:**
- Import correto: `import * as panel from '../services/panelService';`
- **Remover** todo `includeTV`/`includeVOD` (estado, JSX e `localStorage.setItem`).
- Conferir a assinatura real de `api.authenticate` e `storage.saveCredentials` (Step 1) e ajustar os args.

- [ ] **Step 3: JSX — Passo "código" e Passo "creds", logo S.A Player, paleta**

- Topo: `<img src="/saplayer-logo.png" alt="S.A Player" />` (asset adicionado na Task 8) centralizado.
- Passo `code`: 1 input "Código do revendedor" (auto-uppercase) + botão "Continuar" → `handleCode`.
- Passo `creds`: se `dnsList.length > 1`, um seletor de servidor (lista `title`); inputs "Usuário" e "Senha"; botão "Entrar" → `handleLogin`; botão "Voltar" → `setStep('code')`.
- Mensagem de `error` em destaque. Spinner quando `loading`.
- Botões com `background: var(--sa-grad)`, fundo `var(--sa-bg)`, inputs com `var(--sa-card)`/`var(--sa-border)`, texto `var(--sa-text)`.
- Manter `FocusInput`/`FocusButton`/spatial-nav que já existem no arquivo (navegação por controle).

- [ ] **Step 4: Verificar build (type-check)**

```bash
npm run build
```
Expected: compila sem erro de tipos.

- [ ] **Step 5: Verificar a UI no navegador com mock temporário do panelService**

Criar `src/services/panelService.mock.dev.ts` (NÃO commitar) que exporta `resellerDns`/`login` fake, e trocar o import do Login temporariamente; rodar `npm run dev -- --port 8801 --host` e abrir `http://localhost:8801`. Conferir: passo código → passo creds → erro/loading. Reverter o import depois.
```bash
npm run dev -- --port 8801 --host 0.0.0.0
```
Expected: fluxo de 2 passos renderiza com a paleta sky/dark e a logo.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Login.tsx && git commit -m "feat: 2-step reseller-code login (S.A Player), drop TV/VOD toggles"
```

---

### Task 8: Rebrand NeoStream → S.A Player (identidade, manifests, i18n, ícones)

**Files:**
- Modify: `package.json`, `index.html`, `config.xml` (Tizen), `src/i18n/*.json`
- Create: `appinfo.json` (webOS), `public/saplayer-logo.png`, ícones
- Optional: renomear pasta `NeoStream-TV` → `saplayer`

- [ ] **Step 1: Achar todas as strings "NeoStream"**

```bash
grep -rniE "neostream" --include=*.ts --include=*.tsx --include=*.json --include=*.html --include=*.xml . | grep -v node_modules
```

- [ ] **Step 2: Trocar identidade**

- `package.json`: `"name": "saplayer"`.
- `index.html`: `<title>S.A Player</title>`.
- `src/i18n/*.json`: trocar ocorrências de "NeoStream" por "S.A Player".
- `config.xml` (Tizen): `<tizen:application id="..." package="..."/>` → id próprio (ex `com.saplayer.tv`), `<name>S.A Player</name>`, e garantir `<access origin="*" subdomains="true"/>` (libera o fetch pro painel no aparelho).

- [ ] **Step 3: Criar appinfo.json (webOS) na raiz**

`appinfo.json`:
```json
{
  "id": "com.saplayer.tv",
  "version": "1.0.0",
  "vendor": "S.A Player",
  "type": "web",
  "main": "index.html",
  "title": "S.A Player",
  "icon": "icon.png",
  "largeIcon": "icon-large.png",
  "bgColor": "#060912"
}
```

- [ ] **Step 4: Adicionar a logo + ícones**

Colocar a logo oficial em `public/saplayer-logo.png` (usada no Login) e os ícones do app (substituir os do NeoStream em `public/`/`icons/`). **Pegar os assets oficiais com o Thiago** se ainda não tiver.

- [ ] **Step 5: Build + commit**

```bash
npm run build && git add -A && git commit -m "chore: rebrand NeoStream -> S.A Player (identity, manifests, i18n)"
```

- [ ] **Step 6 (opcional): renomear a pasta**

```bash
cd /root && mv NeoStream-TV saplayer
```
(Atualizar quaisquer caminhos absolutos depois.)

---

### Task 9: Verificação de integração end-to-end (painel real + app)

- [ ] **Step 1: Rodar a suíte de testes completa**

```bash
cd /root/NeoStream-TV && npm test
```
Expected: todos os testes PASS (xorCrypto, deviceService, panelService).

- [ ] **Step 2: Smoke real contra o auth.php (caminho web token), com código JBPOWER**

```bash
curl -s -X POST "https://streamapps.dev/saplayer/api/auth.php" \
  -H "X-Saplayer-Web: saw_147e48d198769d504c42bc1523323c82c043a69d" -H "Content-Type: application/json" \
  -d "$(python3 -c "import json,base64; K=bytes.fromhex('4A7B9CE32FA568D13B76C912EF458A1DB4592CF7639E3154A87DC2164E9328BF'); p=json.dumps({'app_device_id':'smoke','app_type':'tizen','version':'reseller_dns','id_user':'JBPOWER'}).encode(); x=bytes(p[i]^K[i%len(K)] for i in range(len(p))); print(json.dumps({'data':base64.b64encode(x).decode()}))")" \
  | python3 -c "import sys,json,base64; K=bytes.fromhex('4A7B9CE32FA568D13B76C912EF458A1DB4592CF7639E3154A87DC2164E9328BF'); d=json.load(sys.stdin)['data']; raw=base64.b64decode(d); print(bytes(raw[i]^K[i%len(K)] for i in range(len(raw))).decode())"
```
Expected: `{"success":true,...,"dns":[{"title":"Jb power","url":"http://jbpower.cam"}]}`.

- [ ] **Step 3: Build de produção + (quando houver aparelho) sideload**

```bash
npm run build
```
Tizen `.wgt` / webOS `.ipk`: empacotar e sideload no aparelho pra login real end-to-end (precisa de credencial Xtream válida de algum revendedor pra ir até os canais — ver spec).

---

## Self-Review (autor)
- **Cobertura da spec:** login 2 passos (Tasks 5,7) ✓; sem checkbox TV/VOD (Task 7 Step 2) ✓; logo S.A Player (Tasks 7,8) ✓; deviceId fixo (Task 4) ✓; tema sky/dark (Task 6) ✓; rebrand (Task 8) ✓; remover devMock (Task 2) ✓; branding por revendedor = Fase 2 (fora de escopo) ✓; gate UA do painel resolvido (Task 1) ✓.
- **Tipos consistentes:** `DnsOption`/`ResellerDnsResult`/`LoginResult` definidos na Task 5 e usados na Task 7; `getDeviceId`/`getAppType` (Task 4) usados na Task 5; `xorEncrypt`/`xorDecrypt` (Task 3) usados nas Tasks 5 e 9.
- **Pendência conhecida (não bloqueia Fase 1):** assets oficiais (logo/ícones) — pegar com o Thiago (Task 8 Step 4). webOS device id real = Fase 2.
