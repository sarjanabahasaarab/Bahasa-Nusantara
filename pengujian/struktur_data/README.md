# Pengujian Struktur Data Bahasa NUSANTARA (Phase 14)

Modul ini memuat rangkaian pengujian komprehensif untuk struktur data dasar bahasa **NUSANTARA** (`daftar` dan `peta`) sesuai spesifikasi tata bahasa resmi.

## Cakupan Pengujian:
1. **Pembuatan & Inisialisasi Koleksi:**
   - Literal daftar (`[10, 20, 30]`, `["merah", "putih"]`).
   - Literal daftar kosong (`[]`).
   - Literal peta dengan kunci string (`{"nama": "Ayu", "umur": 20}`).
   - Literal peta dengan kunci identifier (`{nama: "Budi", nilai: 95}`).
   - Literal peta kosong (`{}`).
   - Struktur bersarang: daftar 2D (matriks) dan peta bersarang (nested maps).
2. **Akses Elemen & Pembacaan Indeks (0-Indexed):**
   - Akses elemen daftar pertama (`angka[0]`), tengah, dan akhir (`angka[n-1]`).
   - Akses nilai kunci peta (`siswa["nama"]`).
   - Akses berantai pada struktur bertingkat (`matriks[0][1]`, `pegawai["identitas"]["nama"]`).
3. **Mutasi & Pembaruan Elemen:**
   - Penugasan elemen daftar pada indeks tertentu (`angka[1] = 99`).
   - Penugasan elemen pada daftar bersarang (`matriks[0][1] = 500`).
   - Pembaruan nilai kunci peta (`data["skor"] = 100`).
   - Penambahan pasangan kunci baru ke dalam peta (`kamus["id"] = "NX-01"`).
   - Penegakan aturan mutabilitas: menolak perubahan pada variabel koleksi yang ditandai sebagai konstanta `tetap` (`MODIFIKASI_TETAP` / `KONSTANTA_DIUBAH`).
4. **Fungsi Bawaan Koleksi:**
   - Evaluasi fungsi bawaan `panjang(...)` untuk menghitung jumlah elemen daftar dan pasangan kunci-nilai peta.
5. **Operator Kesetaraan Koleksi (Deep Equality):**
   - Operator kesetaraan `==` dan `!=` pada daftar dan peta secara rekursif mendalam.
6. **Keamanan & Diagnostik Runtime:**
   - Indeks daftar di luar batas (`BATAS_INDEKS_TERLAMPAUI`).
   - Indeks daftar negatif (`BATAS_INDEKS_TERLAMPAUI`).
   - Kunci peta tidak ditemukan (`KUNCI_TIDAK_DITEMUKAN`).
   - Validasi tipe statis: indeks daftar wajib bilangan bulat (`INDEKS_TIDAK_SESUAI`).
   - Validasi tipe statis: kunci peta wajib teks (`INDEKS_TIDAK_SESUAI`).
   - Validasi tipe statis: penolakan pengindeksan pada tipe data skalar non-koleksi (`TIPE_BUKAN_KOLEKSI`).
7. **Integrasi Alur Komputasi:**
   - Struktur data sebagai argumen dan nilai kembalian fungsi.
   - Struktur data dalam perulangan `untuk` dan `selama`.
   - Struktur data dalam percabangan `jika` dan evaluasi logika.
   - Program integrasi pipeline penuh dari sumber teks `.nusantara` hingga runtime output.

## Cara Menjalankan Pengujian:
```bash
npm run test:struktur-data
# atau seluruh pengujian
npm test
```
