# Security — Phase 37 (Mobile Framework)

1. **Cross-Site WebSocket Hijacking (CSWSH) & HTTP Hardening (`src/mobile/runtime/mobile_host.ts`)**:
   - Binds strictly to loopback (`127.0.0.1`).
   - Enforces `verifyClient` WebSocket `Origin` checking (permits `undefined` non-browser native/Node clients; restricts browser origins to loopback hosts matching the active server port).
   - Caps WebSocket frame payload size (`256 KiB`) and rejects `__proto__` / `constructor` IPC payloads.
   - Emits `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and restrictive HTML `Content-Security-Policy`.
2. **HTML / JS / CSS / Media XSS Defense (`src/mobile/ui/mobile_renderer.ts`)**:
   - Escapes `<`, `>`, `&`, `"`, and `'` across HTML attributes and text nodes.
   - Uses `JSON.stringify` serialization for `jsAttrArg` and WebSocket URLs.
   - Enforces `safeCssColor` allowlisting for custom colors and `safeImageSrc` blocking `javascript:`, `vbscript:`, and `data:text/html` URLs.
3. **Native Codegen Injection Defense & WebView Hardening (`src/mobile/bridge/native_codegen.ts`, `src/mobile/cli/mobile_cli.ts`)**:
   - Sanitizes package identifiers (`sanitizeMobilePackageId`), escapes XML entities (`AndroidManifest.xml`, `strings.xml`, `Info.plist`), double-quoted Kotlin/Swift/Gradle literals, and single-quoted Ruby `Podfile` names.
   - Sets `webView.settings.allowFileAccessFromFileURLs = false` and `allowUniversalAccessFromFileURLs = false` on Android `MainActivity.kt`.
   - Verifies native bundle outputs via real SHA-256 `SHA256SUMS` and rejects `..` path traversal (`MobileCLI.verifikasiBundel()`).
4. **Prototype Pollution Guards (`src/mobile/core/state.ts`, `src/mobile/navigation/deep_link.ts`)**:
   - Rejects `__proto__`, `constructor`, and `prototype` keys in `PengelolaStateMobile` and filters them from `PengelolaDeepLinkMobile.uraikanUrl()` query objects.
