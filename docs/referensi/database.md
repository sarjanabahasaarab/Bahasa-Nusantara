# Dokumentasi Resmi: Modul Standard Library `basisdata` (Database API)

Bahasa Pemrograman NUSANTARA — Target Versi `v0.29.0` (Phase 29)

---

## 1. Pengantar & Filosofi Desain

Modul `basisdata` (juga dapat diakses melalui alias resminya: `database`, `std:basisdata`, atau `std:database`) menyediakan antarmuka akses data relasional terpadu, aman, dan berkinerja tinggi untuk aplikasi desktop, server, situs web, serta perkakas otomatisasi.

### Karakteristik Utama:
- **Zero-Dependency Native Driver**: Menggunakan mesin C-Native SQLite 3 berkecepatan tinggi terintegrasi (`node:sqlite`).
- **Pencegahan SQL Injection Menyeluruh**: Prepared statements dengan parameter binding wajib (`?` posisi atau `:nama`, `@nama`, `$nama`).
- **Pemetaan Tipe Data Dua Arah**: Pemetaan transparan antara tipe primitif NUSANTARA (`bilangan`, `desimal`, `teks`, `logika`, `kosong`, `peta`, `daftar`) dan tipe SQL (`INTEGER`, `REAL`, `TEXT`, `BOOLEAN`, `NULL`).
- **Manajemen Transaksi ACID**: Mendukung `mulaiTransaksi()`, `commit()`, dan `rollback()`.
- **Proteksi Jalur Keamanan**: Mencegah serangan *path traversal* (`../..`) dan membatasi berkas basis data di dalam direktori kerja/sandbox yang diizinkan.
- **Diagnostik Galat Berbahasa Indonesia**: Seluruh pesan galat (pelanggaran kekangan unik, kesalahan sintaks SQL, kegagalan transaksi) diterjemahkan dengan jelas dan ramah pengembang.

---

## 2. Cara Mengimpor Modul

Program NUSANTARA dapat mengimpor modul ini menggunakan salah satu bentuk berikut:

```nusantara
// Bentuk 1: Menggunakan modul basisdata
gunakan "basisdata" sebagai db

// Bentuk 2: Menggunakan alias database
gunakan "database" sebagai db

// Bentuk 3: Menggunakan prefiks std:
gunakan "std:basisdata" sebagai db
```

---

## 3. Membuka & Menutup Koneksi

### In-Memory Database (`:memory:`)
Koneksi in-memory sangat cepat dan ideal untuk caching, pengujian unit, atau data sesi sementara:
```nusantara
koneksi : peta = db.bukaMemori()
// atau
koneksi : peta = db.bukaKoneksi(":memory:")
```

### Berkas Database Lokal
Menyimpan data secara persisten ke dalam berkas pada disk:
```nusantara
koneksi : peta = db.bukaKoneksi("data/aplikasi.db")
```

### Menutup Koneksi
Menutup sumber daya koneksi secara bersih:
```nusantara
koneksi.tutup()
```

---

## 4. Eksekusi DDL & DML (`eksekusi`)

Metode `eksekusi(sql, parameter?)` digunakan untuk membuat tabel, indeks, memperbarui skema, serta menjalankan operasi `INSERT`, `UPDATE`, dan `DELETE`.

Fungsi ini mengembalikan peta dengan struktur:
- `terpengaruh`: `bilangan` (jumlah baris yang berubah).
- `idTerakhir`: `bilangan` atau `kosong` (row ID dari baris yang baru disisipkan).
- `sukses`: `logika` (`benar` jika berhasil).

### Contoh DDL:
```nusantara
koneksi.eksekusi("CREATE TABLE pengguna (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL, email TEXT UNIQUE, saldo REAL, aktif INTEGER)")
```

### Contoh DML dengan Parameter Binding:
```nusantara
hasil : peta = koneksi.eksekusi(
    "INSERT INTO pengguna (nama, email, saldo, aktif) VALUES (?, ?, ?, ?)",
    ["Budi Prasetyo", "budi@nusantara.id", 500000.0, 1]
)

tampilkan("ID Pengguna Baru:", hasil["idTerakhir"])
tampilkan("Baris Terpengaruh:", hasil["terpengaruh"])
```

---

## 5. Query Data (`ambilSemua`, `ambilSatu`, `ambilNilai`)

### 1. `ambilSemua(sql, parameter?) -> daftar`
Mengembalikan seluruh baris yang cocok sebagai daftar peta (`daftar` of `peta`).

```nusantara
semuaPengguna : daftar = koneksi.ambilSemua("SELECT * FROM pengguna ORDER BY id ASC")
tampilkan("Total Pengguna:", koleksi.panjang(semuaPengguna))
```

### 2. `ambilSatu(sql, parameter?) -> peta | kosong`
Mengembalikan satu baris data sebagai `peta`, atau `kosong` jika data tidak ditemukan.

```nusantara
pengguna : peta = koneksi.ambilSatu("SELECT * FROM pengguna WHERE email = ?", ["budi@nusantara.id"])
jika pengguna != kosong maka
    tampilkan("Nama:", pengguna["nama"])
    tampilkan("Saldo:", pengguna["saldo"])
selesai
```

### 3. `ambilNilai(sql, parameter?) -> nilai | kosong`
Mengambil skalar (nilai kolom pertama baris pertama) secara instan. Sangat efisien untuk fungsi agregat (`COUNT`, `MAX`, `AVG`, `SUM`).

```nusantara
totalSaldo : desimal = koneksi.ambilNilai("SELECT SUM(saldo) FROM pengguna WHERE aktif = ?", [1])
tampilkan("Total Saldo Aktif:", totalSaldo)
```

---

## 6. Parameter Binding & Pencegahan SQL Injection

Modul `basisdata` menerapkan prinsip keamanan ketat: **Jangan pernah menggabungkan string langsung ke dalam perintah SQL**. Gunakan parameter binding yang selalu diperlakukan sebagai nilai literal murni oleh mesin SQLite.

### Positional Binding (`?`):
```nusantara
koneksi.eksekusi("UPDATE pengguna SET saldo = ? WHERE id = ?", [750000.0, 1])
```

### Named Parameter Binding (`:nama`, `@nama`, `$nama`):
```nusantara
param : peta = {
    ":nama": "Siti Aminah",
    ":email": "siti@nusantara.id",
    ":saldo": 1250000.0,
    ":aktif": 1
}
koneksi.eksekusi("INSERT INTO pengguna (nama, email, saldo, aktif) VALUES (:nama, :email, :saldo, :aktif)", param)
```

---

## 7. Manajemen Transaksi ACID

Transaksi menjamin serangkaian operasi basis data dieksekusi secara atomik (semua berhasil atau semua dibatalkan).

```nusantara
koneksi.mulaiTransaksi()

// Operasi 1: Kurangi saldo pengirim
koneksi.eksekusi("UPDATE rekening SET saldo = saldo - ? WHERE id = ?", [100000.0, 1])

// Operasi 2: Tambah saldo penerima
koneksi.eksekusi("UPDATE rekening SET saldo = saldo + ? WHERE id = ?", [100000.0, 2])

// Selesaikan transaksi secara permanen
koneksi.commit()
```

Bila terjadi pembatalan atau kesalahan:
```nusantara
koneksi.rollback()
```

---

## 8. Diagnostik Galat & Kode Kesalahan

Semua kegagalan basis data memicu diagnostik resmi dalam Bahasa Indonesia:

| Kategori Galat | Deskripsi |
|---|---|
| `KEKANGAN_TERLANGGAR` | Pelanggaran kekangan UNIQUE, NOT NULL, atau FOREIGN KEY |
| `SINTAKS_SQL` | Perintah SQL salah atau tabel/kolom tidak ditemukan |
| `KONEKSI_TUTUP` | Perintah dijalankan pada koneksi yang sudah ditutup |
| `AKSES_JALUR_ILEGAL` | Berkas database mencoba mengakses jalur di luar direktori aman (path traversal) |
| `TRANSAKSI_GAGAL` | Transaksi ganda tanpa savepoint atau commit/rollback tanpa transaksi aktif |

---

## 9. Contoh Program Lengkap

```nusantara
program ManajemenInventaris

gunakan "basisdata" sebagai db
gunakan "koleksi" sebagai koleksi

mulai
    tampilkan("Menginisialisasi Sistem Basis Data Inventaris...")
    dbInstan : peta = db.bukaMemori()
    
    // Pembuatan Skema
    dbInstan.eksekusi("CREATE TABLE barang (kode TEXT PRIMARY KEY, nama TEXT, stok INTEGER, harga REAL)")
    
    // Penyisipan Data
    dbInstan.eksekusi("INSERT INTO barang (kode, nama, stok, harga) VALUES (?, ?, ?, ?)", ["BRG-01", "Kopi Robusta 250g", 50, 32000.0])
    dbInstan.eksekusi("INSERT INTO barang (kode, nama, stok, harga) VALUES (?, ?, ?, ?)", ["BRG-02", "Teh Hitam Melati", 30, 18500.0])
    
    // Query Agregat
    totalItem : bilangan = dbInstan.ambilNilai("SELECT COUNT(*) FROM barang")
    tampilkan("Total jenis barang:", totalItem)
    
    // Query Barang Tunggal
    item : peta = dbInstan.ambilSatu("SELECT * FROM barang WHERE kode = ?", ["BRG-01"])
    tampilkan("Item ditemukan:", item["nama"], "| Stok:", item["stok"])
    
    // Penutupan Koneksi
    dbInstan.tutup()
    tampilkan("Operasi basis data selesai.")
selesai
```
