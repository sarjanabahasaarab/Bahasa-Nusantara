# Pengunduhan & Pengunggahan Berkas (Phase 35)

NUSANTARA Phase 35 menyediakan `PengunduhBerkas` dan `PengunggahBerkas` yang aman, mendukung streaming, pelaporan progress berkala, serta pencegahan kerentanan keamanan berkas.

## 1. Pengunduhan Berkas (`PengunduhBerkas`)

### Proteksi Keamanan Terbina
- **Pencegahan Path Traversal**: Nama berkas dari header `Content-Disposition` maupun URL divalidasi dan disanitasi ketat dari karakter bahaya seperti `../` dan tanda pemisah direktori absolut.
- **Batas Ukuran Maksimum (Max File Size)**: Menghentikan stream jika ukuran data melampaui ambang batas yang ditentukan.
- **Lanjutkan Pengunduhan (Resume via HTTP Range)**: Memanfaatkan header `Range: bytes=X-` untuk melanjutkan berkas yang terputus sebagian.

### Contoh Penggunaan
```typescript
import { KlienHTTP, PengunduhBerkas } from './src/http';

const klien = new KlienHTTP();
const pengunduh = new PengunduhBerkas(klien, {
  direktoriTujuan: './unduhan',
  maksimalUkuranByte: 50 * 1024 * 1024, // 50 MB
});

const hasil = await pengunduh.unduh('https://contoh.id/paket-v1.zip', {
  namaBerkasTujuan: 'paket-lokal.zip',
  padaProgres: (terunduh, total) => {
    const persen = total ? Math.round((terunduh / total) * 100) : 0;
    console.log(`Progres unduhan: ${persen}% (${terunduh} bytes)`);
  }
});

console.log('Berkas disimpan di:', hasil.jalurBerkas);
```

## 2. Pengunggahan Berkas Multipart (`PengunggahBerkas`)

Mendukung transmisi berkas biner bersama metadata formulir menggunakan format `multipart/form-data`:

```typescript
import { PengunggahBerkas } from './src/http';

const pengunggah = new PengunggahBerkas(klien, {
  direktoriBasis: './dokumen',
});

const responUpload = await pengunggah.unggah('https://api.contoh.id/v1/upload', {
  jalurBerkas: 'laporan.pdf',
  namaField: 'dokumenUtama',
  tipeKonten: 'application/pdf',
  fieldTambahan: {
    'departemen': 'Keuangan',
    'tahun': '2026'
  },
  padaProgres: (terunggah, total) => {
    console.log(`Terunggah ${terunggah} dari ${total} bytes`);
  }
});
```
