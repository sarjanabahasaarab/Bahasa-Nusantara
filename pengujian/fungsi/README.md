# Pengujian Sistem Fungsi Bahasa NUSANTARA (Phase 13)

Modul ini memuat rangkaian pengujian komprehensif untuk sistem fungsi dan prosedur bahasa **NUSANTARA** sesuai spesifikasi tata bahasa resmi.

## Cakupan Pengujian:
1. **Parser Sintaksis:**
   - Deklarasi fungsi dengan parameter tunggal dan banyak parameter.
   - Fungsi dengan tipe kembalian dan prosedur tanpa tipe kembalian.
   - Parsing ekspresi pemanggilan fungsi dan pernyataan pemanggilan prosedur.
   - Parsing instruksi `kembalikan` dengan dan tanpa ekspresi.
   - Diagnostik kesalahan sintaksis: koma berlebih, parameter tak valid, blok tidak ditutup `selesai`.
2. **Sistem Tipe (Type System):**
   - Validasi kompatibilitas tipe parameter vs argumen.
   - Validasi jumlah argumen pemanggilan fungsi.
   - Validasi tipe ekspresi `kembalikan` terhadap tipe kembalian fungsi.
   - Deteksi fungsi dengan tipe hasil tanpa instruksi `kembalikan`.
   - Deteksi pemanggilan fungsi yang tidak terdaftar (`FUNGSI_TIDAK_DITEMUKAN`).
   - Deteksi deklarasi parameter ganda dan nama fungsi ganda.
   - Pencegahan penimpaan nama fungsi bawaan `tampilkan`.
   - Pencegahan instruksi `kembalikan` di luar fungsi.
3. **Interpreter & Lingkungan Eksekusi:**
   - Eksekusi fungsi dengan nilai kembali dan prosedur tanpa nilai kembali.
   - Evaluasi argumen dan pengikatan parameter leksikal.
   - Isolasi variabel lokal dan parameter (tidak bocor ke lingkungan luar).
   - Pemanggilan fungsi antar-fungsi (nested function calls).
   - Rekursi dengan tumpukan bingkai terpisah.
   - Proteksi kedalaman rekursi (*stack overflow protection*).
   - Penelusuran jejak tumpukan (*stack trace*) saat galat runtime.
4. **Integrasi Pipeline Penuh:**
   - Menjalankan kode sumber utuh melalui alur `Lexer` ➔ `Parser` ➔ `PemeriksaTipe` ➔ `Interpreter`.

## Cara Menjalankan Pengujian:
```bash
npm run test:fungsi
# atau seluruh pengujian
npm test
```
