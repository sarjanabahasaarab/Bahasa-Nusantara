# Panduan Praktis: Membuat Kernel Pertama Anda (Phase 48)

Tutorial langkah demi langkah untuk membuat, mengompilasi, menginspeksi, dan menjalankan kernel sistem operasi minimal menggunakan Nusantara OS Toolchain.

## Langkah 1: Membuat Proyek Kernel Baru
Jalankan perintah scaffolding CLI:
```bash
nusantara os new kernel-pertama
cd kernel-pertama
```

Perintah ini akan membuat struktur proyek lengkap:
- `nusantara.os.json`: Konfigurasi kernel, memori, dan driver.
- `target/kernel/x86_64/linker.ld`: Linker script higher-half (-2 GiB base).
- `src/kernel.nusantara`: Kode sumber titik masuk utama (`kernel_main`).
- `src/drivers/`: Driver perangkat keras serial dan VGA dasar.

## Langkah 2: Menulis Kode Kernel
Buka berkas `src/kernel.nusantara`:
```nusantara
gunakan std:os;

fungsi kernel_main() {
    tulisKonsol("[NUSANTARA OS] Halo Dunia dari Ring 0!");
    
    // Alokasi memori heap dinamis 8 KiB
    buffer = alokasiMemori(8192, 16);
    tulisKonsol("[NUSANTARA OS] Buffer heap berhasil dibuat.");

    // Tampilkan diagnostik memori
    tulisKonsol(laporanMemori());

    kembalikan 0;
}
```

## Langkah 3: Membangun Biner ELF64
Bangun biner executable kernel:
```bash
nusantara os build --output=biner/kernel.elf
```

Proses ini menyematkan header spesifikasi Multiboot2 (`0xE85250D6`), segmen program `PT_LOAD`, dan simbol entry point `_start`.

## Langkah 4: Menginspeksi Biner Kernel
Periksa struktur header dan segmen ELF:
```bash
nusantara os inspect biner/kernel.elf
```

## Langkah 5: Menjalankan pada Emulator QEMU
Uji eksekusi kernel:
```bash
nusantara os run biner/kernel.elf
```
Jika QEMU terpasang pada sistem host, emulator akan menjalankan biner kernel secara langsung dengan output serial COM1 diarahkan ke terminal Anda. Jika QEMU belum terpasang, sistem secara otomatis mengeksekusi kernel core virtual runtime untuk memverifikasi alur inisialisasi tanpa galat.
