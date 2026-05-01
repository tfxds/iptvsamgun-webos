# NeoStream TV

IPTV player for Samsung Tizen and LG webOS Smart TVs.

Created by **Rakjsu**.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

## Disclaimer

**NeoStream TV is a player application only.** It does not provide, host, sell, or distribute channels, movies, series, playlists, streams, or media content.

Users must provide their own IPTV subscription or playlist credentials and are solely responsible for the content they access through their provider.

This application:

- Does not include channels, movies, series, streams, or playlists.
- Does not store, host, proxy, or redistribute media content.
- Is not affiliated with IPTV providers.
- Connects only to user-provided Xtream Codes servers.
- Stores user settings and credentials locally on the device.

Use at your own risk. The creator and contributors are not responsible for how the application is used.

## Features

- Live TV, movies, and series support through Xtream Codes.
- HLS playback through HLS.js where supported.
- TV-first navigation for D-pad and remote controls.
- Dark interface optimized for large screens.
- Local favorites and watch-later storage.
- Multi-profile support.
- Portuguese and English language resources.
- Optional TMDB metadata using a user-provided local API key.
- Samsung Tizen build support with Vite legacy output.

## Quick Start

```bash
git clone https://github.com/Rakjsu/NeoStream-TV.git
cd NeoStream-TV
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Scripts

```bash
npm run dev          # Start the Vite development server
npm run build        # Alias for build:web
npm run build:web    # Type-check and build the modern web app
npm run build:tizen  # Type-check, build the Tizen bundle, and copy assets into tizen/
npm run lint         # Run ESLint
npm run preview      # Preview the production build locally
```

## TMDB API Key

NeoStream TV does not ship with a TMDB API key. TMDB is optional: without a key, the app still works with the channels, movies, series, posters, and metadata returned by your IPTV provider.

To enable TMDB metadata on a device:

1. Create or sign in to your account at [themoviedb.org](https://www.themoviedb.org/).
2. Open your account settings and request an API key from the API section.
3. Open NeoStream TV, go to **Configurações**, paste your TMDB API key, and save it.

Each user should use their own TMDB key. The key is saved only in the local storage of the browser or TV where it was entered, under `neostream_tmdb_api_key`; it is not committed to this repository and is not embedded in the app bundle.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TypeScript 5 | Type safety |
| Vite 7 | Build tooling |
| HLS.js | HLS stream playback |
| React Icons | UI icons |
| Vanilla CSS | Styling |

## Project Structure

```text
src/
|-- components/          Reusable UI components
|-- hooks/               TV navigation, HLS, and app hooks
|-- i18n/                Language resources
|-- pages/               App screens
|-- services/            Xtream, TMDB, profile, and storage services
`-- types/               TypeScript definitions

tizen/
|-- assets/              Built app assets for Samsung Tizen
|-- config.xml           Tizen package configuration
`-- index.html           Tizen entrypoint
```

## TV Navigation

| Key | Action |
|-----|--------|
| Up / Down / Left / Right | Navigate |
| Enter / OK | Select |
| Back / Return | Go back or close overlays |
| Play / Pause | Media control where supported |

## Security Notes

- IPTV credentials are stored in browser/device `localStorage`.
- TMDB is disabled until the user enters their own API key in Settings.
- The TMDB key is stored locally on the device where it was entered.
- Do not add private provider credentials, private API keys, certificates, generated signatures, logs, or Tizen workspace metadata to commits.

## Current Maintenance Notes

- Modern browser builds use `npm run build:web`.
- Samsung Tizen builds use `npm run build:tizen` and copy generated assets into `tizen/assets/`.
- Some generated Tizen artifacts and install/debug logs may exist locally after packaging or device testing.

## Roadmap

- Complete Live TV playback flow from channel selection.
- Add EPG/program guide support.
- Continue lint cleanup and stricter TypeScript typing.
- Harden Tizen packaging and ignored generated artifacts.
- Improve remote-control navigation consistency across all screens.
- Add LG webOS packaging.

## License

MIT License. See [LICENSE](LICENSE).
