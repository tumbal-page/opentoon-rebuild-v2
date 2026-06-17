# OpenToon Rebuild v2

Manga/Manhwa/Manhua Translation App - rebuilt with Expo React Native.

## Features

- **WebView Scraping**: Load manga websites and capture pages directly
- **Text Detection**: On-device TFLite model for detecting text blocks
- **Translation**: LibreTranslate (self-hosted, free, unlimited)
- **Dark Mode**: Full dark mode support matching original UI
- **NativeWind/Tailwind**: Styling matching original app design

## How It Works

1. **Enter Chapter URL** → Load manga website in WebView
2. **Inject JavaScript** → DOM scanner captures all images
3. **Auto-Scroll** → Trigger lazy-loaded images
4. **Select Images** → Choose which images to translate
5. **Text Detection** → TFLite detects text blocks
6. **Translation** → LibreTranslate translates text
7. **Display** → Render translated text as overlay

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup LibreTranslate
```bash
pip install argostranslate
python translate_server.py
```

### 3. Configure App
- Open Settings → Enter LibreTranslate URL
- Tap "Test Connection"
- Select source/target languages

### 4. Build APK
```bash
# GitHub Actions (recommended)
# Push to main branch

# Local build
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

## Architecture

- **WebView**: Loads manga websites, injects JavaScript for scraping
- **TFLite**: On-device text detection (speech bubbles, free text)
- **LibreTranslate**: Self-hosted translation server
- **NativeWind**: Tailwind CSS styling
- **Reanimated**: Smooth animations
- **Expo Router**: File-based navigation

## Project Structure

```
app/
├── index.tsx           # Home screen
├── capture.tsx         # WebView scraping
├── viewer.tsx          # Chapter viewer + translation
├── chapters.tsx        # Saved chapters
├── settings.tsx        # LibreTranslate config
└── _layout.tsx         # Root layout
src/
├── utils/
│   └── webviewScrape.js  # WebView injection scripts
├── services/
│   └── translationService.ts  # LibreTranslate API
└── assets/             # Placeholder images
.github/workflows/
└── build.yml           # GitHub Actions build
```

## What's Different from Original

| Feature | Original | This Rebuild |
|---------|----------|--------------|
| Login/Auth | Supabase Auth | Removed |
| Coins/Payment | RevenueCat | Removed |
| Translation | Modal.com server | LibreTranslate (local) |
| Text Detection | TFLite (local) | TFLite (local) |
| Capture | WebView scraping | WebView scraping |
| Styling | NativeWind | NativeWind (matching) |
