@echo off
echo 🚀 Building Waali Gas Station...

REM Build web version
echo 📦 Building web version...
call npm run build

REM Build native desktop app
echo 🖥️ Building native desktop app...
call npx tauri build

REM Build Windows installer
echo 💿 Building Windows installer...
where iscc >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    iscc installer.iss
    echo ✅ Windows installer created successfully!
) else (
    echo ⚠️ Inno Setup not found. Please install Inno Setup to create Windows installer.
)

echo ✅ Build process completed!
pause