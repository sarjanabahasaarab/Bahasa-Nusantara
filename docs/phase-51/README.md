# Phase 51 — Kernel–Userland ABI

**Target:** NUSANTARA OS x86_64  
**Status:** Implementasi diajukan; sertifikasi menunggu CI.

## Tujuan

Menetapkan kontrak ABI berversi antara aplikasi ruang pengguna dan kernel agar identitas ABI, arsitektur, konvensi register syscall, versi, fitur wajib, dan nilai balik memiliki aturan eksplisit.

## Implementasi

- Manifest ABI publik nusantara-userland versi 1.0.0 untuk x86_64.
- Dokumentasi konvensi fungsi System V AMD64 dan syscall AMD64.
- Pemetaan nomor syscall melalui RAX; argumen melalui RDI, RSI, RDX, R10, R8, R9; hasil melalui RAX.
- Manifest deterministik dari SyscallTable tanpa mengekspos handler internal.
- Negosiasi identitas ABI, arsitektur, versi major/minor, dan fitur wajib.
- Dekoder register syscall yang tidak mengubah register sumber.
- Validasi nilai hasil signed 64-bit, termasuk errno negatif.
- Pemeriksaan nomor syscall terhadap registry yang aktif.

## Batasan keamanan

Modul ini mendefinisikan kontrak dan helper yang dapat diuji di host. Modul ini tidak memasang instruksi CPU SYSCALL, mengatur MSR, melakukan transisi privilege, atau membuktikan eksekusi kernel pada perangkat keras. Keamanan setiap syscall tetap memerlukan validasi argumen, pointer, izin, dan implementasi handler.

## Pengujian

Jalankan npm run test:abi-v51 dan npm run lint. Suite menulis 23 kasus pengujian. Status lulus hanya boleh dicatat setelah CI benar-benar menjalankan suite tersebut.

## Kriteria penerimaan

- [ ] UserlandABI diekspor melalui modul OS.
- [ ] Manifest stabil dan tidak mengekspos handler internal.
- [ ] Negosiasi versi dan fitur menolak kontrak tidak kompatibel.
- [ ] Pemetaan register syscall sesuai kontrak x86_64.
- [ ] Hasil syscall dibatasi signed 64-bit.
- [ ] Seluruh 23 tes Phase 51 lulus.
- [ ] Typecheck dan regresi repositori lulus.
- [ ] Hasil CI ditinjau sebelum fase dinyatakan tersertifikasi.
