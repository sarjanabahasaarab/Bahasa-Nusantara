# Runtime Interpreter NUSANTARA pada Android

## Implementasi

APK Android memuat interpreter TypeScript resmi dari `src/interpreter` melalui bundle browser lokal yang dibuat dengan esbuild. Bundle dimuat oleh WebView lokal dari `file:///android_asset/runtime-host.html`; aplikasi tidak memuat kode runtime dari server eksternal.

Jalur eksekusi:
1. Pengguna menekan **Jalankan** pada Editor.
2. Aplikasi menyimpan berkas aktif.
3. Kode sumber dikirim ke fungsi `jalankanKodeAndroid` pada bundle lokal.
4. Fungsi membuat `Interpreter` resmi, `PenulisOutputBuffer`, dan `PembacaBerkasMemori`.
5. Hasil atau galat dikembalikan ke terminal native.

## Batas keselamatan runtime mobile

- Ukuran kode sumber maksimal 256 KiB.
- Maksimal 10.000 iterasi perulangan.
- Batas waktu interpreter 3.000 ms.
- Maksimal 1.000 baris keluaran dan 256 KiB karakter keluaran.
- Pembaca berkas interpreter memakai filesystem virtual in-memory, bukan akses filesystem Android langsung.
- Host WebView menggunakan aset lokal, menonaktifkan DOM storage dan content access, serta membatasi file-origin access.
- CSP host tidak mengizinkan sumber jaringan eksternal.
- Eksekusi dihentikan dengan galat jika parser, pemeriksa tipe, atau runtime menghasilkan exception.

## Fitur yang belum diklaim

- Impor modul dari filesystem Android dan sinkronisasi workspace native belum diintegrasikan.
- Modul standar yang membutuhkan host capability seperti proses OS, jaringan, database native, kamera, lokasi, Bluetooth, atau sensor perlu adapter Android khusus dan izin terpisah.
- Debugger interaktif, breakpoint UI, profiler UI, dan step execution belum terhubung.
- Timeout membatasi operasi interpreter yang memeriksa deadline; ia bukan jaminan menghentikan operasi sinkron native/browser yang macet di luar kontrol interpreter.

## Build dan uji

Pada root repository:

```bash
npm ci
npm run build:android-runtime
npm run test:android-runtime
```

Gradle Android juga menjalankan `npm run build:android-runtime` melalui task `bundleNusantaraInterpreter` sebelum `preBuild`, sehingga file aset runtime dihasilkan saat build.

Pengujian otomatis awal mencakup program `tampilkan`, sintaks tidak valid, sumber kosong, dan sumber yang melewati batas ukuran. Hasil CI dan pengujian perangkat fisik harus dilaporkan terpisah.
