# Manajemen Memori Virtual (Virtual Memory Manager - VMM)

Virtual Memory Manager mengelola pemetaan alamat virtual ke alamat fisik menggunakan struktur 4-Level Paging arsitektur x86_64.

## 1. Struktur 4-Level Paging (x86_64)
Alamat virtual 64-bit dipetakan melalui 4 tingkat tabel halaman:
```
63         48 47     39 38     30 29     21 20     12 11        0
+------------+---------+---------+---------+---------+----------+
| Sign Ext   |  PML4   |  PDPT   |   PD    |   PT    |  Offset  |
|  (16 bit)  | (9 bit) | (9 bit) | (9 bit) | (9 bit) | (12 bit) |
+------------+---------+---------+---------+---------+----------+
```
- **PML4** (Page Map Level 4): Register `CR3` menyimpan alamat fisik tabel PML4 saat ini.
- **PDPT** (Page Directory Pointer Table): 512 entri per tabel (1 GiB per entri).
- **PD** (Page Directory): 512 entri per tabel (2 MiB per entri).
- **PT** (Page Table): 512 entri per tabel (4 KiB per entri).
- **Offset**: 12 bit menunjukkan byte di dalam frame 4 KiB.

## 2. Hak Akses Halaman (Page Permissions)
Setiap entri tabel halaman dilengkapi bit pengendali izin:
- **`PRESENT` (Bit 0)**: Menandakan halaman berada di memori fisik. Jika 0 dan diakses, CPU memicu `#PF` (Page Fault).
- **`WRITABLE` (Bit 1)**: Mengizinkan operasi tulis. Jika 0, halaman bersifat hanya-baca (read-only).
- **`USER` (Bit 2)**: Jika 1, dapat diakses ring 3 (userspace). Jika 0, hanya dapat diakses ring 0 (kernel).
- **`NO_EXECUTE` (Bit 63)**: Mencegah eksekusi kode pada segmen data atau heap (eksploitasi buffer overflow).
