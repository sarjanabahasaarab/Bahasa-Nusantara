# Keamanan Desktop GUI Framework (Phase 36)

## 1. Kontrol Keamanan yang Diterapkan
1. **Proteksi WebView Loopback Server (`src/gui/platform/webview_server.ts`)**:
   - Binding jaringan dibatasi ketat ke alamat loopback `127.0.0.1` (bukan `0.0.0.0`).
   - Validasi `Origin` handshake WebSocket (`verifyClient`) menolak koneksi Cross-Site WebSocket Hijacking (CSWSH) dari origin eksternal sambil tetap mengizinkan klien native non-browser.
   - Header keamanan HTTP diterapkan: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, dan `Content-Security-Policy`.
   - Pembatasan ukuran frame WebSocket (`maxPayload: 256 KiB`) dan penjagaan nama properti `__proto__`/`constructor`/`prototype` dari pesan JSON IPC.
2. **Sanitasi Render HTML & SVG (`src/gui/render/renderer.ts`)**:
   - Seluruh teks judul jendela, label, isi tabel, dan nilai input di-escape dengan `escapeXML`.
   - Warna gaya inline divalidasi dengan `safeCssColor`; URI gambar pada `GambarWidget` dibersihkan dengan `safeImageSrc` untuk menolak skema berbahaya (`javascript:`, `vbscript:`, `data:text/html`).
   - Serialisasi URL WebSocket menggunakan `JSON.stringify` untuk mencegah injeksi skrip.
3. **Sanitasi Generator Host Native (`src/gui/platform/native_desktop.ts`)**:
   - Judul jendela pada kode C (`GTK3`/`Win32`) dan Swift (`Cocoa`) di-escape untuk backslash, kutip ganda, dan newline; ID aplikasi disanitasi (`sanitizeAppId`) guna mencegah injeksi string C/D-Bus.
4. **Integritas Pengemasan & Anti-Injection (`src/gui/packaging/desktop_packager.ts`)**:
   - Perhitungan checksum mewajibkan SHA-256 asli Node.js (`crypto.createHash('sha256')`) — tidak ada fallback hash non-kriptografis palsu.
   - `verifikasiBundel()` memeriksa kecocokan hash seluruh entri `SHA256SUMS` serta menolak path traversal.
   - `Info.plist` macOS dan `.exe.manifest` Windows menggunakan XML escaping (`escapeXml`); launcher shell POSIX dan `.bat` melakukan sanitasi jalur skrip.
