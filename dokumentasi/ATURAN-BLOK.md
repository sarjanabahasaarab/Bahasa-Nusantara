# Spesifikasi Aturan Blok & Struktur Kontrol Bahasa NUSANTARA

Dokumen ini mendefinisikan pembatasan leksikal, tata cara pembukaan dan penutupan blok kontrol, serta semantik deklarasi variabel, percabangan, perulangan, dan fungsi dalam bahasa **NUSANTARA**.

Status: **[DITETAPKAN] — Acuan Formal Blok & Struktur Kontrol (Phase 4)**

---

## 1. Deklarasi, Inisialisasi, dan Penugasan

Dalam bahasa NUSANTARA, terdapat pembedaan tegas antara tiga konsep:

1. **Deklarasi:** Memperkenalkan nama pengidentifikasi dan tipe datanya ke dalam tabel simbol (*symbol table*).
2. **Inisialisasi:** Memberikan nilai awal pertama kali saat pengidentifikasi dideklarasikan.
3. **Penugasan Ulang (*Assignment*):** Mengganti nilai variabel yang sudah ada sebelumnya dengan nilai baru.

### Bentuk Sintaksis Resmi:
```nusantara
// A. Deklarasi + Inisialisasi Ringkas (Idiomatik)
nama : teks = "Nusantara"

// B. Deklarasi + Inisialisasi Eksplisit (Menggunakan kata kunci 'variabel')
variabel umur : bilangan = 20

// C. Deklarasi Nilai Tetap / Konstanta (Immutable)
tetap PHI : desimal = 3.14159

// D. Penugasan Ulang (Hanya sah untuk variabel yang sudah dideklarasikan)
nama = "Indonesia"
umur = 21

// PHI = 3.15 // KESALAHAN: Pengidentifikasi 'PHI' berstatus 'tetap'
```

---

## 2. Percabangan Kondisional (`jika`)

Struktur percabangan menggunakan pembatas leksikal eksplisit `jika` ... `maka` ... `akhir`:

```nusantara
jika kondisi maka
    // Instruksi jika kondisi benar
selain
    // Instruksi opsional jika kondisi salah
akhir
```

### Ketentuan Percabangan:
1. **Bagian `selain` Bersifat Opsional:** Blok `jika ... maka ... akhir` sah ditulis tanpa bagian `selain`.
2. **Penutup `akhir` Wajib:** Setiap pembukaan `jika` wajib ditutup secara berpasangan dengan `akhir`.
3. **Kondisi Bertingkat:** Kondisi bertingkat ditulis secara bersarang di dalam blok `selain`:
   ```nusantara
   jika nilai >= 90 maka
       predikat = "A"
   selain
       jika nilai >= 80 maka
           predikat = "B"
       selain
           predikat = "C"
       akhir
   akhir
   ```
   *(Catatan: Usulan kata kunci `selain_jika` dicatat dalam KEPUTUSAN-TERBUKA.md sebagai usulan proposal NIP masa depan).*

---

## 3. Perulangan Iteratif (`untuk` & `selama`)

### A. Perulangan Rentang Berpenghitung (`untuk`)
```nusantara
untuk angka dari 1 sampai 10 lakukan
    tampilkan(angka)
akhir
```
- **Batas Akhir Bersifat Inklusif:** `sampai 10` berarti perulangan mencakup angka `10`. Iterasi akan berjalan untuk nilai 1, 2, 3, 4, 5, 6, 7, 8, 9, dan 10.
- **Variabel Penghitung:** Pengidentifikasi `angka` otomatis dicakupkan di dalam blok perulangan dan bertipe `bilangan`.

### B. Perulangan Bersyarat (`selama`)
```nusantara
selama kondisi lakukan
    tampilkan("Berjalan")
akhir
```
- Perulangan berjalan terus menerus selama `kondisi` bernilai `benar`.

### C. Kendali Aliran: `hentikan` & `lanjutkan`
- **`hentikan` (*break*):** Menghentikan paksa perulangan terdekat dan melompat ke baris setelah kata kunci `akhir`.
- **`lanjutkan` (*continue*):** Melompati sisa instruksi pada iterasi saat ini dan langsung menuju iterasi berikutnya.

---

## 4. Definisi & Pemanggilan Fungsi

Fungsi dideklarasikan di tingkat teratas berkas menggunakan kata kunci `fungsi`, `mulai`, dan `selesai`:

```nusantara
fungsi tambah(a : bilangan, b : bilangan) : bilangan

mulai
    kembalikan a + b
selesai
```

### Ketentuan Fungsi:
1. **Fungsi Tanpa Nilai Kembali (*Procedure/Void*):** Anotasi `: tipe` ditiadakan jika fungsi tidak mengembalikan nilai:
   ```nusantara
   fungsi cetakSalam(pesan : teks)

   mulai
       tampilkan(pesan)
   selesai
   ```
2. **Fungsi Tanpa Parameter:** Ditulis dengan tanda kurung kosong `()`:
   ```nusantara
   fungsi dapatkanTahun() : bilangan

   mulai
       kembalikan 2026
   selesai
   ```
3. **Instruksi `kembalikan`:** Mengirimkan nilai kembali ke pemanggil dan segera keluar dari eksekusi fungsi.
