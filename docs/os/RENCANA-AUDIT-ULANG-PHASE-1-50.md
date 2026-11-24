# Rencana Audit Ulang Phase 1–50 NUSANTARA

## Tujuan

Memastikan fondasi bahasa, compiler, toolchain, runtime, dan kernel yang akan dipakai oleh NUSANTARA OS benar-benar konsisten. Audit ini bukan pengulangan seluruh proyek dari nol dan bukan sertifikasi otomatis.

## Prioritas audit

### A. Integritas repositori dan build
- Verifikasi branch `main`, riwayat merge PR #68 dan #69, serta tidak ada perubahan yang hilang.
- Jalankan clean install, typecheck, build aplikasi/toolchain, seluruh `npm test`, dan suite tambahan yang didaftarkan.
- Cocokkan nama skrip `package.json` dengan berkas pengujian yang benar-benar ada.
- Periksa import yang tidak terselesaikan, berkas duplikat, kode mati, dan dependensi yang tidak digunakan.
- Audit workflow CI agar menjalankan tes yang sama dengan perintah lokal dan tidak menyembunyikan kegagalan.

### B. Bahasa dan compiler (Phase 1–47)
- Validasi konsistensi EBNF, dokumentasi, lexer, parser, AST, type checker, interpreter, NIR, backend, linker dan runtime.
- Uji program valid/invalid, Unicode, batas memori, diagnostik, determinisme build, serta kompatibilitas target.
- Pisahkan fitur bahasa yang telah diimplementasikan dari fitur yang hanya memiliki kontrak atau simulasi.
- Pertahankan bahasa sebagai toolchain resmi OS, tetapi dahulukan kebutuhan compiler freestanding dan target kernel.

### C. Kernel dan boot (Phase 48–51)
- Verifikasi source kernel, linker script, entry point, Multiboot2/UEFI path, ELF headers, section/segment, dan checksum.
- Bangun kernel dari source pada clean runner; jangan hanya memercayai artefak yang tersimpan.
- Boot QEMU dengan log serial yang dapat diperiksa dan exit contract yang jelas.
- Uji Ring 3, pemetaan memori, pointer validation, fault isolation, syscall entry/return, register preservation dan context switch.
- Periksa Phase 51: kontrak ABI telah digabung melalui PR #68, tetapi jalur assembly entry/return dan konfigurasi MSR harus dibuktikan sebelum syscall disebut berjalan secara hardware.

### D. Bukti lintas platform dan perangkat
- Linux/Windows/macOS CI membuktikan toolchain yang dijalankan pada runner tersebut, bukan dukungan hardware NUSANTARA OS pada ketiga sistem itu.
- QEMU membuktikan perilaku mesin virtual yang diuji, bukan kompatibilitas semua PC.
- Android APK/AAB atau Android Emulator build yang sudah ada tidak membuktikan APK dapat berjalan native di kernel NUSANTARA.
- Uji perangkat fisik harus mencantumkan model, revisi hardware, firmware, driver, langkah, log, dan hasil.

## Keluaran audit

Audit menghasilkan:
1. Matriks Phase 1–50: PASS, PARTIAL, SIMULATED, NOT_VERIFIED, FAIL, atau BLOCKED.
2. Daftar penghambat berdasarkan dampak terhadap OS.
3. Peta dependensi antara modul bahasa, compiler, runtime, kernel, dan layanan OS.
4. Daftar file yang aman dipertahankan, perlu refactor, perlu pengujian, atau kandidat penghapusan.
5. Laporan regresi dengan perintah, versi toolchain, commit SHA, workflow run, dan log.
6. Rekomendasi gerbang untuk Phase 52.

## Aturan perubahan

- Audit dahulu sebelum refactor.
- Jangan menghapus kode hanya karena belum dipakai; telusuri import, dokumentasi, contoh, dan workflow.
- Perubahan besar dilakukan dalam PR terpisah per subsistem.
- Tidak boleh mengubah status Phase menjadi SELESAI tanpa kriteria dan bukti.
- Kegagalan lama harus ditautkan ke akar masalah dan diperbaiki pada sumbernya.
- Pertahankan artefak historis, tetapi tandai artefak yang tidak dapat dibangun ulang sebagai bukti historis, bukan hasil build terkini.
