# Implementation Notes — Phase 37 (Mobile Framework)

## Audit & Improvements Completed
1. **Reactive State & Deep Link Hardening (`src/mobile/core/state.ts`, `src/mobile/navigation/deep_link.ts`)**:
   - Blocked `__proto__`, `constructor`, and `prototype` keys in `PengelolaStateMobile.tetapkan()`, `ambil()`, `pasangPendengar()`, and `toJSON()`.
   - Rejected control characters and prototype-pollution query keys in `PengelolaDeepLinkMobile.uraikanUrl()`.
2. **HTML5/SVG Renderer Parity & XSS Hardening (`src/mobile/ui/mobile_renderer.ts`)**:
   - Escaped single quotes (`&#39;`), added `jsAttrArg` for inline JS event payloads, added `safeCssColor` for inline color styles, added `safeImageSrc` blocking `javascript:` / `vbscript:` / `data:text/html`, and switched WebSocket URL injection to `JSON.stringify(wsUrl)`.
   - Extended `renderKomponenKeHTML()` to render `GambarMobile`, `IkonMobile`, `IndikatorMemuatMobile`, `PemisahMobile`, `DaftarMobile`, `GridMobile`, `TampilanGulirMobile`, `AlertMobile`, and `DialogMobile` close controls, plus richer SVG output in `renderKeSVG()`.
3. **Host Preview Server Security (`src/mobile/runtime/mobile_host.ts`)**:
   - Added HTTP response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `Content-Security-Policy`).
   - Added CSWSH `verifyClient` WebSocket `Origin` validation (allows non-browser clients without `Origin` and same-port loopback origins only), `maxPayload: 256 KiB`, anti-prototype-pollution JSON guards, and `dialog_tutup`, `alert_konfirmasi`, `alert_batal`, `tarik_refresh` IPC handlers.
4. **Native Codegen & CLI Integrity (`src/mobile/bridge/native_codegen.ts`, `src/mobile/cli/mobile_cli.ts`)**:
   - Applied package-ID sanitization and escaping across Kotlin, Swift, XML (`AndroidManifest.xml`, `strings.xml`, `Info.plist`), Gradle, and Ruby `Podfile`.
   - Disabled `allowFileAccessFromFileURLs` and `allowUniversalAccessFromFileURLs` in generated `MainActivity.kt`.
   - Added `MobileCLI.verifikasiBundel(dirBundel)` to validate `SHA256SUMS` against generated files while rejecting path traversal.
5. **NUSANTARA Stdlib Bindings & 7 Demo Apps (`src/stdlib/mobile.ts`, `contoh/mobile/`)**:
   - Exposed `setNavigator`, `keLatarBelakang`, `aturNavigatorMobile`, `uraiDeepLinkMobile`, and component instance methods (`NavigatorTumpukanMobile`, `NavigatorTabMobile`, `NavigasiBawahMobile`, `IndikatorProgresMobile`, `KotakCentangMobile`, `TombolRadioMobile`, `DropdownMobile`, `DialogMobile`/`AlertMobile`).
   - Added 3 demo apps (`navigasi_belanja.nusantara`, `pengaturan_aplikasi.nusantara`, `daftar_tugas_mobile.nusantara`) alongside the 4 existing root demos (`hello_mobile`, `counter_mobile`, `profile_mobile`, `demo_mobile`).
