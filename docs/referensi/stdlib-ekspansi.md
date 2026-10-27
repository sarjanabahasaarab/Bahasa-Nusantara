# Dokumentasi Resmi: Ekspansi Standard Library & System API (Fase 28)

**Versi Target:** `v0.28.0`  
**Bahasa:** NUSANTARA (`.nusantara`)  
**Lisensi:** Apache-2.0

---

## 1. Ikhtisar Arsitektur Standard Library

Fase 28 memperluas Standard Library NUSANTARA dengan menyediakan API sistem tingkat lanjut yang aman, deterministik, dan portabel lintas sistem operasi (Linux, Windows, macOS, dan Web Runtime).

Standard library didesain dengan prinsip:
1. **Satu Registry Terpadu**: Terdaftar di `KATALOG_MODUL_STANDAR` (`src/stdlib/`).
2. **Pemuatan Konsisten**: Dapat diimpor menggunakan sintaks resmi:
   ```nusantara
   gunakan "jalur" sebagai jalur
   gunakan "json" sebagai json
   gunakan "kripto" sebagai kripto
   gunakan "proses" sebagai proses
   gunakan "jaringan" sebagai jaringan
   gunakan "lingkungan" sebagai lingkungan
   ```
3. **Keamanan Eksekusi**:
   - Mencegah Path Traversal di modul berkas dan jalur.
   - Mencegah Command Injection (CWE-78) di modul proses melalui larik argumen eksplisit (`argv` array) tanpa shell concatenation.
   - Constant-time comparison di modul kripto untuk mencegah serangan timing side-channel.
   - Domain validation pada fungsi matematika (pembagian nol, akar negatif, domain logaritma).

---

## 2. Modul Baru Fase 28

### A. Modul Jalur (`std:jalur`)
Manipulasi jalur berkas (path) lintas platform (Windows `\` dan POSIX `/`):
- `jalur.gabung(...bagian: teks): teks`: Menggabungkan beberapa segmen jalur dengan pembersihan `.` dan `..`.
- `jalur.normalisasi(jalur: teks): teks`: Menormalkan tanda pemisah direktori ganda dan segmen relatif.
- `jalur.ekstensi(jalur: teks): teks`: Mengambil ekstensi berkas lengkap dengan titik (contoh: `.nusantara`).
- `jalur.namaBerkas(jalur: teks, buangEkstensi?: teks | logika): teks`: Mengambil nama berkas (basename).
- `jalur.direktoriInduk(jalur: teks): teks`: Mengambil jalur direktori induk (dirname).
- `jalur.apakahAbsolut(jalur: teks): logika`: Memeriksa apakah jalur merupakan jalur absolut (`/` atau `C:\`).
- `jalur.pemisah(): teks`: Mengembalikan pemisah direktori aktif host (`/` atau `\`).

### B. Modul JSON (`std:json`)
Serialisasi dan deserialisasi JSON dengan pemetaan tipe data resmi Nusantara:
- `json.urai(teksJson: teks): apapun`: Mengurai string JSON menjadi struktur Nusantara:
  - Objek JSON `"{...}"` $\rightarrow$ `peta` (Map)
  - Larik JSON `"[...]"` $\rightarrow$ `daftar` (Array)
  - String $\rightarrow$ `teks`
  - Angka bulat $\rightarrow$ `bilangan`, pecahan $\rightarrow$ `desimal`
  - Boolean $\rightarrow$ `logika` (`benar` / `salah`)
  - Null $\rightarrow$ `kosong`
- `json.cetak(nilai: apapun, spasi?: bilangan): teks`: Mengonversi nilai runtime menjadi string JSON terformat rapi.
- `json.apakahValid(teksJson: teks): logika`: Memeriksa keabsahan format sintaks JSON tanpa melempar pengecualian galat.

### C. Modul Lingkungan (`std:lingkungan`)
Akses aman ke variabel lingkungan host:
- `lingkungan.ambil(kunci: teks): teks | kosong`: Mengambil nilai variabel lingkungan.
- `lingkungan.tetapkan(kunci: teks, nilai: teks): logika`: Menetapkan atau menimpa variabel lingkungan.
- `lingkungan.ada(kunci: teks): logika`: Memeriksa keberadaan variabel.
- `lingkungan.semua(): peta`: Mengembalikan seluruh variabel lingkungan dalam bentuk peta kunci-nilai terisolasi.
- `lingkungan.direktoriKerja(): teks`: Mengembalikan direktori kerja saat ini (`process.cwd()`).

### D. Modul Proses (`std:proses`)
Eksekusi sub-proses terisolasi:
- `proses.eksekusi(perintah: teks, argumen?: daftar, opsi?: peta): peta`:
  - `perintah`: Nama biner executable.
  - `argumen`: Daftar argumen baris perintah terpisah (tanpa shell string concat).
  - `opsi`: `batasWaktuMs` (timeout), `direktoriKerja` (cwd), `env` (variabel kustom).
  - Mengembalikan peta:
    - `kodeKeluar: bilangan` (exit code)
    - `stdout: teks` (keluaran standar)
    - `stderr: teks` (keluaran galat)
    - `sukses: logika` (`kodeKeluar == 0`)
- `proses.pid(): bilangan`: Mengembalikan nomor process ID runtime saat ini.

### E. Modul Jaringan (`std:jaringan`)
Komunikasi jaringan HTTP:
- `jaringan.ambil(url: teks, opsi?: peta): peta`: Melakukan permintaan HTTP GET.
- `jaringan.kirim(url: teks, tubuh: teks, opsi?: peta): peta`: Melakukan permintaan HTTP POST.
- Mengembalikan peta respon:
  - `status: bilangan` (misal 200, 201, 404, 500)
  - `statusTeks: teks` (misal "OK", "Created")
  - `tubuh: teks` (isi respon payload)
  - `header: peta` (header respon HTTP)
  - `sukses: logika` (`status >= 200 && status < 300`)
  - `galat: teks | kosong`
- Dilengkapi pendukung mock dispatcher (`tetapkanPengirimHTTPMock`) untuk pengujian otomatis mandiri tanpa koneksi internet.

### F. Modul Kripto (`std:kripto`)
Fungsi keamanan kriptografi terintegrasi:
- `kripto.sha256(pesan: teks): teks`: Menghasilkan intisari (hash digest) SHA-256 heksadesimal 64-karakter.
- `kripto.md5(pesan: teks): teks`: Menghasilkan hash MD5 heksadesimal 32-karakter.
- `kripto.byteAcak(panjang: bilangan): teks`: Menghasilkan byte acak CSPRNG (Cryptographically Secure Pseudo-Random Number Generator) dalam format heksadesimal.
- `kripto.bilanganAcak(min: bilangan, max: bilangan): bilangan`: Pembangkit bilangan bulat acak kriptografis dalam rentang `min` hingga `max`.
- `kripto.bandingkanWaktuKonstan(a: teks, b: teks): logika`: Pembandingan string waktu konstan untuk mengamankan verifikasi token, HMAC, dan password hash terhadap serangan timing attack.

---

## 3. Peningkatan Modul Yang Sudah Ada

### A. Modul Teks (`std:teks`)
- `teks.awalan(s: teks, awalan: teks): logika`: Memeriksa awalan string.
- `teks.akhiran(s: teks, akhiran: teks): logika`: Memeriksa akhiran string.
- `teks.pisah(s: teks, pemisah: teks): daftar`: Memecah teks menjadi larik elemen teks.
- `teks.panjangKarakter(s: teks): bilangan`: Menghitung jumlah Unicode code point nyata (mendukung emoji, karakter aksara daerah, dan simbol multi-byte).
- `teks.panjangByte(s: teks): bilangan`: Menghitung panjang byte UTF-8 sesungguhnya.
- `teks.apakahKosong(s: teks): logika`: Memeriksa apakah teks berpanjang 0.
- `teks.ulangi(s: teks, jumlah: bilangan): teks`: Mengulang string sebanyak $n$ kali.
- `teks.format(pola: teks, argumen: daftar): teks`: Format template berbasis indeks `{0}`, `{1}`.
- `teks.karakterPada(s: teks, indeks: bilangan): teks`: Mengambil karakter tunggal pada indeks tertentu dengan perlindungan rentang.

### B. Modul Koleksi (`std:koleksi`)
- `koleksi.ambil(koleksi: daftar | peta, indeksAtauKunci: apapun): apapun`: Akses elemen dengan pemeriksaan batas rentang (*bounds checking*).
- `koleksi.tambah(daftar: daftar, elemen: apapun): daftar`: Menambahkan elemen ke akhir daftar.
- `koleksi.tetapkan(peta: peta, kunci: teks, nilai: apapun): peta`: Menetapkan nilai kunci pada struktur peta.
- `koleksi.hapus(koleksi: daftar | peta, indeksAtauKunci: apapun): koleksi`: Menghapus elemen berdasarkan indeks daftar atau kunci peta.
- `koleksi.kunci(peta: peta): daftar`: Mengembalikan daftar seluruh kunci pada peta.
- `koleksi.nilai(peta: peta): daftar`: Mengembalikan daftar seluruh nilai pada peta.
- `koleksi.salin(koleksi: apapun): apapun`: Membuat salinan terisolasi dari koleksi.

### C. Modul Matematika (`std:matematika`)
- Konstanta: `PI`, `E`, `TAU` ($2\pi$), `INF` ($\infty$).
- Trigonometri: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`.
- Logaritma: `log` (natural), `log10` (basis 10), `exp`.
- Konversi sudut: `derajatKeRadian`, `radianKeDerajat`.
- Validasi domain: Pengecekan ketat pembagian dengan nol (`bagi`), akar negatif (`akar`), dan argumen logaritma $\le 0$.

### D. Modul Berkas (`std:berkas`)
- `berkas.hapus(jalur: teks): logika`: Menghapus berkas atau direktori dalam batasan sandbox aman.
- `berkas.apakahDirektori(jalur: teks): logika`: Memeriksa jenis simpul berkas.
- `berkas.salin(sumber: teks, tujuan: teks): logika`: Menyalin konten antar berkas secara aman.
- `berkas.metadata(jalur: teks): peta`: Mengembalikan informasi ukuran, keberadaan, dan jenis berkas.

### E. Modul Waktu (`std:waktu`)
- `waktu.milidetik(): bilangan`
- `waktu.timestampDetik(): bilangan`
- `waktu.tahun(): bilangan`, `waktu.bulan(): bilangan`, `waktu.hari(): bilangan`, `waktu.hariDalamMinggu(): bilangan`
- `waktu.urai(teksWaktu: teks): bilangan`: Mengurai string waktu ISO menjadi timestamp milidetik.
- `waktu.selisih(ts1: bilangan, ts2: bilangan): bilangan`: Menghitung durasi selisih antara dua timestamp.
- `waktu.tambahDetik(ts, detik)`, `waktu.tambahHari(ts, hari)`
- `waktu.komponen(ts?: bilangan): peta`: Mengembalikan komponen tanggal dalam bentuk peta lengkap.

### F. Modul Sistem (`std:sistem`)
- `sistem.direktoriKerja(): teks`
- `sistem.semuaEnv(): peta`
- `sistem.tetapkanEnv(kunci: teks, nilai: teks): logika`
- `sistem.infoHost(): peta`: Rincian arsitektur host, OS, versi rilis, dan label platform.
- `sistem.alokasiMemori(): peta`: Statistik pemakaian heap memory dan RSS.

---

## 4. Contoh Program Nyata NUSANTARA

```nusantara
program ContohEksosistemFase28
gunakan "jalur" sebagai jalur
gunakan "json" sebagai json
gunakan "kripto" sebagai kripto

mulai
    // 1. Jalur berkas aman
    jalurLengkap : teks = jalur.gabung("/var/data", "pengguna.json")
    tampilkan("Target Berkas:", jalurLengkap)

    // 2. Pemrosesan JSON
    payload : teks = "{\"pengguna\": \"nusantara\", \"aktif\": benar}"
    apakahValid : logika = json.apakahValid(payload)
    tampilkan("Status Validasi JSON:", apakahValid)

    // 3. Kriptografi
    token : teks = kripto.sha256("rahasia-sistem")
    tampilkan("Token SHA-256:", token)
selesai
```
