# Kernel Heap Allocator (Phase 48)

Kernel Heap menyediakan alokasi memori berukuran dinamis dan terarah di dalam ruang alamat virtual kernel (`0xFFFF_9000_0000_0000`).

## 1. Mekanisme Alokasi
- **Bump Allocator Awal**: Mengalokasikan blok memori baru secara berurutan dengan menambahkan offset pointer saat ini.
- **Free-List Recycling**: Ketika blok dibebaskan dengan `free()`, blok dicatat dalam daftar bebas dan digunakan kembali (recycled) pada alokasi berikutnya yang berukuran cocok dan memenuhi syarat perataan (alignment).
- **Perataan Alamat (Alignment)**: Mendukung alignment pangkat dua (8, 16, 64, hingga 4096 byte).

## 2. Keamanan dan Pencegahan Kerusakan Heap
- **Header Magic Validation**: Setiap blok memiliki header khusus berkode magic `0x4E555341` ('NUSA'). Jika nilai ini rusak, kernel mendeteksi terjadinya *heap corruption*.
- **Pencegahan Double-Free**: Memeriksa bendera status `isFree`. Pemanggilan pembebasan ganda pada alamat yang sama akan langsung dicegah dan dilaporkan.
- **Deteksi Invalid Pointer**: Alamat yang tidak pernah dialokasikan melalui allocator ini akan ditolak dengan galat jelas `Invalid Pointer`.
- **Pengawasan Fragmentasi**: Metode `getFragmentationRatio()` menghitung rasio pemborosan ruang akibat fragmentasi eksternal.
