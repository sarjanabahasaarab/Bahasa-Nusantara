# Tabel Kata Kunci Resmi Bahasa NUSANTARA

Dokumen ini memuat daftar lengkap kata kunci (*keywords*) yang dicadangkan dalam tata bahasa NUSANTARA. Kata kunci tidak boleh digunakan sebagai pengidentifikasi (*identifier*) untuk nama program, variabel, fungsi, atau kelas.

Status:
- **[DITETAPKAN]:** Sintaks dan semantiknya telah disepakati sebagai acuan konstitusi sejak Phase 1 dan Phase 2.
- **[RANCANGAN]:** Konstruksi leksikal telah dicadangkan, namun semantik operasionalnya akan disahkan pada fase spesifikasi sintaksis dan implementasi terkait.

---

## Daftar Kata Kunci Awal

| Kata Kunci | Arti Linguistik | Fungsi Komputasi | Contoh Penggunaan | Status | Fase Terkait |
|---|---|---|---|---|---|
| `program` | Acara / Rencana | Menandai deklarasi nama unit program utama | `program Halo` | **[DITETAPKAN]** | Phase 1 & 2 |
| `mulai` | Awal tindakan | Membuka blok eksekusi instruksi | `mulai` | **[DITETAPKAN]** | Phase 1 & 2 |
| `selesai` | Akhir tindakan | Menutup blok utama program atau fungsi | `selesai` | **[DITETAPKAN]** | Phase 1 & 2 |
| `variabel` | Dapat berubah | Mendeklarasikan wadah data yang dapat diubah nilainya | `variabel skor : bilangan = 10` | **[DITETAPKAN]** | Phase 9 |
| `tetap` | Tidak berubah | Mendeklarasikan wadah data konstan (*immutable*) | `tetap PHI : desimal = 3.14159` | **[DITETAPKAN]** | Phase 9 |
| `fungsi` | Tindakan / Khasiat | Mendeklarasikan subrutin atau fungsi komputasi | `fungsi hitung() : bilangan` | **[DITETAPKAN]** | Phase 13 |
| `kembalikan` | Mengirim kembali | Mengembalikan nilai dari fungsi ke pemanggil | `kembalikan a + b` | **[DITETAPKAN]** | Phase 13 |
| `jika` | Pengandaian | Menguji kebenaran kondisi logis | `jika nilai >= 75 maka` | **[DITETAPKAN]** | Phase 11 |
| `maka` | Akibat logis | Membuka blok instruksi jika kondisi bernilai benar | `jika benar maka` | **[DITETAPKAN]** | Phase 11 |
| `selain` | Pilihan lain | Membuka blok instruksi alternatif jika kondisi salah | `selain` | **[DITETAPKAN]** | Phase 11 |
| `akhir` | Batas penutup | Menutup blok kendali percabangan atau perulangan | `akhir` | **[DITETAPKAN]** | Phase 11 & 12 |
| `selama` | Rentang waktu | Melakukan perulangan selama kondisi bernilai benar | `selama aktif lakukan` | **[DITETAPKAN]** | Phase 12 |
| `untuk` | Tujuan alokasi | Melakukan perulangan iteratif berpenghitung rentang | `untuk i dari 1 sampai 10 lakukan` | **[DITETAPKAN]** | Phase 12 |
| `dari` | Asal mula | Menentukan batas bawah rentang perulangan | `dari 1 sampai 10` | **[DITETAPKAN]** | Phase 12 |
| `sampai` | Batas akhir | Menentukan batas atas rentang perulangan | `sampai 100 lakukan` | **[DITETAPKAN]** | Phase 12 |
| `lakukan` | Melaksanakan | Membuka blok instruksi perulangan | `lakukan` | **[DITETAPKAN]** | Phase 12 |
| `hentikan` | Memutus proses | Keluar paksa dari perulangan (*break*) | `hentikan` | **[DITETAPKAN]** | Phase 12 |
| `lanjutkan` | Meneruskan | Melompati sisa blok ke iterasi berikutnya (*continue*) | `lanjutkan` | **[DITETAPKAN]** | Phase 12 |
| `benar` | Kenyataan positif | Literal logika boolean bernilai benar (*true*) | `aktif : logika = benar` | **[DITETAPKAN]** | Phase 9 |
| `salah` | Kenyataan negatif | Literal logika boolean bernilai salah (*false*) | `selesai : logika = salah` | **[DITETAPKAN]** | Phase 9 |
| `kosong` | Hampa / Tiada | Representasi ketiadaan nilai (*null/void*) | `data : kosong = kosong` | **[DITETAPKAN]** | Phase 9 |
| `coba` | Menguji potensi | Membuka blok pengawasan eksepsi/kesalahan | `coba` | **[RANCANGAN]** | Phase 18 |
| `tangkap` | Memegang galat | Menangkap objek kesalahan yang terjadi | `tangkap galat maka` | **[RANCANGAN]** | Phase 18 |
| `lempar` | Melontarkan | Menerbitkan kesalahan ke penangan tumpukan | `lempar "Koneksi gagal"` | **[RANCANGAN]** | Phase 18 |
| `impor` | Membawa masuk | Memuat modul atau pustaka eksternal | `impor standar.matematika` | **[RANCANGAN]** | Phase 15 |
| `buat` | Menjadikan | Mengalokasikan struktur data atau objek baru | `buat peta()` | **[RANCANGAN]** | Phase 14 |
| `kelas` | Golongan objek | Mendeklarasikan cetak biru objek (OOP) | `kelas Pengguna` | **[RANCANGAN]** | Phase 16 |
| `umum` | Akses terbuka | Penentu akses publik untuk properti/metode | `umum nama : teks` | **[RANCANGAN]** | Phase 16 |
| `pribadi` | Akses tertutup | Penentu akses privat terisolasi di dalam kelas | `pribadi kataSandi : teks` | **[RANCANGAN]** | Phase 16 |
| `lindungi` | Akses terlindung | Penentu akses terproteksi (dapat diwariskan) | `lindungi saldo : bilangan` | **[RANCANGAN]** | Phase 17 |
| `baru` | Wujud segar | Menginstansiasi objek dari kelas | `user = baru Pengguna()` | **[RANCANGAN]** | Phase 16 |
| `hapus` | Meniadakan | Menghapus alokasi memori atau elemen kumpulan | `hapus antrean` | **[RANCANGAN]** | Phase 14 & 36 |

---

## Catatan Disiplin Fase

Kata kunci berstatus **[RANCANGAN]** telah dicadangkan dalam kamus leksikal bahasa agar tidak digunakan secara bebas oleh komunitas, namun rincian semantik dan tata bahasa formalnya baru akan dibahas dan disahkan pada fase implementasi yang bersangkutan sesuai dokumen [ROADMAP.md](../ROADMAP.md).
