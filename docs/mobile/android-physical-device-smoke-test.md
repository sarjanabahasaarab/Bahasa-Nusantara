# Android Physical Device Smoke Test

Dokumen ini mencatat pengujian manual yang benar-benar dilakukan pada perangkat Android Infinix oleh pengguna. Hasil yang belum diuji tidak boleh ditandai PASS.

## Hasil manual yang dikonfirmasi pengguna

| Pengujian | Hasil | Bukti |
|---|---|---|
| Membuka halaman Beranda | PASS | Konfirmasi pengguna di percakapan |
| Membuka Editor | PASS | Konfirmasi pengguna di percakapan |
| Menyimpan berkas `.nusantara` | PASS | Konfirmasi pengguna di percakapan |
| Membuka Terminal dan menjalankan perintah `help` | PASS | Konfirmasi pengguna di percakapan |

Catatan: model perangkat, versi Android, ABI, versi APK, dan checksum APK yang diuji belum dikonfirmasi oleh pengguna. Jangan mengasumsikan detail tersebut.

## Pengujian lanjutan yang harus dilakukan

1. Ketik beberapa baris program di Editor, pindah ke Beranda, lalu kembali ke Editor. Pastikan draf tidak hilang.
2. Ketik teks baru, tekan Home perangkat, buka kembali aplikasi. Pastikan draf tersimpan.
3. Tutup aplikasi dari daftar aplikasi terbaru, lalu buka kembali. Pastikan berkas terakhir tetap tersedia.
4. Buka Berkas, pilih berkas yang telah disimpan, dan periksa isi berkas.
5. Jalankan perintah terminal `version`, `echo Uji NUSANTARA`, `clear`, dan perintah tidak dikenal.
6. Putar orientasi layar bila perangkat mengizinkan; periksa apakah draf tetap ada.
7. Gunakan aplikasi selama 15 menit dan amati crash, layar kosong, atau kehilangan data.
8. Tekan tombol Editor `Jalankan`. Sampai interpreter Android tersedia, aplikasi wajib memberi pesan bahwa runtime belum tersedia dan tidak boleh mengklaim program berhasil dijalankan.

## Status fitur

- Native navigation, editor teks, penyimpanan privat, dan terminal perintah dasar: tersedia dan telah diuji manual pada tingkat smoke test awal.
- Autosave draf lintas navigasi dan lifecycle: menunggu build dan pengujian ulang PR.
- Eksekusi program, debugger, dan runtime interpreter di Android: BELUM TERSEDIA.
- Kamera, lokasi, sensor, Bluetooth, biometrik, dan integrasi perangkat fisik: BELUM DIUJI.

## Format laporan lanjutan

Catat tanggal, model perangkat, versi Android, versi aplikasi/build SHA, hasil PASS/FAIL, dan langkah untuk mereproduksi setiap kegagalan. Jangan sertakan token, kata sandi, atau data pribadi dalam log.
