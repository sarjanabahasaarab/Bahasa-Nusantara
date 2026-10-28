# Panduan: Membangun Website Dinamis dengan NUSANTARA

Panduan langkah-demi-langkah membangun situs web dinamis menggunakan bahasa pemrograman **NUSANTARA** dan modul standar **`web`**.

---

## 1. Persiapan Proyek

Buat direktori proyek baru dengan struktur:

```
situs-saya/
├── aplikasi.nusantara
└── publik/
    └── gaya.css
```

---

## 2. Menulis Berkas CSS Statis (`publik/gaya.css`)

```css
body {
    font-family: sans-serif;
    background-color: #f1f5f9;
    padding: 2rem;
}
.kartu {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

---

## 3. Menulis Program Utama (`aplikasi.nusantara`)

```nusantara
program SitusDinamis

gunakan "web" sebagai web
gunakan "koleksi" sebagai koleksi

fungsi tanganiBeranda(req : peta, res : peta)
mulai
    halaman : teks = "<html><head><title>Situs Saya</title><link rel='stylesheet' href='/publik/gaya.css'></head><body><div class='kartu'><h1>Selamat Datang di Situs NUSANTARA</h1><p>Website ini disajikan dengan performa tinggi dan aman secara default.</p></div></body></html>"
    res.html(halaman)
selesai

mulai
    tampilkan("Memulai server situs web...")
    
    // Inisialisasi aplikasi
    app : peta = web.buatAplikasi({
        "port": 3000,
        "host": "127.0.0.1"
    })
    
    // Konfigurasi berkas statis
    app.berkasStatis("/publik", "publik")
    
    // Daftarkan rute beranda
    app.dapatkan("/", tanganiBeranda)
    
    // Mulai server
    app.mulai(3000, "127.0.0.1")
    tampilkan("Situs web berjalan pada http://127.0.0.1:3000")
selesai
```

---

## 4. Menjalankan Website

Gunakan perintah CLI NUSANTARA:

```bash
nusantara layani aplikasi.nusantara --port 3000
```

Buka peramban web pada alamat `http://127.0.0.1:3000`.
