# Virtual File System (VFS) dan RamFS

Virtual File System (VFS) menyediakan antarmuka terpadu untuk mengakses berbagai sistem berkas konkret di bawah hierarki pohon tunggal berakar pada `/`.

## 1. Arsitektur VFS
- **Tabel Titik Pasang (Mount Table)**: Memetakan prefix jalur direktori (seperti `/`, `/dev`, `/tmp`, `/sys`) ke objek implementasi `IFileSystem`.
- **Pencocokan Prefix Terpanjang (Longest Match)**: Resolusi berkas mengarahkan permintaan ke mount point yang paling spesifik.
- **Tabel Deskriptor Berkas (FD Table)**: Mengelola nomor deskriptor berkas terbuka (fd >= 3), posisi baca/tulis saat ini (offset), dan mode akses (`'r'`, `'w'`, `'rw'`, `'a'`).

## 2. In-Memory Filesystem (RamFS)
RamFS menyimpan struktur direktori dan isi berkas secara langsung di dalam RAM kernel:
- **Inode & Node Pohon**: Setiap simpul menyimpan metadata (ukuran, hak akses, waktu modifikasi) dan data biner `Uint8Array`.
- **Operasi Mandiri**: Mendukung pembuatan direktori (`mkdir`), berkas reguler, operasi baca ber-offset, tulis/tambah dinamis, dan penghapusan berkas (`unlink`).
- Sangat ideal digunakan sebagai initramfs atau root filesystem awal pada saat booting sebelum driver disk sekunder (AHCI / NVMe) dimuat.
