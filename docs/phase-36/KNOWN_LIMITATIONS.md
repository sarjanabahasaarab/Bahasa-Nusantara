# Keterbatasan yang Diketahui — Phase 36 (Desktop GUI Framework)

1. **Ketiadaan Display Server di Container Headless**:
   - Lingkungan container Linux saat ini tidak menjalankan server tampilan X11 (`DISPLAY` kosong) atau Wayland (`WAYLAND_DISPLAY` kosong), serta tidak memiliki `libgtk-3-dev`, `pkg-config`, maupun `xvfb-run`. Oleh karena itu, pembukaan jendela native OS secara fisik berstatus jujur `NATIVE_DISPLAY_UNAVAILABLE` (`NOT_VERIFIED` secara lokal).
2. **Kompilasi Biner C Host GTK3 dalam Bundel Linux**:
   - `PengemasAplikasiDesktop.kemas()` akan mengompilasi `usr/bin/<idAplikasi>` jika `pkg-config --exists gtk+-3.0` dan `gcc` tersedia pada host. Tanpa header `gtk+-3.0`, bundel tetap menyertakan kode sumber C GTK3 + `AppRun` + HTML5 + preview BMP dengan `statusKompilasiBiner: 'SKIPPED_NO_NATIVE_TOOLCHAIN'`.
3. **Font Rasterizer Software**:
   - `KanvasFramebuffer` menggunakan bitmap font ASCII 5x7 tersemat; karakter non-ASCII dirender sebagai glif fallback `?` pada output `.bmp`/`.ppm`, sedangkan output `.svg` dan `.html` mendukung penuh Unicode/UTF-8.
4. **Eksekusi Interaktif GUI Win32 & Cocoa**:
   - Peluncuran jendela fisik Win32/WinForms dan Swift Cocoa hanya dapat diverifikasi pada runner/mesin Windows dan macOS nyata.
