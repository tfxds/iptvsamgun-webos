# 📺 NeoStream TV

> IPTV Player for Samsung Tizen and LG webOS Smart TVs

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

## ⚠️ Disclaimer

**NeoStream TV is just a player application.** It does not provide, host, or distribute any content. Users must have their own IPTV subscription and are solely responsible for the content they access through their providers.

This application:
- ❌ Does NOT include any channels or streams
- ❌ Does NOT store or distribute any media content
- ❌ Does NOT have any affiliation with IPTV providers
- ✅ Only connects to user-provided Xtream Codes servers
- ✅ Is a tool to play playlists from the user's own subscription

**Use at your own risk. The developers are not responsible for how this application is used.**

---

## ✨ Features

- 📺 **Live TV Player** - Watch your IPTV subscription
- 🎬 **VOD Support** - Movies & Series from your provider
- 🎮 **TV Navigation** - Full D-pad/remote control support
- 🌙 **Dark Theme** - Premium TV-optimized interface
- 🔐 **Xtream Codes API** - Connect to your provider
- 💾 **Local Storage** - Saved credentials and favorites

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Rakjsu/NeoStream-TV.git
cd NeoStream-TV

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Vanilla CSS | Styling |
| HLS.js | Video Streaming |

## 📁 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── Sidebar/       # Navigation sidebar
│   └── ContentRow/    # Content carousel
├── pages/             # Application pages
│   ├── Login.tsx      # User authentication
│   ├── Home.tsx       # Dashboard
│   └── LiveTV.tsx     # Channel grid
├── services/          # Business logic
│   ├── api.ts         # Xtream Codes API client
│   └── storage.ts     # LocalStorage service
├── hooks/             # Custom React hooks
│   └── useTVNavigation.ts  # D-pad controls
└── types/             # TypeScript definitions
```

## 🎮 TV Navigation

| Key | Action |
|-----|--------|
| ↑ ↓ ← → | Navigate |
| Enter/OK | Select |
| Back | Go back |
| Play/Pause | Media control |

## 📦 Build

```bash
npm run build
```

## 🎯 Roadmap

- [ ] Video Player Component
- [ ] EPG (Program Guide)
- [ ] Samsung Tizen Packaging
- [ ] LG webOS Packaging

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

**Note:** This is an open-source player application. No content is provided. Users must supply their own IPTV credentials.
