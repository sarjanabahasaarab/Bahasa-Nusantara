# Panduan Pengembang: Menulis Pengujian Otomatis NUSANTARA

Panduan ini ditujukan bagi pengembang modul, paket, dan kontributor open-source yang menulis pengujian otomatis untuk aplikasi dan pustaka NUSANTARA.

---

## 1. Menyiapkan Proyek Pengujian

Secara konvensi, berkas pengujian disimpan di direktori `tests/` atau berdampingan dengan berkas modul:

```
proyek-saya/
├── nusantara.toml
├── src/
│   ├── matematika.nusantara
│   └── utilitas.nusantara
└── tests/
    ├── matematika.uji.nusantara
    └── utilitas.uji.nusantara
```

## 2. Struktur Berkas Pengujian

Tulis penegasan langsung pada berkas `*.uji.nusantara`. Setiap penegasan yang berhasil dieksekusi akan dicatat sebagai penegasan lulus.

```nusantara
# Impor atau deklarasikan fungsi yang akan diuji
fungsi kali_dua(angka) {
    kembalikan angka * 2
}

# Blok penegasan
pastikan_sama(kali_dua(4), 8, "4 dikali 2 harus menghasilkan 8")
pastikan_sama(kali_dua(0), 0, "0 dikali 2 harus menghasilkan 0")
pastikan_tidak_sama(kali_dua(3), 7, "3 dikali 2 tidak boleh 7")
pastikan_benar(kali_dua(10) > 15, "10 dikali 2 harus melebihi 15")
```

## 3. Isolasi Pengujian dengan Direktori Sementara

Bagi pengujian yang memerlukan manipulasi sistem berkas (I/O) tanpa meninggalkan residu di komputer pengguna, gunakan kelas `DirektoriSementara` dari pustaka testing TypeScript atau API terisolasi:

```ts
import { DirektoriSementara } from 'nusantara/testing';

const tempDir = new DirektoriSementara('uji-io');
try {
  tempDir.tulisBerkas('data.txt', 'Halo Dunia');
  // Lakukan pengujian membaca data.txt
} finally {
  tempDir.bersihkan(); // Direktori dihapus secara otomatis dan aman
}
```

## 4. Menjalankan Pengujian dari Baris Perintah (CLI)

```bash
# Menjalankan pengujian cepat
nusantara uji

# Mode detail untuk melacak setiap penegasan
nusantara uji -V

# Menjalankan regresi tertentu
nusantara uji tests/regression/bug-0001.uji.nusantara
```

## 5. Menjalankan Quality Gate Pra-Rilis

Sebelum merilis paket atau mengajukan Pull Request ke repositori NUSANTARA, jalankan Quality Gate:

```bash
nusantara uji-semua
```

Quality Gate akan memverifikasi:
1. Idempotensi pemformat kode sumber (`Formatter`)
2. Layanan Language Server Protocol (LSP)
3. Integritas seluruh modul pustaka standar
4. Validitas sistem penegasan (*assertions*)
5. Lolos seluruh regresi (`tests/regression/`)
6. Ambang batas cakupan subsistem >= 85%
