# Panduan Debugging Kernel dengan GDB

## 1. Memulai QEMU dalam Mode GDB Server
Jalankan QEMU dengan argumen `-s -S`:
- `-s`: Membuka server GDB pada port TCP 1234.
- `-S`: Menghentikan CPU pada instruksi pertama saat booting (menunggu instruksi continue dari debugger).

```bash
./scripts/debug-qemu biner/kernel.elf
```
Atau via CLI:
```bash
nusantara os debug biner/kernel.elf
```

## 2. Menyambungkan GDB Debugger
Buka terminal baru di direktori yang sama:
```bash
gdb -ex "target remote localhost:1234" -ex "symbol-file biner/kernel.elf"
```

## 3. Perintah Berguna Saat Debugging
- Memasang breakpoint pada titik masuk fisik 32-bit:
  ```gdb
  (gdb) break *_start
  ```
- Memasang breakpoint pada fungsi utama 64-bit:
  ```gdb
  (gdb) break *kernel_main
  ```
- Melanjutkan eksekusi:
  ```gdb
  (gdb) continue
  ```
- Memeriksa isi register 64-bit:
  ```gdb
  (gdb) info registers
  (gdb) print/x $cr0
  (gdb) print/x $cr3
  (gdb) print/x $cr4
  (gdb) print/x $rip
  (gdb) print/x $rsp
  ```
- Memeriksa isi memori (misal VGA buffer di 0xB8000):
  ```gdb
  (gdb) x/16xw 0xB8000
  ```
