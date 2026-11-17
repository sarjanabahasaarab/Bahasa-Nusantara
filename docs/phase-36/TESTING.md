# Dokumentasi Pengujian Phase 36 (`pengujian/gui/uji_gui_fase36.ts`)

## 1. Perintah Pengujian
```bash
npm run test:gui-v36
```

## 2. Cakupan Skenario (`22/22 LULUS`)
1. `1.1` Manajemen Lifecycle & Transisi Status Aplikasi
2. `1.2` `EventLoopGUI` Antrean Tugas & Tick Processing
3. `2.1` Pembuatan & Konfigurasi `JendelaGUI` (min/max clamping, minimize/maximize/restore/close)
4. `3.1` Widget Dasar (`LabelWidget`, `TombolWidget`, `InputTeksWidget`, `AreaTeksWidget`)
5. `3.2` Widget Lanjutan (`KotakCentang`, `TombolRadio`/`GrupRadio`, `PilihanDropdown`, `Tabel`, `Progres`, `Slider`)
6. `4.1` Komposisi Layout (`Kolom`, `Baris`, `Grid`, `Stack`, `Gulir`, serialisasi pohon)
7. `5.1` `BilahMenu`, `ItemMenu`, `BilahAlat`, dan `PengelolaDialogGUI`
8. `6.1` `PengelolaTema` (`terang`, `gelap`, `kontras_tinggi`) dan Aksesibilitas ARIA + shortcut OS
9. `7.1` `PengelolaFormGUI` Validasi Field
10. `8.1` `AdaptorHeadlessGUI` & `JembatanDesktopWebview`
11. `9.1` Pendaftaran Template Proyek `"desktop"` di `TemplateRegistry`
12. `10.1` Eksekusi `contoh/desktop/demo_desktop.nusantara` via `Interpreter`
13. `10.2` Eksekusi `contoh/desktop/aplikasi_kasir.nusantara` via `Interpreter`
14. `10.3` Eksekusi & Render Nyata Seluruh 7 Aplikasi Demo Desktop NUSANTARA (BMP, SVG, HTML termasuk `<table>`, `<progress>`, tab)
15. `11.1` `MesinTataLetak` koordinat flex/grid/menu/tab & hit-testing koordinat
16. `12.1` `KanvasFramebuffer` & `PerenderDesktop` (header biner BMP `BM`, PPM `P6`, SVG, perbedaan hash tema terang vs gelap)
17. `13.1` `PengelolaInputGUI` (klik koordinat, input keyboard, Backspace, Tab traversal, Space toggle, slider seek, shortcut `Ctrl+S`)
18. `14.1` `AdaptorDesktopWebviewServer` HTTP HTML & IPC WebSocket nyata pada loopback TCP `127.0.0.1`
19. `14.2` Keamanan WebView Server (header `X-Frame-Options: DENY`, `Content-Security-Policy`, anti-XSS judul, penolakan CSWSH Origin eksternal, kontrol slider IPC)
20. `15.1` Detektor OS, generator C GTK3 / Win32 / Swift Cocoa, pelaporan jujur `NATIVE_DISPLAY_UNAVAILABLE`, dan pengemasan AppDir/`.app`/Win32
21. `15.2` Verifikasi integritas `SHA256SUMS` (`verifikasiBundel` utuh & penolakan tamper), escaping XML `Info.plist`, dan sanitasi ID aplikasi pada kode C GTK3
22. `16.1` CLI `nusantara desktop check|render|package|run` serta penolakan kode keluar `1` untuk berkas yang tidak ada
