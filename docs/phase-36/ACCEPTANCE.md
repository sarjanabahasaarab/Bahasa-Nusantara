# Kriteria Penerimaan — Phase 36 (Desktop GUI Framework)

| No | Kriteria Penerimaan | Status Aktual | Bukti Verifikasi |
| :---: | :--- | :---: | :--- |
| 1 | Siklus hidup aplikasi, `EventLoopGUI`, dan `JendelaGUI` (batas min/maks & status) | **LULUS** | `uji_gui_fase36.ts` (`1.1`, `1.2`, `2.1`) |
| 2 | 14 Widget kontrol & 5 Kontainer tata letak + serialisasi pohon | **LULUS** | `uji_gui_fase36.ts` (`3.1`, `3.2`, `4.1`) |
| 3 | Menu bar, toolbar, dialog standar, form validator, tema terang/gelap/kontras tinggi, ARIA | **LULUS** | `uji_gui_fase36.ts` (`5.1`, `6.1`, `7.1`) |
| 4 | Mesin tata letak geometris & hit-testing Z-order (`MesinTataLetak`) | **LULUS** | `uji_gui_fase36.ts` (`11.1`) |
| 5 | Rasterizer RGBA32 (`BMP`, `PPM`), ekspor `SVG` & `HTML5` penuh semua widget | **LULUS** | `uji_gui_fase36.ts` (`12.1`, `10.3`) |
| 6 | Input router mouse, fokus keyboard `Tab`, slider, dan shortcut menu | **LULUS** | `uji_gui_fase36.ts` (`13.1`) |
| 7 | Host `AdaptorDesktopWebviewServer` HTTP + WebSocket IPC nyata & proteksi keamanan CSWSH/CSP/XSS | **LULUS** | `uji_gui_fase36.ts` (`14.1`, `14.2`) |
| 8 | Eksekusi & render 7 aplikasi demo desktop NUSANTARA nyata via `Interpreter` | **LULUS** | `uji_gui_fase36.ts` (`10.1`, `10.2`, `10.3`) |
| 9 | Pengemas bundel Linux `.AppDir` / macOS `.app` / Windows `-win64` + verifikasi `SHA256SUMS` | **LULUS** | `uji_gui_fase36.ts` (`15.1`, `15.2`, `16.1`) |
| 10 | Pembukaan jendela grafis fisik OS (GTK3 X11/Wayland, Win32, Cocoa) pada display nyata | **NOT_VERIFIED** (lokal) | Container headless tidak memiliki X11/Wayland (`NATIVE_DISPLAY_UNAVAILABLE`); disiapkan untuk runner ber-display / Xvfb |
