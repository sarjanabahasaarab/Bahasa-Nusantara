# Spesifikasi Referensi Testing Framework NUSANTARA (v0.21.0)

## 1. Ikhtisar

Testing Framework NUSANTARA menyediakan infrastruktur pengujian otomatis resmi yang terintegrasi langsung ke dalam runtime, pustaka standar, toolchain, dan baris perintah (CLI).

Framework ini dirancang dengan prinsip:
- **Deterministik**: Eksekusi pengujian bebas efek samping yang tidak terduga.
- **Terisolasi**: Setiap berkas pengujian dieksekusi pada lingkungan interpreter mandiri.
- **Ramah Diagnostik**: Setiap kegagalan penegasan memunculkan laporan terformat dengan lokasi baris, kolom, nilai yang diharapkan, dan nilai yang ditemukan (kode galat `NUS-TST-001` hingga `NUS-TST-005`).
- **Natif Bahasa Indonesia**: Kata kunci dan fungsi penegasan menggunakan istilah baku Bahasa Indonesia yang selaras dengan Konstitusi Bahasa NUSANTARA.

---

## 2. Pola Penamaan Berkas Uji

Penemu Uji (`PenemuUji`) secara otomatis memindai dan mengenali berkas pengujian dengan pola:
1. `*.uji.nusantara` (Konvensi utama resmi)
2. `*_test.nusantara` (Konvensi penamaan alternatif)
3. `*.test.nusantara` (Konvensi penamaan kompatibel)

Direktori seperti `node_modules`, `build`, `dist`, `.git`, `.nusantara`, dan `.cache` secara otomatis diabaikan.

---

## 3. Fungsi Penegasan Bawaan (Built-in Assertions)

Fungsi-fungsi penegasan berikut tersedia secara langsung di lingkungan global NUSANTARA tanpa perlu impor tambahan, serta dapat diakses melalui modul pustaka standar `uji`:

### 3.1 `pastikan(kondisi: logika, pesan?: teks): logika`
Menegaskan bahwa `kondisi` bernilai `benar`. Jika bernilai `salah` atau bukan `logika`, melempar `GalatPenegasan` dengan kode `NUS-TST-001`.

```nusantara
pastikan(total > 0, "Total harus bernilai positif")
```

### 3.2 `pastikan_sama(aktual: apa_saja, diharapkan: apa_saja, pesan?: teks): logika`
Menegaskan bahwa nilai `aktual` setara secara mendalam (*deep equality*) dengan `diharapkan`. Jika berbeda, melempar `GalatPenegasan` dengan kode `NUS-TST-002` yang memuat nilai ekspektasi dan nilai temuan.

```nusantara
pastikan_sama(hitung(2, 3), 5, "2 + 3 harus menghasilkan 5")
```

### 3.3 `pastikan_tidak_sama(aktual: apa_saja, diharapkan: apa_saja, pesan?: teks): logika`
Menegaskan bahwa nilai `aktual` tidak sama dengan `diharapkan`. Jika sama, melempar `GalatPenegasan` dengan kode `NUS-TST-002`.

```nusantara
pastikan_tidak_sama(status, "gagal", "Status tidak boleh gagal")
```

### 3.4 `pastikan_benar(nilai: apa_saja, pesan?: teks): logika`
Menegaskan bahwa `nilai === true`. Jika bukan `true`, melempar `GalatPenegasan` dengan kode `NUS-TST-003`.

```nusantara
pastikan_benar(apakahAktif(), "Layanan harus dalam keadaan aktif")
```

### 3.5 `pastikan_salah(nilai: apa_saja, pesan?: teks): logika`
Menegaskan bahwa `nilai === false`. Jika bukan `false`, melempar `GalatPenegasan` dengan kode `NUS-TST-004`.

```nusantara
pastikan_salah(apakahKadaluarsa(), "Sesi tidak boleh kadaluarsa")
```

### 3.6 `pastikan_galat(fungsi_uji: fungsi, pesan?: teks): logika`
Menegaskan bahwa pemanggilan `fungsi_uji` memicu galat runtime atau sintaks.

---

## 4. Format Laporan Terminal

Contoh luaran terminal:

```
============================================================
           LAPORAN PENGUJIAN OTOMATIS NUSANTARA
============================================================

✓ tests/matematika.uji.nusantara (3 ms)
  ✓ Penjumlahan normal
  ✓ Pembagian aman
✗ tests/string.uji.nusantara (5 ms)
  ✓ Huruf kapital
  ✗ [NUS-TST-002] Teks gabungan tidak cocok
    Lokasi: tests/string.uji.nusantara:14:5
    Diharapkan: "NUSANTARA"
    Ditemukan : "nusantara"

------------------------------------------------------------
Ringkasan: 2 berkas diuji
Total Uji : 4
Lulus     : 3 (75.0%)
Gagal     : 1 (25.0%)
Durasi    : 8 ms
Status    : SEBAGIAN GAGAL
============================================================
```

---

## 5. Integrasi CLI

```bash
# Menjalankan seluruh pengujian di direktori aktif
nusantara uji

# Menjalankan berkas pengujian tertentu
nusantara uji tests/matematika.uji.nusantara

# Menjalankan dengan filter nama
nusantara uji --cari matematika

# Menjalankan dengan rincian rinci setiap penegasan
nusantara uji --verbose

# Menghasilkan luaran JSON
nusantara uji --json

# Mengatur batas waktu timeout (ms)
nusantara uji --timeout 3000

# Menjalankan Quality Gate lengkap
nusantara uji-semua
nusantara quality-gate
```

---

## 6. Kode Status Keluar (Exit Codes)

- `0`: Seluruh pengujian lulus tanpa kegagalan.
- `1`: Terdapat satu atau lebih penegasan yang gagal, atau galat runtime/timeout pada berkas uji.
- `2`: Kesalahan sintaksis argumen atau perintah CLI tidak valid.
