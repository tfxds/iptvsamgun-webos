# S.A Player (Tizen/webOS) — Spec Fase 1: Login via painel streamapps.dev

**Data:** 2026-06-22
**Base:** fork do NeoStream-TV (React 19 + Vite + TypeScript, player Xtream nativo, mira Tizen + webOS)
**Abordagem aprovada:** A — camada adaptadora; o motor Xtream do NeoStream fica intacto, o painel é o "porteiro" de login + branding na frente.

## Faseamento
- **Fase 1 (esta spec): LOGIN.** App rebrandeado pra S.A Player, login por código de revendedor (2 passos) validado no painel, chega autenticado no app com conteúdo REAL do revendedor (usando as telas de conteúdo que o NeoStream já tem).
- **Fase 2 (depois): CONTEÚDO.** Whitelabel do revendedor dentro do app, revisão/ajuste das telas de conteúdo, EPG, layout, etc. — spec própria.

## Objetivo da Fase 1
Usuário abre o app S.A Player numa Samsung (Tizen) ou LG (webOS), digita o **código do revendedor** + usuário/senha, o painel valida (revendedor, DNS, limite de conexão por MAC) e registra o device, e o app entra autenticado falando Xtream direto com o servidor (DNS) do revendedor.

## Arquitetura (Abordagem A)

### Arquivos NOVOS
- `src/services/panelService.ts` — cliente do painel:
  - Cripto XOR + base64 (key `4A7B9CE32FA568D13B76C912EF458A1DB4592CF7639E3154A87DC2164E9328BF`), envelope `{data: <xor_b64(json)>}`, header `User-Agent: smart-tv`, `Content-Type: application/json`.
  - `resellerDns(code)` → POST auth.php `{app_device_id, app_type, version:'reseller_dns', id_user:code}` → `{success, reseller_id, dns:[{id,title,url}]}` ou `{success:false, message}`.
  - `login({dnsId, username, password, code})` → `{..., version:'login', dns_id, username, password, id_user}` → `{success, mac_address, dns_id, username}` ou erro.
  - `logout()` → `{app_device_id, version:'logout'}`.
  - Decodifica a resposta `{data}` com a mesma XOR.
  - Base URL configurável (default `https://streamapps.dev/saplayer/api/auth.php`) — Fase 2 pode virar whitelabel/painel próprio.
- `src/services/deviceService.ts` — `getDeviceId()`: ID **fixo por TV**. Tizen: `webapis.productinfo.getDuid()` / `tizen.systeminfo`; webOS: device id via luna-service. Fallback: UUID gerado. **Cacheia em localStorage (`sa_device_id`)** pra não oscilar entre aberturas (mesma lição do MAC do Roku). `app_type` = `'tizen'` | `'webos'` (detectado em runtime).
- `src/theme.css` (ou CSS vars no root) — paleta sky/dark (abaixo).

### Arquivos ALTERADOS
- `src/pages/Login.tsx` — reescrito pro fluxo de 2 passos:
  - Passo 1: campo **Código do revendedor** → `panelService.resellerDns`.
  - Passo 2: se 1 DNS, auto-seleciona; se várias, lista pra escolher. Campos **usuário** + **senha** → `panelService.login`.
  - **Logo S.A Player fixo** (asset no app), paleta nova.
  - **REMOVER** os checkboxes `includeTV` / `includeVOD` (conteúdo vem do servidor do revendedor, não é escolha do usuário) + a lógica `localStorage includeTV/includeVOD`.
  - No sucesso do `login`: chama `api.authenticate(dnsUrl, username, password)` (Xtream real no DNS do revendedor; `dnsUrl` = a url do dns escolhido na lista do passo 1) + `storage.saveCredentials` + `onLoginSuccess()`.
- `src/services/api.ts` (Xtream) — **interface intacta**. Só passa a ser alimentado pelo panelService em vez do login Xtream cru.
- **Remover `src/devMock.ts` + o import no `main.tsx`** — era o mock de CONTEÚDO (Xtream) só pra demonstrar o layout. Sai. (Se precisar iterar a UI do login sem o painel, uso um mock SEPARADO e temporário do `panelService`, dev-only, não comitado no build final.)

### NÃO TOCAR (Fase 1)
Catálogo, player (hls.js), navegação espacial, EPG, continuar assistindo, favoritos. Já funcionam falando Xtream com a DNS.

## Fluxo de login (passo a passo)
1. App abre → `deviceService.getDeviceId()` (carrega/gera + cacheia) → tela de login com **logo S.A Player** + paleta sky/dark.
2. Usuário digita **código do revendedor** → `resellerDns(code)`.
   - Erro: "Revendedor não encontrado" / "Revendedor expirado" / "Nenhuma DNS liberada" → mostra a `message` do painel.
3. Sucesso → tem a lista de DNS. 1 DNS = auto-seleciona; N DNS = usuário escolhe (nome `title`).
4. Usuário digita **usuário + senha** → `login({dnsId, username, password, code})`.
   - Painel valida: revendedor válido/não-expirado, DNS pertence ao revendedor, **limite de conexão por MAC** (registra/atualiza o device na `playlist`).
   - Erro: "Revendedor expirado" / "DNS inválido para este revendedor" / limite excedido / etc → mostra `message`.
5. Sucesso → `api.authenticate(dnsUrl, username, password)` (auth Xtream no servidor do revendedor, ex `http://jbpower.cam/player_api.php`).
   - ⚠️ Aqui é onde "credenciais inválidas ou conta inativa" aparece se o user/senha não existir NAQUELE servidor — é o passo Xtream, separado do painel.
6. Sucesso → entra no app (Fase 2 aplica branding do revendedor; Fase 1 entra com o tema S.A Player).

## Rebrand NeoStream → S.A Player (Fase 1)
- Pasta `NeoStream-TV` → `saplayer`; `package.json` name → `saplayer`.
- `index.html` `<title>` + manifests: Tizen `config.xml` (title S.A Player, app id próprio ex `com.saplayer.tv`), webOS `appinfo.json` (title S.A Player, id próprio).
- Remover/trocar todas as strings "NeoStream" da UI e i18n (`src/i18n/*`) por **S.A Player**.
- Ícones + splash = S.A Player.

## Paleta (do webstreamapps.com — `/root/streamapps_root/index.php` :root)
```
--bg:     #060912     /* fundo navy quase-preto */
--bg2:    #0a0f1c     /* superfície elevada */
--accent: #0ea5e9     /* sky-500 */
--accent2:#38bdf8     /* sky-400 */  (botões/destaque = linear-gradient(135deg, #0ea5e9, #38bdf8))
--text:   #f1f5f9     /* slate-100 */
--muted:  #94a3b8     /* slate-400 */
--card:   rgba(255,255,255,0.04)  + borda rgba(255,255,255,0.10)  /* glass */
```

## Build
- Tizen: `npm run build:tizen` (NeoStream já tem `vite.tizen.config.ts`) → empacotar `.wgt` (Tizen Studio CLI, assinado).
- webOS: build web + `ares-package` → `.ipk` (configurar; NeoStream ainda não tem pipeline webOS).

## Pontos a CONFIRMAR (antes/durante implementação)
1. **`app_type`** que o painel espera no `reseller_dns`/`login` — provavelmente livre (só loga); usar `'tizen'`/`'webos'`. Validar no auth.php (`$authData['app_type']`).
2. **APIs de deviceId** exatas por plataforma (Tizen DUID via `webapis.productinfo`; webOS device id) — testar no aparelho/emulador.
3. **Endpoint de branding por revendedor** (logo/nome/cores) — `backdrop.php` / `app_info` no painel. **Deferido pra Fase 2** (Fase 1 usa tema S.A Player fixo).
4. **Logo S.A Player** (asset oficial) — pegar do painel/cliente.

## Testes (Fase 1)
- **UI/fluxo no navegador**: dev server Vite; mock do `panelService` (dados fake de DNS) pra ver as telas sem depender do painel — igual o devMock que usei na demo.
- **Integração real**: bater no `auth.php` de produção com código de revendedor de verdade (ex `JBPOWER`, `KTECTV`) — já validado que `reseller_dns` responde. Harness XOR (Python) documentado em `[[project_saplayer_panel_reseller_code_casefix]]` replica o protocolo.
- **No aparelho**: sideload `.wgt` (Samsung) / `.ipk` (LG) — login real end-to-end.
