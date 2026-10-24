# Referensi Paket Bahasa NUSANTARA (Phase 22)

Dokumen ini mendefinisikan spesifikasi resmi format manifest paket (`nusantara.toml`), format arsip bundle (`.npk`), penamaan paket, versioning semantik, serta siklus hidup paket dalam bahasa pemrograman NUSANTARA.

---

## 1. Identitas Paket & Penamaan

Setiap paket dalam ekosistem NUSANTARA memiliki identitas unik:
- **Nama paket**: Wajib menggunakan huruf kecil (`a-z`), angka (`0-9`), strip (`-`), atau garis bawah (`_`).
- **Panjang nama**: Antara 1 hingga 64 karakter.
- **Keamanan nama**: Karakter whitespace, pemisah jalur (`/`, `\`), traversal (`..`), dan karakter kontrol dilarang keras.
- **Konsistensi**: Nama bersifat case-sensitive dan aman untuk filesystem maupun registri.

Contoh nama valid:
- `matematika`
- `utilitas-string`
- `koleksi_ekstra`

---

## 2. Manifest Paket (`nusantara.toml`)

Manifest ditulis dalam format standar TOML dengan tabel utama `[nusantara]` dan tabel `[dependensi]`.

```toml
[nusantara]
nama = "matematika-ekstra"
versi = "1.0.0"
deskripsi = "Pustaka matematika tingkat lanjut untuk NUSANTARA"
lisensi = "MIT"
penulis = "Tim Pengembang Nusantara"
kata_kunci = ["matematika", "numerik", "aljabar"]

[dependensi]
utilitas-string = "^1.0.0"
```

### Kolom Wajib `[nusantara]`
| Kunci | Tipe | Deskripsi |
|---|---|---|
| `nama` | Teks | Nama unik paket sesuai aturan identitas |
| `versi` | Teks | Versi rilis berformat Semantic Versioning (MAJOR.MINOR.PATCH) |
| `deskripsi` | Teks | Ringkasan fungsionalitas paket |
| `lisensi` | Teks | Identifier lisensi (misal: MIT, Apache-2.0, BSD-3-Clause) |

### Kolom Opsional `[nusantara]`
| Kunci | Tipe | Deskripsi |
|---|---|---|
| `penulis` | Teks / Daftar Teks | Pengembang atau pemilik paket |
| `kata_kunci` | Daftar Teks | Tag untuk mempermudah pencarian paket |
| `repository` | Teks | URL repositori kode sumber |
| `homepage` | Teks | URL situs resmi paket |

---

## 3. Format Arsip Paket Bundle (`.npk`)

Arsip paket NUSANTARA menggunakan ekstensi `.npk` (*Nusantara Package Bundle*). Setiap bundle memuat:
1. **Header Metadata**: format `nusantara-npk-v1`, identitas paket, waktu pembuatan, total berkas, ukuran byte, dan checksum SHA-256.
2. **Kumpulan Berkas**: Berkas kode sumber (`.nusantara`), manifest (`nusantara.toml`), dokumentasi (`README.md`), dan lisensi (`LICENSE`).
3. **Penyaringan Berkas Sensitif**: Berkas sistem (`.git`, `.env`, `.nusantara`, `node_modules`, `cache`, `nusantara.lock`) secara otomatis disaring dan dicegah masuk ke dalam arsip.
4. **Proteksi Path Traversal**: Seluruh nama jalur berkas di dalam bundle divalidasi terhadap percobaan eskalasi direktori (`..`, jalur absolut `/`, dan null byte `\0`).

---

## 4. Alur Validasi Paket (`nusantara paket cek`)

Sebelum paket dibangun atau dirilis, mesin `ValidatorPaket` melakukan 5 lapis verifikasi:
1. **Validasi Manifest**: Keberadaan dan kepatuhan skema `nusantara.toml`.
2. **Validasi SemVer**: Format versi `MAJOR.MINOR.PATCH`.
3. **Validasi Tata Bahasa**: Seluruh berkas `.nusantara` diurai oleh parser resmi untuk memastikan tidak ada kesalahan sintaksis.
4. **Validasi Pengujian (Test Suite)**: Seluruh pengujian paket (`*.uji.nusantara`) dijalankan; jika terdapat kegagalan uji, pembuatan paket ditolak.
5. **Higienitas Keamanan**: Pindai berkas sensitif dan kunci privat rahasia.
