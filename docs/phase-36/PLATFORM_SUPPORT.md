# Dukungan Platform Phase 36 (Desktop GUI)

| Platform | Tata Letak & Framebuffer (BMP/PPM/SVG/HTML) | WebView Loopback Server (HTTP + WS) | Bundel Kemasan Desktop | Peluncuran Jendela OS Native | Status Lingkungan Saat Ini |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Linux x86_64 / ARM64** | Didukung Penuh (Software RGBA32) | Didukung Penuh (`127.0.0.1`) | `.AppDir` + `.desktop` + `AppRun` + `SHA256SUMS` | C GTK+ 3 (`gcc` + `libgtk-3-dev`) / Tkinter dengan X11/Wayland (`DISPLAY`/`WAYLAND_DISPLAY`) | `NATIVE_DISPLAY_UNAVAILABLE` di container headless; seluruh fungsi core & bundler teruji nyata |
| **Windows x86_64 / ARM64** | Didukung Penuh (Software RGBA32) | Didukung Penuh (`127.0.0.1`) | `-win64` + `.exe.manifest` + `.bat` + `SHA256SUMS` | Host C Win32 / PowerShell WinForms / WebView2 | Siap dijalankan pada runner Windows CI / desktop Windows |
| **macOS x86_64 / ARM64** | Didukung Penuh (Software RGBA32) | Didukung Penuh (`127.0.0.1`) | `.app` + `Contents/Info.plist` + Launcher + `SHA256SUMS` | Host Swift AppKit/Cocoa (`swiftc`) + `Cmd` shortcut mapping | Siap dijalankan pada runner macOS CI / desktop macOS |
| **Headless CI / Node 22** | Didukung Penuh (`AdaptorHeadlessGUI`) | Didukung Penuh | Teruji lintas format target | Dilewati jujur tanpa display | Teruji 100% di container saat ini (`22/22`) |
