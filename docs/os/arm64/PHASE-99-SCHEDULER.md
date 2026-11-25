# Phase 99 — ARM64 Scheduler Foundation

Status: implementation and host contract tests proposed in PR.

## Scope
Fondasi scheduler round-robin satu CPU dengan kapasitas tetap. Mendukung pendaftaran tugas, penghitungan kuantum, status ready/running/blocked/terminated, pemilihan tugas berikutnya, block/unblock, dan terminasi.

## Kontrak tugas
Setiap descriptor menyimpan ID unik, stack pointer tersimpan, konteks arsitektur opaque, kuantum, sisa tick, dan status. Platform wajib membuat serta memvalidasi stack dan konteks sebelum registrasi.

## Integrasi timer
Fungsi tick mengurangi satu tick logis dan memilih tugas runnable berikutnya saat kuantum habis. Fungsi hanya mengembalikan descriptor. Fungsi ini belum menyimpan register CPU, mengganti stack, mengirim GIC EOI, atau melakukan exception return. Integrasi timer dan context-switch nyata membutuhkan lapisan assembly arsitektur tersendiri.

## Keselamatan dan konkurensi
- Hanya single-core; pemanggil wajib menyerialisasi akses terhadap IRQ dan task.
- Tidak ada heap, lock, prioritas dinamis, SMP, wait queue, ruang alamat proses, atau task reaper.
- Stack pointer dan konteks arsitektur bersifat opaque.
- Kapasitas tetap 64 descriptor.
- Slot terminated dipertahankan sebagai tombstone agar ID lama tidak dipakai ulang secara keliru.

## Validasi
Pengujian C11 mencakup scheduler kosong, pendaftaran, rotasi round-robin, kuantum, block/unblock, terminasi, transisi tidak valid, dan input tidak valid. CI melakukan cross-compile freestanding AArch64.
