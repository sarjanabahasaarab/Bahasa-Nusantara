# SERTIFIKASI AKHIR PHASE 50: NUSANTARA OS
## REAL RING 3 EXECUTION, HARDWARE MEMORY ISOLATION & QEMU CI

- **Proyek:** NUSANTARA Programming Language & NUSANTARA OS
- **Versi:** `v0.50.0` (Phase 50)
- **Arsitektur:** x86_64 Long Mode (AMD64)
- **ABI:** System V AMD64 ABI
- **Status Sertifikasi Lokal:** **PARTIAL (CI_READY — EKSEKUSI QEMU NYATA DILAKUKAN DI GITHUB ACTIONS)**
  *(Audit dan perbaikan menyeluruh telah diterapkan pada kernel ELF64 bare-metal, `X86BootstrapEncoder`, `KernelELFBuilder`, generator ISO GRUB2 Multiboot2 nyata via `grub-mkrescue` + `xorriso`, skrip validasi `run-phase50-qemu.sh`, dan workflow `.github/workflows/nusantara-os-ci.yml` / `.github/workflows/kernel-boot-qemu.yml`. Seluruh 90 pengujian unit & integrasi OS Phase 48–50 LULUS 100%, namun eksekusi emulator fisik QEMU pada container cloud lokal tetap berstatus **NOT EXECUTED** karena `qemu-system-x86_64`, `grub-mkrescue`, dan `xorriso` tidak terpasang di lingkungan container ini. Status akhir baru boleh dinyatakan COMPLETE setelah workflow GitHub Actions pada runner Ubuntu menghasilkan exit code QEMU `1` bersama log serial UART mentah dari ke-18 sentinel.)*

---

### 1. Informasi Lingkungan Runner & Toolchain Host Lokal

| Komponen | Status Faktual Lokal | Keterangan |
|---|:---:|---|
| **OS Host Container** | Terdeteksi | Linux x86_64 (`Node.js v22.23.2`) |
| **QEMU Emulator** | **MISSING** | `qemu-system-x86_64` tidak terpasang di container lokal |
| **Clang Compiler** | **MISSING** | `clang` tidak terpasang di container lokal |
| **LLD Linker** | **MISSING** | `ld.lld` / `lld` tidak terpasang di container lokal |
| **GRUB Utility** | **MISSING** | `grub-mkrescue` / `grub-file` tidak terpasang di container lokal |
| **Xorriso Utility** | **MISSING** | `xorriso` tidak terpasang di container lokal |
| **QEMU Bare-Metal Exec** | **NOT EXECUTED** | Menunggu eksekusi pada runner `ubuntu-latest` GitHub Actions |

---

### 2. Perbaikan Akar Masalah Kegagalan Bare-Metal & QEMU CI

1. **ISO Bootable GRUB2 Nyata (`scripts/generate-phase50-artifacts.ts`):**
   - Dihapus: pembangkitan ISO palsu berbasis `Buffer.alloc(...)` mentah tanpa El Torito boot catalog.
   - Diganti: pemanggilan langsung `grub-mkrescue` + `grub.cfg` (`serial --unit=0 --speed=115200`, `multiboot2 /boot/kernel.elf`, `boot`), validasi `grub-file --is-x86-multiboot2`, serta pemeriksaan El Torito oleh `xorriso`.
   - Dihapus: pembangkitan file log serial palsu (`serial.log`, `boot.log`, `qemu.log`) sebelum QEMU berjalan.

2. **Kepatuhan ELF64 `PT_LOAD` (`src/compiler/targets/kernel/kernel-elf-builder.ts`):**
   - `Phdr 1` kini disejajarkan penuh pada batas halaman 4 KiB (`p_offset % 0x1000 === p_vaddr % 0x1000 === 0`) dan alamat fisiknya dihitung dinamis setelah akhir `Phdr 0` agar segmen `.text` yang lebih besar tidak pernah tertimpa.

3. **Eksekusi Ring 3 & Isolasi `#PF` Nyata pada Kernel (`src/compiler/targets/kernel/x86-bootstrap-encoder.ts`):**
   - Menghapus seluruh pencetakan sentinel Ring 3 palsu dari Ring 0.
   - Menginisialisasi `TSS64` (`RSP0` kernel stack & `IST1` `#DF`) beserta `LTR 0x28`, membangun `IDT64` 256 gate (`#UD`, `#DF`, `#GP`, dan `#PF` Page Fault handler), mem-mask 8259 PIC (`0x21`/`0xA1`) agar timer IRQ tidak menabrak `#DF`, dan mengonfigurasi MSR `IA32_STAR`/`IA32_LSTAR`/`IA32_FMASK` (+ `EFER.NXE`/`SCE`).
   - Membangun dua Page Table 4-level terisolasi per-proses (`PML4_A` di `0x0020_0000` dan `PML4_B` di `0x0021_0000`) dengan izin `U/S=1` terbatas hanya pada halaman kode (`0x0040_0000` RX) dan stack pengguna (`0x0050_0000` RW+NX), sedangkan seluruh kernel & Higher-Half `-2 GiB` dijaga `U/S=0` Supervisor-Only.
   - Memuat biner ELF64 tersemat `user-test.elf` ke Proses A, masuk Ring 3 melalui `IRETQ` (`CS=0x23`, `SS=0x1B`), memvalidasi `CS & 3 == 3`, melayani syscall nyata `SYS_PROCESS_ID (2)`, `SYS_CONSOLE_WRITE (6)` untuk mencetak `"HELLO FROM NUSANTARA USER MODE"` langsung dari memori ruang pengguna, dan `SYS_PROCESS_EXIT (1)`.
   - Memuat `user-fault-test.elf` ke Proses B (`CR3 = PML4_B`), masuk Ring 3 melalui `IRETQ`, membiarkan akses ke `0xFFFFFFFF80000000` memicu Hardware Page Fault (`#PF` vector 14), mengisolasi fault di `isr_pf` via `TSS64.RSP0`, mencatat fault, dan kembali ke Ring 0 tanpa `KernelPanic`.

4. **Pelaporan Diagnostik QEMU & Validasi CI (`scripts/run-phase50-qemu.sh`, `.github/workflows/nusantara-os-ci.yml`, `.github/workflows/kernel-boot-qemu.yml`):**
   - Seluruh log serial QEMU mentah (`serial.log` / `qemu.log`) dan `qemu-debug.log` dicetak dan diunggah (`if: always()`) sebelum skrip berhenti pada kode keluar error, serta memblokir log kosong atau kemunculan `NUSANTARA_KERNEL_PANIC`.

---

### 3. Daftar 18 Sentinel Diagnostik Berurutan (Kontrak Eksekusi Nyata)

1. `NUSANTARA_BOOT_START`
2. `NUSANTARA_MULTIBOOT2_OK`
3. `NUSANTARA_CPU_LONG_MODE_OK`
4. `NUSANTARA_PAGING_OK`
5. `NUSANTARA_GDT64_OK`
6. `NUSANTARA_LONG_MODE_ENTERED`
7. `NUSANTARA_IDT_OK`
8. `NUSANTARA_MEMORY_MANAGER_OK`
9. `NUSANTARA_KERNEL_MAIN_ENTERED`
10. `NUSANTARA_KERNEL_BOOT_OK`
11. `NUSANTARA_USERMODE_ENTERED` *(divalidasi saat Ring 3 `user-test.elf` memanggil `SYS_PROCESS_ID`)*
12. `HELLO FROM NUSANTARA USER MODE` *(dicetak dari buffer ruang pengguna melalui `SYS_CONSOLE_WRITE`)*
13. `NUSANTARA_SYSCALL_OK`
14. `NUSANTARA_PROCESS_EXIT_OK`
15. `NUSANTARA_PROCESS_ISOLATION_OK`
16. `NUSANTARA_USER_FAULT_ISOLATED` *(divalidasi di `#PF` IDT vector 14 saat `user-fault-test.elf` mengakses `0xFFFFFFFF80000000`)*
17. `NUSANTARA_KERNEL_SURVIVED_USER_FAULT`
18. `NUSANTARA_USERMODE_TEST_PASS`
