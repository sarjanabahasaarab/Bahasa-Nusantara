# Tabel Referensi 32 Kata Kunci Bahasa NUSANTARA

Daftar 32 kata leksikal resmi yang dicadangkan oleh bahasa **NUSANTARA**. Kata kunci ini tidak boleh digunakan sebagai nama pengidentifikasi variabel, fungsi, atau program.

---

## 1. Kata Kunci yang Telah [DITETAPKAN] (21 Kata Kunci)

| Kata Kunci | Makna & Fungsi Komputasi |
|---|---|
| `program` | Mendeklarasikan nama unit kompilasi utama |
| `mulai` | Membuka blok eksekusi pernyataan |
| `selesai` | Menutup blok utama program atau subrutin fungsi |
| `variabel` | Menandai deklarasi wadah data dinamis (*mutable*) secara eksplisit |
| `tetap` | Menandai wadah data konstan (*immutable*) yang nilainya tidak dapat diubah |
| `fungsi` | Mendeklarasikan subrutin / fungsi modular |
| `kembalikan` | Mengembalikan nilai dari eksekusi fungsi |
| `jika` | Memulai struktur pengujian kondisi percabangan |
| `maka` | Membuka blok instruksi jika kondisi `jika` bernilai benar |
| `selain` | Membuka blok instruksi alternatif jika kondisi bernilai salah |
| `akhir` | Menutup blok percabangan `jika` dan blok perulangan `untuk`/`selama` |
| `selama` | Membuka perulangan bersyarat kondisi kebenaran (*while loop*) |
| `untuk` | Membuka perulangan berpenghitung rentang (*for loop*) |
| `dari` | Menandai batas awal rentang perulangan `untuk` |
| `sampai` | Menandai batas akhir (inklusif) rentang perulangan `untuk` |
| `lakukan` | Membuka blok instruksi yang akan diulang dalam perulangan |
| `hentikan` | Menghentikan dan keluar dari perulangan seketika (*break*) |
| `lanjutkan` | Melompati iterasi saat ini menuju iterasi berikutnya (*continue*) |
| `benar` | Literal boolean untuk nilai kebenaran (*true*) |
| `salah` | Literal boolean untuk nilai kepalsuan (*false*) |
| `kosong` | Penanda ketiadaan nilai (*null/void*) |

---

## 2. Kata Kunci Cadangan yang Masih [RANCANGAN] (11 Kata Kunci)

Kata kunci ini telah dipesan sejak Phase 2 dan Phase 4 untuk kebutuhan fase-fase lanjutan (OOP, penanganan kesalahan, modul, dan manajemen memori), namun tata bahasa resminya belum difinalisasi:

| Kata Kunci | Rencana Penggunaan | Fase Rencana |
|---|---|---|
| `coba` | Membuka blok pengawasan eksepsi | Phase 18 (Penanganan Kesalahan) |
| `tangkap` | Menangkap dan menangani galat yang dilempar | Phase 18 |
| `lempar` | Melontarkan eksepsi secara sengaja | Phase 18 |
| `impor` | Memuat modul pustaka eksternal | Phase 15 (Modul & Namespace) |
| `buat` | Mengalokasikan struktur koleksi baru | Phase 14 (Struktur Data) |
| `kelas` | Mendefinisikan cetak biru objek OOP | Phase 16 (Kelas & Objek) |
| `umum` | Menandai hak akses publik (*public*) | Phase 16 |
| `pribadi` | Menandai hak akses privat (*private*) | Phase 16 |
| `lindungi` | Menandai hak akses terproteksi pewarisan (*protected*) | Phase 17 (Pewarisan) |
| `baru` | Instansiasi objek dari cetak biru kelas | Phase 16 |
| `hapus` | Dealokasi memori manual (tingkat rendah) | Phase 36 (Nusantara System) |
