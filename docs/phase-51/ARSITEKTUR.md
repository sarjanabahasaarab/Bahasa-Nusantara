# Arsitektur Phase 51

## Lapisan

1. KernelABI lama tetap menjadi sumber helper alamat memori, alignment, dan konvensi register.
2. SyscallTable tetap menjadi sumber nomor, nama, dan batas minimum argumen syscall yang terdaftar.
3. UserlandABI membangun manifest publik dan menangani negosiasi versi.
4. decodeSyscallFrame membaca RAX dan enam register argumen syscall tanpa menjalankan instruksi privileged.
5. writeSyscallResult memvalidasi hasil signed 64-bit sebelum menulis RAX.

## Kompatibilitas

Versi major harus sama. Versi minor yang diminta tidak boleh lebih tinggi daripada versi yang didukung implementasi. Fitur yang diminta harus tersedia. Versi patch tidak mengubah kompatibilitas kontrak.

## Alur

Userspace application → ABI request → UserlandABI.negotiate → syscall register frame → decodeSyscallFrame → existing SyscallDispatcher/SyscallTable → signed 64-bit result → writeSyscallResult.

## Non-goals

Phase ini tidak mengimplementasikan loader baru, assembly syscall entry/return, konfigurasi MSR, scheduler transition, ataupun native hardware execution.
