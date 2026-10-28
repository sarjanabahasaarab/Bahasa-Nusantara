# Panduan: Membangun Sistem Registrasi & Login Aman di NUSANTARA

Panduan lengkap langkah-demi-langkah membangun sistem autentikasi pengguna yang aman, anti-kebocoran informasi, dan terintegrasi dengan basis data relasional menggunakan modul **`autentikasi`**, **`web`**, dan **`basisdata`**.

---

## 1. Alur Kerja Sistem Autentikasi

### Alur Pendaftaran (Registrasi):
1. Klien mengirim formulir registrasi (`username`, `email`, `password`).
2. Server memvalidasi kebijakan kata sandi (panjang minimal 8 karakter, maksimal 128 karakter).
3. Server memastikan username dan email belum terdaftar di basis data.
4. Kata sandi di-hash menggunakan algoritma memory-hard **Scrypt KDF** dengan salt 16-byte unik dari CSPRNG.
5. Rekor pengguna baru disimpan ke basis data relasional.

### Alur Masuk (Login):
1. Klien mengirim kredensial login (`username` atau `email` dan `password`).
2. Server mencari akun pengguna. Jika pengguna tidak ditemukan, sistem tetap menjalankan verifikasi hash tiruan (*dummy hash verification*) dengan waktu komputasi setara guna menolak serangan analisis waktu (*timing attack*).
3. Kata sandi diverifikasi dalam waktu konstan (`timingSafeEqual`).
4. Setelah kredensial terbukti valid, server membuat token sesi kriptografis baru 256-bit (CSPRNG).
5. Hash token (SHA-256) disimpan di basis data, sedangkan token mentah disematkan ke cookie HTTP dengan atribut `HttpOnly`, `SameSite=Lax`, dan `Path=/`.

---

## 2. Implementasi Program (`aplikasi_login.nusantara`)

```nusantara
program AplikasiAutentikasiLengkap

gunakan "web" sebagai web
gunakan "basisdata" sebagai db
gunakan "autentikasi" sebagai auth

// 1. Inisialisasi Basis Data & Layanan Autentikasi
koneksi : peta = db.bukaKoneksi("pengguna.db")
layanan : peta = auth.buatLayanan(koneksi)
layanan.inisialisasiSkema()

// 2. Handler Pendaftaran Pengguna Baru
fungsi tanganiDaftar(req : peta, res : peta)
mulai
    badan : peta = req.badan
    jika badan == kosong maka
        res.status(400).json({ "sukses": salah, "pesan": "Permintaan wajib menyertakan body JSON." })
        kembalikan kosong
    akhir

    username : teks = badan["username"]
    email : teks = badan["email"]
    password : teks = badan["password"]

    hasil : peta = layanan.daftar(username, email, password, "pengguna")
    jika hasil["sukses"] maka
        res.status(201).json({
            "sukses": benar,
            "pesan": "Registrasi pengguna berhasil.",
            "data": hasil["pengguna"]
        })
    selain
        res.status(400).json({
            "sukses": salah,
            "pesan": hasil["pesanGalat"]
        })
    akhir
selesai

// 3. Handler Login Pengguna
fungsi tanganiMasuk(req : peta, res : peta)
mulai
    badan : peta = req.badan
    jika badan == kosong maka
        res.status(400).json({ "sukses": salah, "pesan": "Kredensial login wajib diisi." })
        kembalikan kosong
    akhir

    pengenal : teks = badan["pengenal"]
    password : teks = badan["password"]

    hasilLogin : peta = layanan.masuk(pengenal, password)
    jika hasilLogin["sukses"] maka
        // Simpan token sesi ke dalam cookie aman
        res.aturKuki("nusantara_sesi", hasilLogin["token"], {
            "httpOnly": benar,
            "sameSite": "Lax",
            "path": "/"
        })

        res.json({
            "sukses": benar,
            "pesan": "Login berhasil.",
            "token": hasilLogin["token"],
            "pengguna": hasilLogin["pengguna"]
        })
    selain
        res.status(401).json({
            "sukses": salah,
            "pesan": hasilLogin["pesanGalat"]
        })
    akhir
selesai

// 4. Handler Pemeriksaan Profil Pengguna Saat Ini (Rute Terproteksi)
fungsi tanganiProfilSaya(req : peta, res : peta)
mulai
    token : teks = req.ambilKuki("nusantara_sesi")
    jika token == "" maka
        res.status(401).json({ "sukses": salah, "pesan": "Akses ditolak: sesi belum dibuat." })
        kembalikan kosong
    akhir

    sesi : peta = layanan.validasiSesi(token)
    jika sesi == kosong maka
        res.status(401).json({ "sukses": salah, "pesan": "Sesi tidak valid atau telah kedaluwarsa." })
        kembalikan kosong
    akhir

    res.json({
        "sukses": benar,
        "sesi": sesi
    })
selesai

// 5. Handler Keluar (Logout)
fungsi tanganiKeluar(req : peta, res : peta)
mulai
    token : teks = req.ambilKuki("nusantara_sesi")
    jika token != "" maka
        layanan.keluar(token)
        res.hapusKuki("nusantara_sesi", { "path": "/" })
    akhir

    res.json({ "sukses": benar, "pesan": "Sesi Anda telah berhasil diakhiri." })
selesai

mulai
    app : peta = web.buatAplikasi({ "port": 3000, "host": "127.0.0.1" })

    app.kirimkan("/api/auth/daftar", tanganiDaftar)
    app.kirimkan("/api/auth/masuk", tanganiMasuk)
    app.dapatkan("/api/auth/saya", tanganiProfilSaya)
    app.kirimkan("/api/auth/keluar", tanganiKeluar)

    tampilkan("Server autentikasi NUSANTARA berjalan di http://127.0.0.1:3000")
selesai
```

---

## 3. Praktik Terbaik Keamanan

1. **Gunakan Parameterized Query**: Semua query pencarian pengguna dan token menggunakan prepared statement dengan binding parameter untuk meniadakan risiko SQL Injection.
2. **Jangan Pernah Simpan Plaintext Password**: Modul `autentikasi` secara otomatis meng-hash kata sandi sebelum menyentuh lapisan database.
3. **Lindungi Cookie Sesi**: Pastikan atribut cookie selalu menyertakan `httpOnly: benar` agar tidak dapat diakses oleh skrip berbahaya di peramban klien.
