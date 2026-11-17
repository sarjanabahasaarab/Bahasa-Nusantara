# Laporan Sertifikasi Teknis — Phase 36 (Desktop GUI Framework)

- **Proyek:** NUSANTARA Programming Language (`v0.50.0`)
- **Repositori / Branch:** `https://github.com/sarjanabahasaarab/Bahasa-Nusantara.git` / `main`
- **Waktu Audit Lokal:** `2026-11-17`
- **Host / OS / Arsitektur:** Linux `4.19.0` (gVisor) `x86_64`, Node.js `v22.23.2`, npm `10.9.8`
- **Status Server Tampilan Lokal:** `displayServer: none`, `displayAktif: false`, `pkgConfig: false`, `gtk3: false`, `tkinter: false`

## 1. Perintah Verifikasi & Hasil Aktual
| Perintah | Exit Code | Ringkasan Hasil Aktual |
| :--- | :---: | :--- |
| `npm run lint` (`tsc --noEmit`) | `0` | Typecheck TypeScript bersih tanpa galat |
| `npm run test:gui-v36` | `0` | **22/22 LULUS** (0 GAGAL) |

## 2. Perbaikan & Peningkatan yang Diselesaikan
1. **Keamanan WebView Server (`src/gui/platform/webview_server.ts`)**:
   - Menambahkan proteksi origin WebSocket `verifyClient` untuk mencegah CSWSH dari situs web eksternal, batas `maxPayload` 256 KiB, header HTTP keamanan (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`), penjagaan anti-prototype-pollution, serta penanganan peristiwa lengkap untuk slider, tab, dropdown, tabel, dan radio button.
2. **Paritas & Sanitasi Perender (`src/gui/render/renderer.ts`, `src/gui/render/framebuffer.ts`)**:
   - Memperluas `renderWidgetKeHTML` dan `renderKeSVG` untuk merender seluruh tipe widget (termasuk `tabel`, `daftar`, `pilihan`, `tab`, `area_teks`, `tombol_radio`, `slider`, `gambar`, `grid`, `gulir`), menambahkan `safeCssColor` & `safeImageSrc`, serta melengkapi glif ASCII pada framebuffer.
3. **Keamanan Host Native & Pengemas (`src/gui/platform/native_desktop.ts`, `src/gui/packaging/desktop_packager.ts`)**:
   - Memperketat escaping literal C/Swift dan sanitasi `idAplikasi`; menghapus fallback hash FNV-1a pada `desktop_packager.ts` (mewajibkan `SHA-256` asli `crypto`), menambahkan XML/shell escaping, dan menambahkan `verifikasiBundel()`.
4. **Stdlib, CLI & 7 Aplikasi Demo (`src/stdlib/gui.ts`, `src/paket/cli.ts`, `contoh/desktop/`)**:
   - Melengkapi binding `bilahAlat` serta metode jendela pada `std:gui`; mengembalikan kode keluar `1` saat berkas argumen `nusantara desktop` tidak ditemukan; menambahkan 5 aplikasi demo baru sehingga seluruh **7 aplikasi demo desktop** (`demo_desktop`, `aplikasi_kasir`, `kalkulator_desktop`, `catatan_teks`, `manajer_tugas`, `dashboard_sistem`, `pengaturan_akun`) dieksekusi dan dirender nyata.

## 3. Batasan Kejujuran Teknis (`NOT_VERIFIED` Lokal)
- Pembukaan jendela grafis fisik OS (X11/Wayland GTK3, Win32, macOS Cocoa) belum dapat diverifikasi di container headless karena ketiadaan display server dan SDK GTK3 (`NATIVE_DISPLAY_UNAVAILABLE`).

## 4. Klasifikasi Status Akhir Phase 36
- **Status Lokal:** **`PARTIAL`** *(Seluruh komponen logika GUI, mesin tata letak, rasterizer BMP/PPM/SVG/HTML, HTTP/WebSocket host IPC, keamanan, 7 aplikasi demo, dan pengemasan lintas target lulus 100% [`22/22`]; eksekusi visual pada server tampilan fisik X11/Wayland/Win32/Cocoa berstatus jujur `NOT_VERIFIED` menunggu runner CI dengan display / Xvfb).*
