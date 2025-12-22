# 📺 NeoStream TV

> IPTV streaming app optimized for Samsung Tizen and LG webOS Smart TVs

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- 📺 **Live TV** - 1900+ channels with category filtering
- 🎬 **Movies & Series** - VOD catalog browsing
- 🎮 **TV Navigation** - Full D-pad/remote control support
- 🌙 **Dark Theme** - Premium TV-optimized interface
- 🔐 **Xtream Codes API** - Compatible with IPTV providers
- 💾 **Local Storage** - Saved credentials and favorites

## 📸 Screenshots

| Login | Live TV | Sidebar |
|-------|---------|---------|
| Dark themed login | Channel grid | Animated navigation |

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
│   ├── Login.tsx      # Authentication
│   ├── Home.tsx       # Dashboard
│   └── LiveTV.tsx     # Channel grid
├── services/          # Business logic
│   ├── api.ts         # Xtream Codes API
│   └── storage.ts     # LocalStorage
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

## 📦 Build for Production

```bash
npm run build
```

Output will be in `dist/` folder.

## 🎯 Roadmap

- [ ] Video Player Component
- [ ] EPG (Electronic Program Guide)
- [ ] VOD Pages (Movies/Series)
- [ ] Samsung Tizen Packaging
- [ ] LG webOS Packaging
- [ ] Favorites System
- [ ] Search Functionality

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

Made with ❤️ for Smart TV enthusiasts
