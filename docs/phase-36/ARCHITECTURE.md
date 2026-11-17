# Arsitektur Desktop GUI Framework (Phase 36)

## 1. Tujuan & Batas Sistem
Subsistem Phase 36 menyediakan kerangka kerja GUI desktop modular untuk bahasa pemrograman NUSANTARA (`std:gui` / `src/gui/`), yang memisahkan definisi pohon widget deklaratif-reaktif dari engine tata letak, rasterizer, input router, host WebView/IPC, generator host OS native, serta pengemas aplikasi desktop.

## 2. Komponen Arsitektur
1. **Core & Lifecycle (`src/gui/core/`)**:
   - `AplikasiGUI`, `KonteksAplikasiGUI`, `PengelolaLifecycle` (`DIBUAT` -> `MEMULAI` -> `BERJALAN` -> `BERHENTI` -> `DIHANCURKAN`), `EventLoopGUI`, dan `JendelaGUI` (batas min/maks, maksimalkan/minimalkan/layar penuh/pulihkan, hook `onSebelumTutup`).
2. **Pohon Widget & Kontainer (`src/gui/widgets/`, `src/gui/layout/`)**:
   - Widget kontrol: `LabelWidget`, `TombolWidget`, `InputTeksWidget`, `AreaTeksWidget`, `KotakCentangWidget`, `TombolRadioWidget`/`GrupRadio`, `PilihanDropdownWidget`, `DaftarWidget`, `TabelWidget`, `GambarWidget`, `IndikatorProgresWidget`, `SliderWidget`, `TabWidget`.
   - Kontainer & tata letak: `WadahWidget`, `BarisLayout`, `KolomLayout`, `GridLayout`, `StackLayout`, `WadahGulirWidget`.
3. **Mesin Tata Letak (`src/gui/layout/layout_engine.ts`)**:
   - `MesinTataLetak` menghitung koordinat aktual `(x, y, lebar, tinggi)` untuk menu bar, toolbar, flex (`Baris`/`Kolom`), `GridLayout`, `TabWidget`, `StackLayout`, `WadahGulirWidget`, dan melakukan `cariNodePadaTitik(x, y)` (hit-testing Z-order).
4. **Rasterizer & Renderer (`src/gui/render/`)**:
   - `KanvasFramebuffer`: rasterizer perangkat lunak RGBA32 murni TypeScript dengan clipping, primitif kotak/lingkaran/bitmap font 5x7, serta eksportir `eksporBMP()` (Windows DIB 24-bit) dan `eksporPPM()` (P6).
   - `PerenderDesktop`: menghasilkan output framebuffer BMP/PPM, vektor SVG, dan HTML5 lengkap untuk seluruh 19 tipe widget/kontainer.
5. **Input Router & Aksesibilitas (`src/gui/events/input_router.ts`, `src/gui/accessibility/a11y.ts`)**:
   - Mengarahkan `klikMouse`, `gerakMouse`, navigasi fokus `Tab`/`Shift+Tab`, penekanan tombol pada widget terfokus, dan shortcut menu (`Ctrl+S`/`Cmd+S`), serta generator atribut ARIA.
6. **Platform Adapters & Host Runtime (`src/gui/platform/`)**:
   - `DetektorPlatformDesktop`: mendeteksi OS, `DISPLAY`/`WAYLAND_DISPLAY`, `gcc`, `clang`, `pkg-config`, `gtk+-3.0`, `python3`/`tkinter`/`pygobject`, `swiftc`, `webview2`.
   - `AdaptorDesktopWebviewServer`: server HTTP loopback (`127.0.0.1`) + WebSocket `/ipc` nyata dengan sinkronisasi HTML dua arah.
   - `AdaptorDesktopLinux`, `AdaptorDesktopWindows`, `AdaptorDesktopMacOS`: generator & peluncur host native (C GTK3, C Win32/PowerShell WinForms, Swift AppKit/Cocoa) dengan pelaporan jujur `NATIVE_DISPLAY_UNAVAILABLE` bila display tidak tersedia.
   - `AdaptorHeadlessGUI`: adaptor pengujian deterministik tanpa server tampilan.
7. **Pengemasan Desktop (`src/gui/packaging/desktop_packager.ts`)**:
   - `PengemasAplikasiDesktop` menghasilkan bundel distribusi Linux `.AppDir` + `.desktop` + `AppRun`, macOS `.app` + `Info.plist`, Windows `-win64` + `.exe.manifest` + `.bat`, beserta `manifest.json` dan `SHA256SUMS` dengan utilitas verifikasi `verifikasiBundel`.
