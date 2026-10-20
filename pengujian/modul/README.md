# Pengujian Sistem Modul Bahasa NUSANTARA (Phase 15)

Modul ini memuat rangkaian pengujian komprehensif untuk subsistem modul bahasa **NUSANTARA** sesuai spesifikasi Phase 15.

## Cakupan Pengujian:
1. **Module Resolver & Keamanan Jalur (Path Resolution & Traversal):**
   - Modul ditemukan pada direktori basis proyek.
   - Modul tidak ditemukan menghasilkan galat deskriptif Bahasa Indonesia beserta daftar lokasi yang diperiksa.
   - Resolusi jalur relatif (`./modul.nusantara`).
   - Penolakan nama modul tidak valid / kosong.
   - Pencegahan serangan eksploitasi jalur direktori (*path traversal* `../`, `../../`).
   - Penanganan berkas modul duplikat.
2. **Parser & AST Modul:**
   - Sintaks deklarasi modul (`modul matematika`).
   - Sintaks penggunaan modul (`gunakan matematika`).
   - Sintaks impor dengan alias (`gunakan matematika sebagai mtk`).
   - Sintaks impor destrukturisasi (`impor { tambah } dari matematika`).
   - Sintaks deklarasi ekspor (`ekspor fungsi ...`, `ekspor tetap ...`).
   - Struktur simpul AST dan pelestarian lokasi sumber (*source coordinates*).
3. **Validasi Sistem Tipe (Type System):**
   - Resolusi fungsi anggota modul pada `PemeriksaTipe`.
   - Validasi kesesuaian tipe parameter modul.
   - Validasi tipe kembalian fungsi modul.
   - Enkapsulasi simbol internal: menolak akses ke pengenal internal modul dari luar.
   - Pesan galat tipe ramah: `argumen kedua pada 'matematika.tambah' harus bertipe bilangan`.
4. **Eksekusi Runtime Interpreter:**
   - Modul sederhana dan modul dengan fungsi.
   - Modul dengan beberapa fungsi dan konstanta data.
   - Modul digunakan oleh program utama.
   - Modul bertingkat: modul digunakan oleh modul lain (A → B → C).
   - Penggunaan struktur data (`daftar` dan `peta`) yang diekspor modul.
   - Pemuatan tunggal via cache: modul tidak diproses berulang kali.
5. **Ketergantungan Melingkar (Circular Dependency Detection):**
   - Deteksi siklus dua arah: A → B → A.
   - Deteksi siklus tiga arah: A → B → C → A.
   - Format pesan kesalahan Bahasa Indonesia menampilkan diagram jalur ketergantungan.
6. **Konteks Kesalahan Modul (Runtime Error Context):**
   - Pelaporan nama modul, nomor baris, dan nomor kolom saat terjadi kesalahan di dalam modul (contoh: pembagian dengan nol).
   - Jejak tumpukan pemanggilan (*stack trace*) dengan informasi modul.

## Cara Menjalankan Pengujian:
```bash
npm run test:modul
# atau seluruh pengujian
npm test
```
