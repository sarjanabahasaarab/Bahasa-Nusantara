# Panduan Pengembang: Standard Library Bahasa NUSANTARA (Phase 17)

Dokumen ini merupakan panduan arsitektur dan pengembangan internal untuk **Standard Library (stdlib)** pada bahasa pemrograman **NUSANTARA**.

Target Milestone: `v0.17.0`  
Status: **[DITETAPKAN untuk Phase 17]**

---

## 1. Arsitektur Standard Library

Standard Library dibangun di atas fondasi **Sistem Modul (Phase 15)** dan **Package Manager (Phase 16)** dengan lapisan integrasi:

```
Program Pengguna (.nusantara)
           ↓
PemeriksaTipe (Type System) ← Registrasi Simbol Ekspor (InfoSimbolModul)
           ↓
PemuatModul (Module Loader) ← normalisasiNamaModulStandar & buatCatatanModulStandar
           ↓
Runtime Interpreter ← NilaiFungsiBawaan / NilaiModul
           ↓
Host Environment (Node.js OS / Browser Virtual Memory)
```

### Struktur Berkas Sumber:
```
stdlib/
├── teks/modul.nusantara
├── matematika/modul.nusantara
├── konversi/modul.nusantara
├── waktu/modul.nusantara
├── acak/modul.nusantara
├── koleksi/modul.nusantara
├── berkas/modul.nusantara
└── sistem/modul.nusantara

src/stdlib/
├── index.ts          # Root registry, normalisasi nama, dan pabrik modul standar
├── teks.ts           # Implementasi fungsi-fungsi modul teks
├── matematika.ts     # Implementasi kalkulasi numerik & konstanta PI/E
├── konversi.ts       # Implementasi konverter tipe eksplisit
├── waktu.ts          # Implementasi waktu host & kalender
├── acak.ts           # Implementasi generator pseudorandom
├── koleksi.ts        # Implementasi operasi daftar & peta
├── berkas.ts         # Implementasi sandbox I/O berkas
└── sistem.ts         # Implementasi informasi platform & runtime
```

---

## 2. Pola Registrasi Modul Standar

Setiap modul standar dalam `src/stdlib/` mengekspor dua komponen utama:
1. `simbolEkspor<Nama>`: `Map<string, InfoSimbolModul>`
   Digunakan oleh `PemeriksaTipe` saat kompilasi statis untuk memvalidasi argumen, tipe data, dan nilai kembalian.
2. `buatEkspor<Nama>()`: `Map<string, NilaiRuntime>`
   Menghasilkan objek runtime berisi `NilaiFungsiBawaan` atau konstanta yang akan dimasukkan ke dalam `CatatanModul.ekspor`.

### Contoh Format Simbol:
```typescript
export const simbolEksporMatematika: Map<string, InfoSimbolModul> = new Map([
  [
    'maksimum',
    {
      nama: 'maksimum',
      kategori: 'fungsi',
      parameter: [
        { nama: 'a', tipe: 'apapun' },
        { nama: 'b', tipe: 'apapun' },
      ],
      tipeKembalian: 'apapun',
    },
  ],
]);
```

---

## 3. Resolusi Modul & Presedensi Pencarian

Pemuat modul (`PemuatModul.muatModul()`) menerapkan aturan presedensi:
1. **Prefix Eksplisit**: Jika nama modul berawalan `std:`, `stdlib:`, atau `nusantara:`, pencarian langsung diarahkan ke Standard Library.
2. **Pencarian Jalur Fisik Proyek**: Jika nama modul tanpa prefix, resolver terlebih dahulu memeriksa apakah proyek pengguna memiliki berkas modul lokal (misal: `/proyek/matematika.nusantara`). Ini memastikan kompatibilitas penuh dan kemampuan pengujian lokal.
3. **Fallback ke Standard Library**: Jika tidak ditemukan berkas fisik pada proyek, nama modul diperiksa terhadap katalog 8 modul standar resmi (`KATALOG_MODUL_STANDAR`). Jika cocok, modul langsung dibuat dengan status `SUDAH_DIMUAT` dan disimpan ke dalam cache.
4. **Cache Tunggal**: Modul yang telah dimuat disimpan dalam `cache` sehingga pemanggilan berulang tidak memerlukan inisialisasi ulang.

---

## 4. Keamanan Sandbox Filesystem (`SandboxBerkas`)

Modul `berkas` diisolasi melalui kelas `SandboxBerkas` di `src/stdlib/berkas.ts`:
- **Abstraksi Lintas Lingkungan**: Menggunakan `PembacaBerkasNode` pada CLI dan `PembacaBerkasMemori` pada peramban web.
- **Validasi Jalur**:
  - Membatasi kedalaman `..` maksimal 4 level.
  - Melarang akses ke berkas sensitif sistem (`/etc/shadow`, `/etc/passwd`, file `.env`).
  - Menormalkan seluruh jalur ke direktori basis proyek.

---

## 5. Panduan Menambahkan Modul Standar Baru

Untuk menambahkan modul standar baru di fase berikutnya:
1. Buat berkas `src/stdlib/<nama_modul>.ts`.
2. Definisikan `simbolEkspor<Nama>` dan `buatEkspor<Nama>()`.
3. Daftarkan entri baru pada `KATALOG_MODUL_STANDAR` di `src/stdlib/index.ts`.
4. Buat berkas spesifikasi `stdlib/<nama_modul>/modul.nusantara`.
5. Tulis pengujian komprehensif di `pengujian/stdlib/uji_stdlib.ts`.
6. Perbarui dokumentasi referensi dan roadmap proyek.
