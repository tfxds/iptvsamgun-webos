# Changelog

All notable project changes should be documented in this file.

Created by **Rakjsu**.

## Unreleased

### Changed

- Removed the bundled TMDB API key from source code.
- Added local TMDB key storage through the Settings screen for device/browser testing.
- Split production builds into `build:web` for modern browsers and `build:tizen` for Samsung Tizen.
- Added a dedicated Tizen Vite config for legacy output and expected single-bundle packaging.

### Documentation

- Rewrote the README to remove broken encoding artifacts.
- Updated the documented stack to React 19, TypeScript 5, and Vite 7.
- Added creator attribution for Rakjsu.
- Added clearer disclaimer and security notes for IPTV credentials, TMDB usage, generated Tizen artifacts, and local logs.
- Added a TMDB API key tutorial explaining that each user must provide their own key.
- Added current maintenance notes for build, lint, and Tizen packaging state.

### Known Follow-ups

- Complete Live TV playback from the channel preview action.
- Clean or ignore generated Tizen workspace metadata and install/debug logs.
- Improve remote-control navigation consistency across screens.
