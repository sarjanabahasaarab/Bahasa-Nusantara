# Antrean Tugas Latar Belakang & Pekerja (Background Processing) NUSANTARA

Dokumentasi resmi sistem Antrean Tugas (Task Queue), Pekerja (Worker), Kebijakan Percobaan Ulang (Retry Policy), dan Penjadwal (Scheduler) pada bahasa pemrograman NUSANTARA (**v0.34.0** - Phase 34).

---

## 1. Ikhtisar

Sistem pemrosesan latar belakang NUSANTARA dirancang untuk menjalankan tugas-tugas berat atau tertunda (seperti pengiriman email notifikasi, pemrosesan laporan, sinkronisasi data eksternal, atau pembaharuan indeks) di luar alur request-response HTTP utama.

### Komponen Utama:
- **`AntreanTugasMemori`**: Antrean tugas in-memory dengan prioritas antrean, kontrol kapasitas maksimum, dan deduplikasi menggunakan kunci idempoten.
- **`PekerjaLatarBelakang`**: Worker yang mengeksekusi tugas sesuai penangan terdaftar, menangani kegagalan dengan retry backoff, dan mendukung penghentian halus (*graceful shutdown*).
- **`KebijakanPercobaanUlang`**: Penentuan jadwal percobaan ulang menggunakan rumus backoff eksponensial dengan isolasi kesalahan fatal yang tidak boleh diulang.
- **`PenjadwalTugas`**: Penjadwalan eksekusi tugas tertunda (delayed execution) atau berulang (recurring cron-like intervals).

---

## 2. Status Siklus Hidup Tugas

Tiap tugas memiliki siklus hidup dengan status transisi yang terdefinisi:

| Status (ID) | Status (EN) | Deskripsi |
|---|---|---|
| `antre` | `pending` | Tugas telah dimasukkan dan menunggu diambil oleh pekerja |
| `berjalan` | `running` | Pekerja sedang memproses fungsi penangan tugas |
| `selesai` | `completed` | Tugas berhasil dieksekusi tanpa kesalahan |
| `gagal` | `failed` | Tugas gagal setelah melampaui batas maksimal percobaan (dead-letter) |
| `dibatalkan` | `cancelled` | Tugas dibatalkan secara manual sebelum dieksekusi |

---

## 3. Contoh Penggunaan Program NUSANTARA

```nusantara
program ContohAntreanTugas
gunakan "realtime" sebagai rt

mulai
    // 1. Buat Antrean dengan Kapasitas 500
    antrean : peta = rt.buatAntrean("antrean_email", 500)

    // 2. Tambah Tugas Prioritas Tinggi
    idTugas : teks = antrean.tambah("kirim_email_verifikasi", "pengguna@nusantara.lang", 10)
    tampilkan("Tugas dijadwalkan dengan ID:", idTugas)

    // 3. Periksa Statistik Antrean
    stats : peta = antrean.statistik()
    tampilkan("Total antrean aktif:", stats["total"])
selesai
```

---

## 4. Perintah Baris Perintah (CLI) Pekerja

Bahasa NUSANTARA menyediakan perintah CLI resmi untuk memantau dan mengelola worker:

```bash
# Menampilkan ringkasan status antrean dan statistik pemrosesan
nusantara worker status

# Memulai siklus pekerja latar belakang pemantau antrean
nusantara worker start
```

---

## 5. Kebijakan Percobaan Ulang Eksponensial (Exponential Backoff)

Rumus durasi tunda untuk percobaan ke-$n$:
$$\text{Jeda} = \min(\text{jedaAwalMs} \times (\text{pengali})^{n-1}, \text{jedaMaksimalMs})$$

Secara default:
- `maksimalPercobaan`: 3 kali
- `jedaAwalMs`: 500 ms
- `faktorEksponensial` / `pengali`: 2
- `jedaMaksimalMs`: 30.000 ms (30 detik)

Kesalahan yang ditandai dengan properti `tidakBolehDiulang = true` (seperti galat validasi payload) akan langsung dihentikan tanpa percobaan ulang untuk mencegah pemborosan komputasi.
