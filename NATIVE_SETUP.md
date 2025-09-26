# Waali Gas Station - Native & Installer Setup

## 📋 Overview
This project now includes native desktop application support using Tauri and Windows installer creation using Inno Setup.

## 🛠️ Setup Requirements

### For Native Desktop App (Tauri)
1. **Rust**: Install from https://rustup.rs/
2. **System Dependencies**:
   - Windows: Microsoft C++ Build Tools
   - macOS: Xcode Command Line Tools
   - Linux: `build-essential`, `libwebkit2gtk-4.0-dev`, `libssl-dev`

### For Windows Installer (Inno Setup)
1. **Inno Setup**: Download from https://jrsoftware.org/isinfo.php
2. Install with default settings
3. Add to PATH environment variable

## 🚀 Build Commands

### Development
```bash
# Run web version
npm run dev

# Run native desktop app in development
npx tauri dev
```

### Production Builds
```bash
# Build web version only
npm run build

# Build native desktop app
npx tauri build

# Build everything (web + native + installer)
./build.sh    # Linux/macOS
build.bat     # Windows
```

## 📁 Output Locations

- **Web Build**: `dist/`
- **Native App**: `src-tauri/target/release/`
- **Windows Installer**: `installer/WaaliGasStation-Setup-v1.0.0.exe`

## 🔧 Configuration Files

- `src-tauri/tauri.conf.json` - Tauri app configuration
- `src-tauri/Cargo.toml` - Rust dependencies
- `installer.iss` - Inno Setup script
- `public/manifest.webmanifest` - PWA manifest
- `public/sw.js` - Service worker

## 📱 PWA Features
- Offline support
- App-like experience
- Installable from browser
- Background sync
- Push notifications ready

## 🖥️ Native App Features
- System tray integration
- Auto-start option
- Native file system access
- Better performance
- OS integration

## 🎯 Deployment Options

1. **Web PWA**: Deploy to any web server
2. **Desktop App**: Distribute `.exe`, `.dmg`, or `.AppImage`
3. **Windows Store**: Package as MSIX
4. **Auto-updater**: Configure Tauri updater

## 🔐 Security
- Content Security Policy configured
- Secure API allowlist
- File system access controlled
- Network requests filtered