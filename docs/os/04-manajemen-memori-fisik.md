# Manajemen Memori Fisik (Physical Memory Manager - PMM)

Physical Memory Manager (PMM) bertanggung jawab melacak ketersediaan setiap bingkai halaman fisik (physical page frame) berukuran 4 KiB (4096 byte).

## 1. Arsitektur Bitmap Frame Allocator
PMM menggunakan struktur data **Bitmap**:
- Setiap bit melambangkan satu frame memori fisik sebesar 4 KiB:
  - Nilai bit `0`: Frame bebas (tersedia untuk dialokasikan).
  - Nilai bit `1`: Frame terpakai (dialokasikan atau dipesan hardware).
- 1 byte dalam bitmap mampu melacak 8 frame = 32 KiB memori fisik.
- 1 MiB bitmap mampu mengelola 32 GiB RAM fisik.

## 2. Fitur Utama
- **`allocateFrame()`**: Mencari bit 0 pertama, menandainya sebagai 1, dan mengembalikan alamat fisik dasar frame (`frameIndex * 4096`).
- **`allocateContiguous(count)`**: Mencari rentang `count` bit 0 berturut-turut untuk alokasi buffer DMA yang membutuhkan memori fisik berurutan.
- **`freeFrame(physicalAddress)`**: Memeriksa batas alamat dan membersihkan bit menjadi 0.
- **`reserveRegion(start, length)`**: Menandai daerah firmware (BIOS/UEFI, ACPI tables, video ROM, frame buffer VGA `0xA0000 - 0xFFFFF`) sebagai terpakai agar tidak tertimpa alokasi dinamis.
