# Panduan: Membangun REST API & Integrasi Basis Data di NUSANTARA

Panduan lengkap membuat layanan RESTful API berbasis JSON yang terhubung langsung dengan basis data relasional SQLite menggunakan modul **`web`** dan **`basisdata`**.

---

## 1. Arsitektur REST API

Dalam arsitektur RESTful standar:
- `GET /api/buku` : Mengambil daftar seluruh buku.
- `GET /api/buku/:id` : Mengambil detail satu buku berdasarkan ID.
- `POST /api/buku` : Menambahkan data buku baru.
- `PUT /api/buku/:id` : Memperbarui data buku yang sudah ada.
- `DELETE /api/buku/:id` : Menghapus buku berdasarkan ID.

---

## 2. Kode Lengkap API (`api_buku.nusantara`)

```nusantara
program LayananAPIBuku

gunakan "web" sebagai web
gunakan "basisdata" sebagai db
gunakan "koleksi" sebagai koleksi

fungsi tanganiDaftarBuku(req : peta, res : peta)
mulai
    koneksi : peta = db.bukaKoneksi("perpustakaan.db")
    daftarBuku : daftar = koneksi.ambilSemua("SELECT * FROM buku ORDER BY id ASC")
    koneksi.tutup()
    
    res.json({
        "sukses": benar,
        "total": koleksi.panjang(daftarBuku),
        "data": daftarBuku
    })
selesai

fungsi tanganiTambahBuku(req : peta, res : peta)
mulai
    badanReq : peta = req.badan
    jika badanReq == kosong maka
        res.status(400).json({ "sukses": salah, "pesan": "Payload JSON wajib diisi" })
        kembalikan kosong
    selesai
    
    judul : teks = badanReq["judul"]
    penulis : teks = badanReq["penulis"]
    harga : bilangan = badanReq["harga"]
    
    koneksi : peta = db.bukaKoneksi("perpustakaan.db")
    hasil : peta = koneksi.eksekusi(
        "INSERT INTO buku (judul, penulis, harga) VALUES (?, ?, ?)",
        [judul, penulis, harga]
    )
    koneksi.tutup()
    
    res.status(201).json({
        "sukses": benar,
        "pesan": "Buku berhasil ditambahkan",
        "id": hasil["idTerakhir"]
    })
selesai

mulai
    tampilkan("Menginisialisasi basis data...")
    koneksiAwal : peta = db.bukaKoneksi("perpustakaan.db")
    koneksiAwal.eksekusi("CREATE TABLE IF NOT EXISTS buku (id INTEGER PRIMARY KEY AUTOINCREMENT, judul TEXT NOT NULL, penulis TEXT NOT NULL, harga REAL)")
    koneksiAwal.tutup()
    
    tampilkan("Memulai server REST API...")
    app : peta = web.buatAplikasi({
        "port": 8000,
        "host": "127.0.0.1"
    })
    
    app.dapatkan("/api/buku", tanganiDaftarBuku)
    app.kirimkan("/api/buku", tanganiTambahBuku)
    
    app.mulai(8000, "127.0.0.1")
    tampilkan("REST API siap melayani pada http://127.0.0.1:8000")
selesai
```

---

## 3. Pengujian Endpoint via cURL

### 1. Mengambil Daftar Buku (GET):
```bash
curl -X GET http://127.0.0.1:8000/api/buku
```

### 2. Menambahkan Buku Baru (POST):
```bash
curl -X POST http://127.0.0.1:8000/api/buku \
     -H "Content-Type: application/json" \
     -d '{"judul": "Pemrograman Nusantara Modern", "penulis": "Tim Pengembang", "harga": 95000}'
```
