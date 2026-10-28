# Contoh Aplikasi Web NUSANTARA (Phase 30 - v0.30.0)

Repositori ini menyertakan contoh aplikasi web lengkap yang dibangun menggunakan bahasa pemrograman **NUSANTARA** dan modul standar **`web`**.

## Struktur Contoh

```
contoh/web/
├── aplikasi.nusantara  # Program utama aplikasi web
├── publik/
│   ├── gaya.css        # Berkas statis CSS
│   └── skrip.js        # Berkas statis JavaScript
└── README.md           # Panduan eksekusi
```

## Fitur yang Dicontohkan

1. **Pembuatan Aplikasi**: `web.buatAplikasi({ "port": 3000, "host": "127.0.0.1" })`
2. **Berkas Statis**: `app.berkasStatis("/publik", "contoh/web/publik")`
3. **Penyajian Halaman Web HTML**: `res.html(...)`
4. **Endpoint REST API JSON**: `res.json(...)`
5. **Keamanan Bawaan**: Proteksi path traversal dan MIME mapping otomatis.

## Cara Menjalankan

Gunakan CLI resmi NUSANTARA:

```bash
# Melalui perintah jalankan
nusantara jalankan contoh/web/aplikasi.nusantara

# Atau melalui perintah layani
nusantara layani contoh/web/aplikasi.nusantara --port 3000
```
