# Referensi Resmi: Web Application Framework NUSANTARA (Modul `web` & `http`)

Bahasa Pemrograman NUSANTARA — Target Versi `v0.30.0` (Phase 30)

---

## 1. Pengantar & Filosofi Desain

Framework aplikasi web **NUSANTARA** dirancang untuk menyediakan fondasi pengembangan situs web dinamis, aplikasi web modern, dan REST API yang berkinerja tinggi, modular, dan menerapkan prinsip keamanan **secure-by-default**.

### Karakteristik Utama:
- **Server HTTP Asli Terintegrasi**: Menggunakan adapter `node:http` bawaan Node.js tanpa dependensi native eksternal tambahan.
- **Router Berkinerja Tinggi**: Mendukung rute statis, parameter dinamis (`:id`), pengelompokan rute (*route grouping*), serta penanganan otomatis status 404 (Not Found) dan 405 (Method Not Allowed).
- **Anti-DoS Payload Guard**: Pembatasan ukuran request body secara streaming (default 1 MB) untuk mencegah serangan kehabisan memori.
- **Keamanan Bawaan (Secure-by-Default)**:
  - Header keamanan: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`.
  - Pelacakan `X-Permintaan-ID` (Request ID) untuk setiap koneksi.
  - Proteksi penuh terhadap serangan *Path Traversal* (`../..`) dan pemblokiran akses berkas tersembunyi (`.env`, `.git`).
  - Template Engine dengan *auto-escaping* HTML otomatis untuk menangkal ancaman Cross-Site Scripting (XSS).
  - Sanitasi pencatat log untuk mencegah kebocoran kredensial atau token.
- **Integrasi Penuh Database**: Bekerja harmonis dengan modul `basisdata` (SQLite) untuk transaksi CRUD data relasional.

---

## 2. Mengimpor Modul

Program NUSANTARA dapat mengimpor modul web melalui beberapa variasi nama:

```nusantara
// Bentuk standar
gunakan "web" sebagai web

// Bentuk alias
gunakan "http" sebagai http

// Bentuk prefix std:
gunakan "std:web" sebagai web
```

---

## 3. Inisialisasi Aplikasi (`web.buatAplikasi`)

Fungsi `web.buatAplikasi(opsi?: peta) -> peta` membuat instans server aplikasi baru.

### Opsi Konfigurasi:
| Properti | Tipe Data | Nilai Bawaan | Keterangan |
|---|---|---|---|
| `port` | `bilangan` | `3000` | Port listen jaringan TCP |
| `host` | `teks` | `"127.0.0.1"` | Host listen (default localhost untuk keamanan) |
| `batasUkuranBadanBytes` | `bilangan` | `1048576` (1MB) | Batas maksimal ukuran body permintaan |
| `batasWaktuMilidetik` | `bilangan` | `30000` (30s) | Batas waktu timeout permintaan |
| `direktoriStatis` | `teks` | `kosong` | Jalur folder berkas publik |
| `prefixStatis` | `teks` | `"/publik"` | Awalan URL untuk berkas statis |
| `kepercayaanProxy` | `logika` | `salah` | Mempercayai header X-Forwarded-For |
| `aktifkanPencatatAkses` | `logika` | `salah` | Mengaktifkan logging permintaan aman |

Contoh:
```nusantara
app : peta = web.buatAplikasi({
    "port": 8080,
    "host": "127.0.0.1",
    "direktoriStatis": "aset_publik",
    "prefixStatis": "/aset"
})
```

---

## 4. Penjaluran (Router)

### Mendaftarkan Rute
Framework menyediakan metode pendaftaran rute sesuai metode HTTP:
- `app.dapatkan(jalur: teks, penangan: fungsi)` (GET)
- `app.kirimkan(jalur: teks, penangan: fungsi)` (POST)
- `app.perbarui(jalur: teks, penangan: fungsi)` (PUT)
- `app.hapus(jalur: teks, penangan: fungsi)` (DELETE)
- `app.semua(jalur: teks, penangan: fungsi)` (Menangani semua metode)

### Parameter Jalur Dinamis:
Gunakan `:namaParameter` untuk menangkap variabel URL:
```nusantara
fungsi tanganiArtikel(req : peta, res : peta)
mulai
    idArtikel : teks = req.ambilParam("id")
    res.json({ "id": idArtikel, "status": "ditemukan" })
selesai

mulai
    app.dapatkan("/artikel/:id", tanganiArtikel)
selesai
```

---

## 5. Antarmuka Permintaan (`req` - PermintaanWeb)

Objek `req` yang diteruskan ke setiap fungsi penangan memuat properti dan method:

- `req.id`: ID unik permintaan (`teks`).
- `req.metode`: Metode HTTP (`"GET"`, `"POST"`, dll.).
- `req.jalur`: Jalur URL yang diminta.
- `req.ipKlien`: Alamat IP klien yang meminta.
- `req.kueri`: Peta query parameters URL.
- `req.parameter`: Peta path parameters dari router.
- `req.tajuk`: Peta header HTTP dalam huruf kecil.
- `req.badan`: Isi payload body (berupa peta/daftar bila JSON, atau teks biasa).
- `req.ambilParam(kunci: teks) -> teks | kosong`
- `req.ambilKueri(kunci: teks) -> teks | kosong`
- `req.ambilTajuk(kunci: teks) -> teks | kosong`

---

## 6. Antarmuka Respons (`res` - ResponsWeb)

Objek `res` digunakan untuk mengirimkan balasan ke klien:

- `res.status(kode: bilangan)`: Mengatur kode status HTTP (200, 201, 400, 404, dll.).
- `res.tajuk(kunci: teks, nilai: teks)`: Menambahkan header respons kustom.
- `res.teks(konten: teks, status?: bilangan)`: Mengirim respons teks polos (`text/plain`).
- `res.html(kontenHTML: teks, status?: bilangan)`: Mengirim respons HTML (`text/html`).
- `res.json(data: apapun, status?: bilangan)`: Mengirim respons JSON (`application/json`).
- `res.alihkan(url: teks, status?: bilangan)`: Melakukan pengalihan URL (default 302).
- `res.berkas(jalurBerkas: teks)`: Mengirimkan berkas langsung dari disk.

---

## 7. Mesin Template HTML & Pencegahan XSS

Framework menyediakan mesin template HTML bawaan yang aman secara default:

1. **Auto-Escaping**: Variabel `{{ nama }}` secara otomatis mengubah karakter berbahaya (`<`, `>`, `&`, `"`, `'`) menjadi entitas HTML aman untuk mencegah serangan XSS.
2. **HTML Mentah**: Gunakan `{{{ kontenMentah }}}` hanya jika konten telah divalidasi aman.
3. **Kondisional**: `{{#jika aktif}} ... {{#selain}} ... {{/jika}}`.
4. **Perulangan**: `{{#untuk item dalam daftar}} ... {{/untuk}}`.
5. **Layout & Partial**:
   - `app.daftarkanLayout("utama", "<header>...</header><main>{{{ konten }}}</main>")`
   - `app.daftarkanPartial("nav", "<nav>...</nav>")`
   - `app.render("namaTemplate", data)`

---

## 8. Berkas Statis & Proteksi Keamanan Jalur

Gunakan `app.berkasStatis(prefixUrl, folderLokal)` untuk menyajikan berkas CSS, gambar, atau JavaScript:
- Mencegah serangan path traversal seperti `/publik/../../../../etc/passwd` dengan status 403 Forbidden.
- Secara otomatis menolak berkas sensitif atau berkas tersembunyi seperti `.env` dan direktori `.git`.
- Memetakan MIME type secara otomatis berdasarkan ekstensi berkas.
