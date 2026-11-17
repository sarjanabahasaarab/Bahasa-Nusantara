# Architecture — Phase 37 (Mobile Application Framework)

- **Scope:** Core mobile runtime, UI component hierarchy, responsive layout & safe-area engine, stack/tab/bottom navigation & deep linking, native bridge (`Kotlin` + `Swift`), loopback HTML/WebSocket preview server, and CLI project scaffolding under `src/mobile/`.

## Layer Breakdown
1. **Core (`src/mobile/core/`)**:
   - `AplikasiMobile` (`application.ts`): Validates manifest config via `PengelolaKonfigurasiMobile`, manages `KonteksAplikasiMobile`, binds root UI components or primary navigator, and broadcasts lifecycle transitions (`MEMULAI`, `AKTIF`, `JEDA`, `RESUME`, `LATAR_BELAKANG`, `BERHENTI`, `DIHANCURKAN`) across `JembatanMobileNative`.
   - `PengelolaStateMobile` (`state.ts`): Keyed and global reactive store with prototype-pollution key filtering (`__proto__`, `constructor`, `prototype`).
   - `PengelolaLifecycleMobile` (`lifecycle.ts`) & `PengelolaKonfigurasiMobile` (`config.ts`).
2. **UI & Layout (`src/mobile/ui/`, `src/mobile/layout/`)**:
   - Primitives: `TeksMobile`, `TombolMobile`, `InputTeksMobile`, `InputSandiMobile`, `SakelarMobile`, `KotakCentangMobile`, `TombolRadioMobile`, `DropdownMobile`, `GambarMobile`, `IkonMobile`, `IndikatorProgresMobile`, `IndikatorMemuatMobile`, `KartuMobile`, `PemisahMobile`, `DaftarMobile`, `GridMobile`, `DialogMobile`, `AlertMobile`, `SnackbarMobile`.
   - Layout: `AreaAmanMobile`, `PengelolaResponsifMobile`, `TataLetakVertikalMobile`, `TataLetakHorizontalMobile`, `TataLetakTumpukMobile`, `TampilanGulirMobile`.
   - Renderer: `PerenderMobile` (`mobile_renderer.ts`) builds the native UI tree JSON, sanitized HTML5 mobile viewport (`390x844`), and SVG wireframe preview.
3. **Navigation (`src/mobile/navigation/`)**:
   - `NavigatorTumpukanMobile`, `NavigatorTabMobile`, `NavigasiBawahMobile`, `RuteMobile`, and `PengelolaDeepLinkMobile` (`uraikanUrl`, `tanganiUrl`).
4. **Native Bridge & Preview Host (`src/mobile/bridge/`, `src/mobile/runtime/`)**:
   - `JembatanMobileNative` (`bridge.ts`): Bidirectional request/response & event channel with pluggable `TransportJembatanNative`.
   - `GeneratorJembatanMobileNative` (`native_codegen.ts`): Emits Android (`NusantaraNativeBridge.kt`, `MainActivity.kt`, `AndroidManifest.xml`, `strings.xml`, `build.gradle`, `settings.gradle`, `gradle.properties`) and iOS (`NusantaraNativeBridge.swift`, `NusantaraViewController.swift`, `Info.plist`, `Podfile`) sources.
   - `HostPreviewMobile` (`mobile_host.ts`) & `DetektorToolchainMobile`: Loopback `127.0.0.1` HTTP + WebSocket (`/ipc`) server and real host binary probing (`ANDROID_HOME`, `adb`, `gradle`, `javac`, `keytool`, `xcodebuild`, `simctl`).
5. **Stdlib & CLI (`src/stdlib/mobile.ts`, `src/mobile/cli/mobile_cli.ts`)**:
   - Exposes `std:mobile` (aliases `seluler`, `android`, `ios`) and `MobileCLI` (`baru`, `platform`, `periksa`, `build`, `jalankan`, `verifikasiBundel`).
