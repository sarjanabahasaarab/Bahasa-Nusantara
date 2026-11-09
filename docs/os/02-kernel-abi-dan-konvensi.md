# Kernel ABI dan Konvensi Pemanggilan (Phase 48)

Application Binary Interface (ABI) Kernel Nusantara mendefinisikan kontrak tingkat rendah antara perangkat keras x86_64, rutin kernel, dan program ruang pengguna.

## 1. Konvensi Pemanggilan (Calling Convention)
Kernel Nusantara mengadopsi standar **System V AMD64 ABI**:
- **Argumen Integer/Pointer**: Dialirkan melalui register secara berurutan:
  1. `RDI`
  2. `RSI`
  3. `RDX`
  4. `RCX` (atau `R10` pada panggilan `syscall`)
  5. `R8`
  6. `R9`
- **Argumen Tambahan**: Ditaruh di atas call stack dari kanan ke kiri.
- **Nilai Kembalian (Return Value)**: Disimpan dalam register `RAX` (dan `RDX` jika 128-bit).
- **Register Terpelihara (Callee-saved)**: `RBX`, `RSP`, `RBP`, `R12`, `R13`, `R14`, `R15`.
- **Register Sementara (Caller-saved)**: `RAX`, `RCX`, `RDX`, `RSI`, `RDI`, `R8`, `R9`, `R10`, `R11`.

## 2. Perataan Stack (Stack Alignment)
- Stack pointer (`RSP`) **wajib** diratakan pada batas 16 byte (`RSP % 16 == 0`) tepat sebelum instruksi `CALL` dieksekusi.
- Kernel mendeteksi ketidaksesuaian perataan melalui `KernelABI.isAligned(rsp, 16)`.

## 3. Batas Ruang Alamat (Memory Boundary Isolation)
Untuk mencegah eksploitasi keamanan dan kebocoran data kernel:
- Ruang Pengguna (Userspace): `0x0000_0000_0000_0000` s/d `0x0000_7FFF_FFFF_FFFF` (128 TB).
- Non-Canonical Hole: `0x0000_8000_0000_0000` s/d `0xFFFF_7FFF_FFFF_FFFF` (dilarang diakses CPU).
- Ruang Kernel (Kernelspace): `0xFFFF_8000_0000_0000` s/d `0xFFFF_FFFF_FFFF_FFFF` (128 TB).
- Setiap pointer argumen dari pengguna wajib divalidasi dengan `KernelABI.isUserPointerValid(ptr, length)`. Akses ke luar rentang pengguna akan mengembalikan galat `EFAULT` (-14).
