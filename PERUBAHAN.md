# Catatan Perubahan (CHANGELOG) NUSANTARA

Seluruh perubahan penting pada proyek bahasa pemrograman NUSANTARA dicatat dalam dokumen ini.

Format penomoran versi mengacu pada **Semantic Versioning** (`vMAJOR.MINOR.PATCH`). Pada masa pengembangan awal, versi minor mencerminkan tahapan fase roadmap (misal `v0.1.0` untuk Phase 1, `v0.2.0` untuk Phase 2, `v0.3.0` untuk Phase 3, `v0.4.0` untuk Phase 4, `v0.5.0` untuk Phase 5, `v0.6.0` untuk Phase 6, `v0.7.0` untuk Phase 7, `v0.8.0` untuk Phase 8, `v0.9.0` untuk Phase 9, `v0.10.0` untuk Phase 10).

## [v0.19.0] — 2026-10-22
### Phase 19: Toolchain & Formatter NUSANTARA

Fase ini mengimplementasikan toolchain terpadu bahasa pemrograman NUSANTARA yang mencakup formatter resmi berbasis AST (*Abstract Syntax Tree*), protokol keselamatan *safety check* (re-parsing), linter statis dengan rule ID stabil (`NUS-W001`..`NUS-W004`), konfigurasi berkas `nusantara.toml` (`[format]`), dan pemeriksa proyek/berkas (`nusantara cek`).

#### Ditambahkan:
- **Subsistem Toolchain (`src/toolchain/`):**
  - `src/toolchain/konfigurasi.ts`: Antarmuka `KonfigurasiFormat`, nilai baku (`indentasi: 4`, `panjangBaris: 100`, `pertahankanKomentar: benar`), dan parser konfigurasi dari manifest `nusantara.toml`.
  - `src/toolchain/formatter.ts`: Implementasi `FormatterNUSANTARA`, `formatKode()`, `formatAman()`, serta AST pretty-printer untuk seluruh simpul program, fungsi, percabangan, perulangan, koleksi, dan modul.
  - `src/toolchain/linter.ts`: Mesin `LinterNUSANTARA` dengan aturan diagnostik peringatan:
    - `NUS-W001`: Variabel tidak pernah digunakan (mendukung pengecualian awalan `_`).
    - `NUS-W002`: Kode yang tidak pernah dieksekusi (*unreachable code*).
    - `NUS-W003`: Perbandingan variabel dengan dirinya sendiri.
    - `NUS-W004`: Simbol impor tidak pernah digunakan.
  - `src/toolchain/pemeriksa.ts`: Mesin `PemeriksaProyek` untuk validasi berkas tunggal (`periksaBerkas`) dan validasi menyeluruh struktur proyek (`periksaProyek`) yang memeriksa manifes, lockfile, sintaksis parser, tipe statis, dan linter.
- **Perintah CLI Baru (`src/paket/cli.ts`):**
  - `nusantara format <berkas|direktori>`: Menghasilkan kode terformat ke terminal.
  - `nusantara format --tulis <berkas|direktori>` (atau `-w`): Menulis perubahan ke berkas secara aman setelah lolos *safety check*.
  - `nusantara format --cek <berkas|direktori>`: Memeriksa apakah berkas sudah rapi tanpa mengubahnya.
  - `nusantara cek [<berkas|direktori>]`: Memeriksa keabsahan kode dan manifes tanpa menjalankan program.
  - Opsi `--json`: Format diagnostik terstruktur untuk integrasi pihak ketiga.
- **Preservasi String & Komentar:**
  - `src/lexer/lexer.ts`: Dukungan pencatatan `KomentarSumber` dan fungsi `dapatkanDaftarKomentar()`.
  - Penenunan komentar baris penuh dan inline pada hasil pretty-printer.
- **Dokumentasi & Pengujian:**
  - `docs/referensi/formatter.md`, `docs/referensi/toolchain.md`, `docs/pengembang/formatter.md`.
  - `examples/toolchain/format-before.nusantara`, `examples/toolchain/format-after.nusantara`, `examples/toolchain/checker-example.nusantara`.
  - `pengujian/toolchain/uji_toolchain.ts`: 54 uji komprehensif (100% Lulus).

---

## [v0.18.0] — 2026-10-21
### Phase 18: Sistem Error & Debugging NUSANTARA
Implementasi sistem diagnostik ramah manusia dengan 12 kategori terstruktur, visual caret `^^^^`, saran saltik Levenshtein, dan pelacakan tumpukan (*stack trace*).

---

## [v0.17.0] — 2026-10-20
### Phase 17: Standard Library NUSANTARA
Implementasi 8 modul standar resmi (`teks`, `matematika`, `konversi`, `waktu`, `acak`, `koleksi`, `berkas`, `sistem`) dengan isolasi keamanan Sandbox Filesystem.

---

## [v0.16.0] — 2026-10-20
### Phase 16: Package Manager NUSANTARA (`nusantara`)
Implementasi pengelola paket resmi dengan manifest `nusantara.toml`, berkas kunci `nusantara.lock`, pencegahan siklus DFS, dan validasi SemVer.

---

## [v0.15.0] — 2026-10-19
### Phase 15: Sistem Modul NUSANTARA

Fase ini mengimplementasikan sistem modul dan manajemen ruang lingkup (*module system & namespace*) resmi bahasa NUSANTARA, memungkinkan pemecahan program menjadi beberapa berkas `.nusantara` independen yang terisolasi, terproteksi dari serangan eksploitasi direktori (*anti-path-traversal*), terlindungi dari pemuatan ganda melalui cache modul, serta memiliki deteksi ketergantungan melingkar (*circular dependency detection*).

#### Ditambahkan:
- **Subsistem Modul (`src/modul/`):**
  - `src/modul/jenisModul.ts`: Antarmuka `CatatanModul`, `InfoSimbolModul`, dan status siklus hidup `StatusPemuatanModul` (`BELUM_DIMUAT`, `SEDANG_DIMUAT`, `SUDAH_DIMUAT`, `GAGAL_DIMUAT`).
  - `src/modul/galatModul.ts`: Kelas `GalatModul` dengan taksonomi kesalahan Bahasa Indonesia (`MODUL_TIDAK_DITEMUKAN`, `KETERGANTUNGAN_MELINGKAR`, `NAMA_MODUL_TIDAK_VALID`, `JALUR_TIDAK_AMAN`, `ANGGOTA_TIDAK_DITEMUKAN`, `ANGGOTA_INTERNAL_TERLINDUNGI`, `MODUL_RUSAK`).
  - `src/modul/pembacaBerkas.ts`: Abstraksi `PembacaBerkas` dengan implementasi in-memory (`PembacaBerkasMemori`) untuk pengujian/lingkungan web dan Node.js fs (`PembacaBerkasNode`).
  - `src/modul/resolverModul.ts`: Resolver lokasi berkas aman dengan validasi batas direktori proyek dan proteksi anti-path-traversal (`../`, `../../`).
  - `src/modul/pemuatModul.ts`: Mesin pemuat modul dengan singleton cache, isolasi lingkup (*scope isolation*), parsing AST mandiri, eksekusi inisialisasi, dan ekstraksi ekspor.
  - `src/modul/index.ts`: Ekspor terpadu subsistem modul.
- **Sintaksis & Kata Kunci Baru:**
  - Kata kunci resmi `modul`, `gunakan`, `ekspor`, `sebagai`.
  - Deklarasi modul: `modul matematika`.
  - Deklarasi penggunaan modul: `gunakan matematika`.
  - Penggunaan modul dengan alias ruang nama: `gunakan matematika sebagai mtk`.
  - Penggunaan destrukturisasi impor: `impor { tambah, kali } dari matematika`.
  - Deklarasi ekspor: `ekspor fungsi tambah(...)`, `ekspor tetap PI : desimal = 3.14`.
- **Integrasi AST & Parser:**
  - Simpul AST baru: `NodeDeklarasiModul`, `NodePernyataanImpor`, `NodePernyataanEkspor`, `NodeAksesAnggota`.
  - Pemanggilan fungsi beranggota modul: `modul.fungsi(argumen)` dengan simpul `NodePemanggilanFungsi` yang memiliki atribut `target`.
- **Integrasi Sistem Tipe (Type System):**
  - Pendaftaran tabel modul pada `PemeriksaTipe`.
  - Validasi statis fungsi anggota modul, parameter, dan nilai kembalian.
  - Penolakan akses ke simbol internal modul dari luar (`ANGGOTA_INTERNAL_TERLINDUNGI`).
- **Integrasi Interpreter & Konteks Galat Runtime:**
  - Evaluasi `NilaiModul` dan akses anggota titik `.`.
  - Pelacakan konteks modul aktif pada eksekusi fungsi modul.
  - Pelaporan galat runtime dengan informasi modul, baris, dan kolom (`Modul: matematika.nusantara`, `Baris: 8`, `Kolom: 15`).
  - Jejak tumpukan pemanggilan (*stack trace*) antar-modul.
- **Contoh Program Acuan:**
  - `contoh/contoh_matematika.nusantara` (modul contoh matematika).
  - `contoh/contoh_teks.nusantara` (modul contoh teks).
  - `contoh/07_modul.nusantara` (program utama penggunaan modul).
- **Dokumentasi Resmi Sistem Modul:**
  - `docs/referensi/modul.md`: Panduan referensi sintaksis resmi sistem modul.
  - `docs/pengembang/modul.md`: Dokumentasi arsitektur dan teknis pemuat modul dan resolver.
- **Rangkaian Pengujian Modul (`pengujian/modul/`):**
  - `pengujian/modul/uji_modul.ts`: 24 pengujian unit dan integrasi komprehensif (100% Lulus).
  - `pengujian/modul/README.md`: Panduan eksekusi pengujian modul.

#### Diubah:
- `src/lexer/jenisToken.ts` & `src/lexer/keyword.ts`: Menambahkan token kata kunci `KW_MODUL`, `KW_GUNAKAN`, `KW_EKSPOR`, `KW_SEBAGAI`.
- `src/interpreter/nilai.ts`: Menambahkan jenis runtime `JenisNilaiRuntime.MODUL` dan antarmuka `NilaiModul`.
- `src/interpreter/galat.ts`: Menambahkan dukungan nama modul dan format jejak tumpukan berkonteks modul pada `GalatRuntime`.
- `src/operator/evaluasi.ts`: Menambahkan parameter `namaModul` untuk pelaporan galat runtime pembagian dengan nol.
- `package.json`: Menambahkan skrip `"test:modul"` ke dalam perintah pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 13 berkas baru Phase 15 (total 167 berkas utuh).

---

## [v0.14.0] — 2026-10-17
### Phase 14: Struktur Data Dasar (Daftar & Peta) NUSANTARA

Fase ini mengimplementasikan struktur data dasar bahasa NUSANTARA, yaitu tipe `daftar` (koleksi terurut berindeks 0 / array-list) dan tipe `peta` (koleksi asosiatif pasangan kunci-nilai / dictionary-map) yang terintegrasi penuh ke dalam Lexer, Parser, AST, Sistem Tipe (Type System), Interpreter Runtime, fungsi bawaan `panjang()`, mutabilitas dan aturan konstanta `tetap`, serta operator kesetaraan mendalam (`==`, `!=`).

#### Ditambahkan:
- **Koleksi Terindeks `daftar`:**
  - Sintaks literal daftar `[10, 20, 30]`, `["merah", "putih"]`, dan daftar kosong `[]`.
  - Akses elemen berbasis indeks 0 (`angka[0]`, `angka[1]`).
  - Mutasi dan penugasan ulang elemen daftar (`angka[1] = 99`).
  - Dukungan daftar bersarang (*nested lists / multidimensional arrays*) seperti matriks 2D `[[1, 2], [3, 4]]` dan akses berantai `matriks[0][1]`.
  - Pemeriksaan batas indeks runtime (`0 <= indeks < panjang`) dengan diagnostik `BATAS_INDEKS_TERLAMPAUI`.
- **Koleksi Asosiatif `peta`:**
  - Sintaks literal peta dengan kunci teks `{"nama": "Ayu", "umur": 20}` dan kunci pengidentifikasi `{nama: "Budi", nilai: 95}`.
  - Sintaks peta kosong `{}`.
  - Akses nilai berdasarkan kunci teks (`siswa["nama"]`).
  - Pembaruan nilai kunci yang sudah ada dan penambahan pasangan kunci baru secara dinamis (`kamus["id"] = "NX-01"`).
  - Dukungan peta bersarang (*nested maps*) dan akses berantai `pegawai["identitas"]["nama"]`.
  - Pemeriksaan keberadaan kunci runtime dengan diagnostik `KUNCI_TIDAK_DITEMUKAN`.
- **Integrasi Sistem Tipe (Type System):**
  - Registrasi resmi `NamaTipe.DAFTAR` dan `NamaTipe.PETA` dengan status dukungan `LENGKAP`.
  - Validasi statis indeks daftar wajib bertipe `bilangan` dan kunci peta wajib bertipe `teks` (`INDEKS_TIDAK_SESUAI`).
  - Penolakan operasi pengindeksan `[...]` pada tipe skalar non-koleksi (`TIPE_BUKAN_KOLEKSI`).
  - Penegakan aturan mutabilitas: menolak pengubahan elemen daftar atau pasangan kunci peta pada koleksi yang dideklarasikan dengan `tetap` (`MODIFIKASI_TETAP`).
  - Penanganan kompatibilitas dua arah tipe dinamis `NamaTipe.APAPUN` untuk elemen koleksi.
- **Fungsi Bawaan `panjang(koleksi)`:**
  - Fungsi bawaan resmi untuk memeriksa jumlah elemen `daftar`, jumlah entri `peta`, dan panjang karakter `teks`.
- **Operator Kesetaraan Koleksi (Deep Equality):**
  - Implementasi kesetaraan rekursif mendalam untuk operator `==` dan `!=` pada daftar dan peta.
- **Contoh Program Acuan:**
  - Berkas contoh acuan baru `contoh/06_struktur_data.nusantara`.
- **Dokumentasi Resmi Struktur Data:**
  - `docs/referensi/struktur-data.md`: Panduan referensi lengkap pengguna untuk sintaks resmi daftar dan peta.
  - `docs/pengembang/struktur-data.md`: Dokumentasi teknis arsitektur kompilator, representasi runtime, dan pengujian.
- **Rangkaian Pengujian Struktur Data (`pengujian/struktur_data/`):**
  - `pengujian/struktur_data/uji_struktur_data.ts`: Rangkaian 31 pengujian unit dan integrasi komprehensif (100% Lulus).
  - `pengujian/struktur_data/README.md`: Panduan pengujian struktur data.

#### Diubah:
- `src/tipe/kompatibilitas.ts`: Mengizinkan kompatibilitas nilai `APAPUN` ke tipe target dan operasi biner.
- `src/operator/evaluasi.ts`: Menambahkan algoritma perbandingan kesetaraan rekursif mendalam `apakahNilaiSama` untuk koleksi daftar dan peta.
- `src/interpreter/nilai.ts`: Memperbarui `formatNilaiTeks` untuk mengutip string di dalam koleksi.
- `src/interpreter/environment.ts`: Menambahkan metode `apakahTetap` untuk memvalidasi mutabilitas konstanta.
- `src/interpreter/interpreter.ts`: Menambahkan eksekusi `PENUGASAN_INDEKS`, evaluasi `LITERAL_DAFTAR`, `LITERAL_PETA`, `AKSES_INDEKS`, dan registrasi fungsi bawaan `panjang`.
- `package.json`: Menambahkan skrip `"test:struktur-data"` ke dalam perintah pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 5 berkas baru Phase 14 (total 154 berkas utuh).

---

## [v0.13.0] — 2026-10-03
### Phase 13: Sistem Fungsi & Prosedur NUSANTARA

Fase ini meresmikan arsitektur sistem fungsi, prosedur, parameter, nilai kembali (`kembalikan`), lingkup variabel lokal leksikal, pemanggilan antar-fungsi, dan rekursi yang terintegrasi penuh di seluruh saluran pipa bahasa NUSANTARA.

#### Ditambahkan:
- **Konstruksi Fungsi Resmi:**
  - `fungsi namaFungsi(param1 : tipe, param2 : tipe) : tipeHasil mulai ... selesai` untuk deklarasi fungsi dengan nilai kembali.
  - Prosedur (fungsi tanpa anotasi tipe kembali atau bertipe `kosong`) yang dapat berjalan tanpa instruksi kembalikan.
  - Fungsi tanpa parameter dengan pasangan kurung kosong `()`.
- **Parameter & Evaluasi Argumen:**
  - Penerimaan parameter jamak dipisahkan koma dengan tipe data terikat.
  - Validasi jumlah dan kecocokan tipe argumen terhadap parameter secara statis di Type System dan runtime Interpreter.
  - Deteksi dan pencegahan deklarasi parameter ganda (`DEKLARASI_GANDA`) pada fungsi yang sama.
  - Proteksi terhadap konflik nama dengan fungsi bawaan resmi (`tampilkan`).
- **Instruksi `kembalikan` & Nilai Kembali:**
  - Pengembalian nilai ekspresi yang diverifikasi kesesuaian tipenya terhadap tipe hasil fungsi.
  - Pengembalian nilai awal (*early return*) di dalam blok percabangan `jika` atau perulangan.
  - Penegakan keharusan pengembalian nilai bagi fungsi non-kosong (`KEMBALIAN_TIDAK_SESUAI`).
  - Penolakan instruksi `kembalikan` di luar tubuh fungsi (`KENDALI_DI_LUAR_KONTEKS`).
- **Isolasi Lingkup & Pemanggilan Antar-Fungsi:**
  - Parameter dan variabel lokal terisolasi dalam lingkungan fungsi dan dibersihkan setelah pemanggilan selesai (*no variable leaking*).
  - Dukungan pembayangan (*shadowing*) variabel luar tanpa memodifikasi lingkungan luar.
  - Pemanggilan fungsi di dalam argumen atau ekspresi aritmatika lain (*nested call expressions*).
  - Pemanggilan rekursif dengan *stack frame* mandiri.
  - Proteksi rekursi tak terbatas (*Stack Overflow Protection*) dengan batas kedalaman maksimal 500 tingkat pemanggilan (`BATAS_ITERASI_TERLAMPAUI`).
- **Dokumentasi Sistem Fungsi:**
  - `docs/referensi/fungsi.md`: Panduan referensi sintaksis resmi, parameter, pemanggilan, rekursi, dan contoh kode.
  - `docs/pengembang/fungsi.md`: Arsitektur kompilator fungsi, representasi AST, pemeriksaan tipe, dan eksekusi runtime.
- **Rangkaian Pengujian Sistem Fungsi (`pengujian/fungsi/`):**
  - `pengujian/fungsi/uji_fungsi.ts`: 28 skenario pengujian komprehensif (Parser, Type System, Interpreter, Scope, Rekursi, Integrasi Pipeline - 100% Lulus).
  - `pengujian/fungsi/README.md`: Panduan eksekusi dan verifikasi uji fungsi.

#### Diubah:
- `src/parser/parser.ts`: Memperkuat parser deklarasi fungsi di tingkat teratas, pencegahan trailing comma, dan pendeteksian blok fungsi tidak ditutup.
- `src/tipe/pemeriksaTipe.ts`: Penegakan keunikan fungsi, parameter unik, proteksi nama built-in `tampilkan`, pemeriksaan kembalian wajib, dan validasi pemanggilan fungsi.
- `src/interpreter/interpreter.ts`: Penambahan proteksi batas tumpukan rekursi (500 tumpukan) dan verifikasi tipe kembalian runtime.
- `package.json`: Menambahkan skrip `"test:fungsi"` ke dalam perintah pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 4 berkas baru Phase 13 (total 149 berkas utuh).

---

## [v0.12.0] — 2026-10-03
### Phase 12: Sistem Perulangan NUSANTARA

Fase ini meresmikan arsitektur sistem perulangan (*loops*) dan kendali aliran iterasi (`selama`, `untuk`, `dari`, `sampai`, `lakukan`, `hentikan`, `lanjutkan`, `akhir`) yang terintegrasi penuh di seluruh saluran pipa bahasa NUSANTARA.

#### Ditambahkan:
- **Konstruksi Perulangan Resmi:**
  - `selama kondisi lakukan ... akhir` untuk perulangan bersyarat (*conditional while loop*).
  - `untuk var dari awal sampai akhir lakukan ... akhir` untuk perulangan rentang berpenghitung (*counted range loop*) dengan batas akhir inklusif.
  - Perilaku rentang kosong (*empty range* saat `awal > akhir`) yang dilewati 0 kali secara aman tanpa galat.
- **Kendali Aliran Iterasi:**
  - `hentikan` (*break*): Menghentikan paksa perulangan terdekat dan melompat ke baris setelah kata kunci `akhir`.
  - `lanjutkan` (*continue*): Melompati sisa instruksi iterasi saat ini dan langsung menuju putaran berikutnya (tetap mengeksekusi increment variabel penghitung pada `untuk`).
  - Penolakan instruksi `hentikan` dan `lanjutkan` di luar blok perulangan secara statis di Type System dan runtime Interpreter (`KENDALI_DI_LUAR_KONTEKS`).
- **Dukungan Perulangan Bertingkat & Integrasi Percabangan:**
  - Iterasi multi-dimensi (baris dan kolom) dengan state loop terisolasi.
  - Penempatan percabangan `jika` di dalam perulangan dan perulangan di dalam cabang `jika` dengan batas `akhir` berpasangan presisi.
- **Perlindungan Loop Tak Terbatas (*Infinite Loop Protection*):**
  - Parameter konfigurasi `maksimalIterasiPerulangan` pada Interpreter.
  - Runtime melempar `JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI` saat perulangan melebihi ambang batas keamanan yang ditentukan.
- **Dokumentasi Sistem Perulangan:**
  - `docs/referensi/perulangan.md`: Referensi sintaksis lengkap, aturan inklusivitas, rentang kosong, kendali aliran, dan contoh program.
  - `docs/pengembang/perulangan.md`: Dokumentasi teknis saluran pipa, recursive descent parser, node AST, sistem tipe, dan sinyal runtime.
- **Rangkaian Pengujian Sistem Perulangan (`pengujian/perulangan/`):**
  - `pengujian/perulangan/uji_perulangan.ts`: 25 skenario pengujian unit, integrasi, AST, type checking, dan runtime infinite loop protection (100% Lulus).
  - `pengujian/perulangan/README.md`: Panduan eksekusi pengujian perulangan.

#### Diubah:
- `src/interpreter/galat.ts`: Menambahkan enum `JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI`.
- `src/interpreter/interpreter.ts`: Menambahkan opsi `maksimalIterasiPerulangan` dan penanganan rentang kosong pada `for`.
- `src/tipe/galatTipe.ts`: Menambahkan enum `JenisGalatTipe.KENDALI_DI_LUAR_KONTEKS`.
- `src/tipe/pemeriksaTipe.ts`: Menambahkan pelacakan `kedalamanPerulangan` untuk validasi `hentikan`/`lanjutkan`, serta validasi kondisi dan batas rentang.
- `src/parser/parser.ts`: Memperkuat validasi sintaksis kondisi/rentang kosong, pencegahan kata kunci nyasar (`lakukan`, `dari`, `sampai`), dan blok tidak ditutup.
- `package.json`: Menambahkan skrip `"test:perulangan"` ke dalam perintah pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 4 berkas baru Phase 12 (total 145 berkas utuh).

---

## [v0.11.0] — 2026-10-03
### Phase 11: Percabangan Kondisional NUSANTARA

Fase ini menghadirkan kemampuan pengambilan keputusan (*conditional branching*) melalui pasangan leksikal resmi bahasa Indonesia `jika` ... `maka` ... `selain` ... `akhir` yang terintegrasi penuh di seluruh saluran pipa kompilasi dan interpretasi.

#### Ditambahkan:
- **Konstruksi Percabangan Resmi:**
  - `jika kondisi maka ... akhir` untuk percabangan satu arah.
  - `jika kondisi maka ... selain ... akhir` untuk percabangan dua arah.
  - Dukungan percabangan bertingkat (*nested branching*) di dalam blok `maka` maupun `selain` dengan pembatas penutup `akhir` yang berpasangan deterministik.
- **Validasi Ketat Sistem Tipe (Type System):**
  - Kondisi percabangan wajib menghasilkan tipe data `logika` (`benar` / `salah`).
  - Penolakan tipe `bilangan`, `teks`, dan `desimal` dengan pesan kesalahan tipe bahasa Indonesia presisi.
  - Deteksi dan pencegahan penggunaan variabel yang belum dideklarasikan pada ekspresi kondisi percabangan (`VARIABEL_BELUM_DIDEKLARASIKAN`).
- **Isolasi Lingkup & Mutasi Terkendali (Scoping):**
  - Deklarasi variabel baru di dalam blok percabangan terisolasi secara leksikal (*block scope*).
  - Penugasan ulang ke variabel luar berhasil memutasi nilai variabel lingkungan induk.
- **Diagnostik Sintaksis Parser Ramah Pengembang:**
  - Penolakan kondisi kosong sebelum kata kunci `maka`.
  - Penolakan blok percabangan yang tidak ditutup dengan `akhir` sebelum akhir dokumen atau penutup program `selesai`.
  - Penolakan kemunculan kata kunci `selain` atau `akhir` di luar konteks percabangan.
- **Dokumentasi Percabangan:**
  - `docs/referensi/percabangan.md`: Panduan referensi sintaks, tabel aturan tipe, contoh bersarang, dan katalog kesalahan umum.
  - `docs/pengembang/percabangan.md`: Dokumentasi teknis arsitektur saluran pipa, recursive descent parser, node AST, sistem tipe, dan interpreter.
- **Rangkaian Pengujian Percabangan (`pengujian/percabangan/`):**
  - `pengujian/percabangan/uji_percabangan.ts`: 24 skenario pengujian komprehensif (100% Lulus).
  - `pengujian/percabangan/README.md`: Panduan eksekusi pengujian percabangan.

#### Diubah:
- `src/tipe/galatTipe.ts`: Menambahkan enum `JenisGalatTipe.VARIABEL_BELUM_DIDEKLARASIKAN`.
- `src/tipe/pemeriksaTipe.ts`: Menambahkan validasi variabel dan penguatan validasi tipe kondisi `jika`.
- `src/parser/parser.ts`: Memperkuat penanganan kesalahan sintaksis kondisi kosong, pasangan penutup `akhir`, dan token nyasar.
- `package.json`: Menambahkan skrip `"test:percabangan"` ke dalam perintah pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 4 berkas baru Phase 11 (total 141 berkas utuh).

---

## [v0.10.0] — 2026-10-02
### Phase 10: Sistem Operator & Presedensi NUSANTARA

Fase ini menghadirkan arsitektur operator terpadu yang konsisten, aman, dan selaras di seluruh saluran pipa (*Lexer -> Parser -> AST -> Type System -> Interpreter*).

#### Ditambahkan:
- **Modul Sistem Operator Terpusat (`src/operator/`):**
  - `src/operator/jenisOperator.ts`: Taksonomi kategori operator, arah asosiativitas (*left-to-right* vs *right-to-left*), serta `TABEL_PRESEDENSI_OPERATOR` 8 tingkat resmi.
  - `src/operator/evaluasi.ts`: Mesin evaluasi dan pemancar (*dispatch*) terpusat untuk operator unari (`-`, `tidak`) dan biner (`+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `dan`, `atau`).
  - `src/operator/index.ts`: Ekspor terpadu sistem operator.
- **Evaluasi Hubung Singkat (*Short-circuit Evaluation*):**
  - `dan`: jika sisi kiri bernilai `salah`, sisi kanan dilewati dan tidak dievaluasi (mencegah efek samping / pemanggilan fungsi yang tidak perlu).
  - `atau`: jika sisi kiri bernilai `benar`, sisi kanan dilewati dan tidak dievaluasi.
- **Proteksi Runtime Terstruktur:**
  - Pembagian dengan nol (`x / 0`) dan modulo dengan nol (`x % 0`) menghasilkan `GalatRuntime.PEMBAGIAN_NOL` dengan informasi baris dan kolom yang presisi tanpa menyebabkan crash aplikasi.
- **Dokumentasi Sistem Operator:**
  - `docs/referensi/operator.md`: Tabel 8 tingkat presedensi resmi, aturan tipe data, semantik hubung singkat, dan contoh program lengkap.
  - `docs/pengembang/operator.md`: Dokumentasi teknis arsitektur saluran pipa operator, recursive descent parser, evaluasi short-circuit, dan integrasi sistem tipe.
- **Rangkaian Pengujian Sistem Operator (`pengujian/operator/`):**
  - `pengujian/operator/uji_operator.ts`: 21 pengujian mencakup aritmatika, perbandingan, logika, unari, presedensi, asosiativitas, tanda kurung, type checking operator, short-circuit, proteksi bagi/modulo nol, penolakan simbol ilegal, presisi lokasi galat, dan program integrasi penuh kasir toko.
  - `pengujian/operator/README.md`: Panduan eksekusi pengujian operator.

#### Diubah:
- `src/tipe/kompatibilitas.ts`: Menambahkan fungsi `tentukanTipeOperasiUnari` dan menyelaraskan pemetaan tipe operasi.
- `src/tipe/pemeriksaTipe.ts`: Menyempurnakan pesan diagnostik galat tipe pada operator logika dan unari dalam Bahasa Indonesia.
- `src/interpreter/interpreter.ts`: Mendelegasikan evaluasi operator ke modul `src/operator/evaluasi.ts` guna menghilangkan duplikasi kode (*zero logic duplication*).
- `package.json`: Menambahkan skrip `"test:operator"` ke dalam pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 6 berkas baru Phase 10 (total 137 berkas utuh).

---

## [v0.9.0] — 2026-10-02
### Phase 9: Variabel & Sistem Tipe Data NUSANTARA

Fase ini memperkuat sistem variabel dan tipe data NUSANTARA, menghadirkan modul **Pemeriksa Tipe (Type Checker & Semantic Analyzer)** statis sebelum eksekusi, serta menegakkan validasi tipe yang ketat dan aman (*type-safe*).

#### Ditambahkan:
- **Modul Sistem Tipe & Type Checker (`src/tipe/`):**
  - `src/tipe/jenisTipe.ts`: Taksonomi nama tipe resmi (`NamaTipe`) mencakup `teks`, `bilangan`, `desimal`, `logika`, `karakter`, `kosong`, `fungsi`, serta persiapan tipe majemuk `daftar`, `peta`, `tanggal`, dan `waktu`.
  - `src/tipe/kompatibilitas.ts`: Aturan kesetaraan (*type equality*), kompatibilitas penugasan (*type compatibility*), dan pemetaan tipe operasi biner.
  - `src/tipe/galatTipe.ts`: Sistem pelaporan kesalahan tipe terstruktur (`GalatTipe`) dengan koordinat kode sumber dan perbandingan tipe diharapkan vs aktual.
  - `src/tipe/pemeriksaTipe.ts`: Mesin pemeriksa tipe statis yang memvalidasi AST sebelum eksekusi, mendeteksi deklarasi ganda, pelanggaran konstanta tetap, ketidakcocokan tipe inisialisasi/penugasan, tipe parameter fungsi, serta tipe kembalian fungsi.
  - `src/tipe/index.ts`: Ekspor terpadu modul sistem tipe.
- **Dokumentasi Pengembang Sistem Tipe:**
  - `docs/pengembang/type-system.md`: Panduan teknis arsitektur sistem tipe, matriks tipe, dan aturan kompatibilitas.
- **Rangkaian Pengujian Sistem Tipe (`pengujian/tipe/`):**
  - `pengujian/tipe/uji_tipe.ts`: 12 pengujian mencakup tipe primitif valid, penolakan ketidakcocokan tipe, validasi penugasan, proteksi tetap, deklarasi ganda, lingkup/shadowing, validasi parameter & kembalian fungsi, serta aturan tipe operator.
  - `pengujian/tipe/README.md`: Panduan eksekusi pengujian sistem tipe.
- **Skrip Perintah:**
  - Menambahkan skrip `"test:tipe"` dan menyatukannya ke dalam `"npm test"`.

#### Diubah:
- `src/interpreter/environment.ts`: Menyimpan informasi tipe data pada setiap simbol dan memvalidasi kompatibilitas tipe saat penugasan nilai baru.
- `src/interpreter/interpreter.ts`: Mengintegrasikan pemeriksaan tipe statis sebelum eksekusi program serta validasi tipe kembalian fungsi saat runtime.
- `docs/referensi/tipe-data.md`: Diperbarui dengan tabel matriks tipe data aktual dan aturan kompatibilitas.

---

## [v0.8.0] — 2026-10-02
### Phase 8: Implementasi Interpreter NUSANTARA
- Modul Interpreter inti (`src/interpreter/`) yang mampu mengeksekusi pohon AST secara nyata.
- 15 pengujian Interpreter lulus 100%.

---

## [v0.7.0] — 2026-10-02
### Phase 7: Implementasi Parser NUSANTARA
- Modul Parser dan AST inti (`src/parser/`) dengan recursive descent dan precedence climbing 8 tingkat.
- 11 pengujian Parser lulus 100%.

---

## [v0.6.0] — 2026-10-02
### Phase 6: Implementasi Lexer NUSANTARA
- Modul Lexer inti (`src/lexer/`) dengan pemindaian UTF-8, pelacakan baris/kolom, literal, dan TokenStream.
- 21 pengujian Lexer lulus 100%.

---

## [v0.5.0] — 2026-10-02
### Phase 5: Dokumentasi Awal NUSANTARA
- Pusat dokumentasi terstruktur `docs/` dengan 28 panduan baru.

---

## [v0.4.0] — 2026-10-02
### Phase 4: Spesifikasi Sintaks NUSANTARA
- Menetapkan tata bahasa formal EBNF lengkap (ISO/IEC 14977).

---

## [v0.3.0] — 2026-10-02
### Phase 3: Lisensi & Tata Kelola NUSANTARA
- Menetapkan Apache License 2.0 lengkap pada `LISENSI`.

---

## [v0.2.0] — 2026-10-02
### Phase 2: Konstitusi Bahasa NUSANTARA
- Menetapkan Piagam 10 Prinsip Konstitusi Bahasa dan tabel 32 kata kunci.

---

## [v0.1.0] — 2026-10-02
### Phase 1: Identitas & Fondasi NUSANTARA
- Rilis fondasi awal, penetapan nama NUSANTARA, ekstensi `.nusantara`, dan NIP-0001.
