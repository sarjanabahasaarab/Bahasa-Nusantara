# Driver Konsol VGA Text Mode dan PIT Timer

## 1. VGA Text Mode (80x25)
- **Buffer Alamat Fisik**: `0xB8000` (atau virtual `0xFFFFFFFF800B8000` pada kernel higher-half).
- **Format Karakter**: 2 byte per karakter (1 byte kode ASCII + 1 byte atribut warna).
  - Byte Atribut: `[4-bit Background | 4-bit Foreground]`.
  - Warna default: `0x0F` (Teks putih di atas latar hitam) atau `0x07` (Abu-abu terang di atas hitam).
- **Penanganan Baris Baru (`\n`)**: Menambah baris kursor (`row++`) dan mengembalikan kolom kursor ke posisi awal (`col = 0`). Jika baris mencapai 25, seluruh layar digulir (scroll) ke atas sejauh 1 baris.

## 2. Programmable Interval Timer (PIT 8254)
- **Frekuensi Dasar**: 1.193182 MHz (1193182 Hz).
- **Port I/O**:
  - `0x40`: Data Channel 0 (terhubung ke IRQ0 CPU).
  - `0x43`: Command Register Mode/Command.
- **Konfigurasi 100 Hz**:
  - `Divisor = 1193182 / 100 = 11931` (`0x2E9B`).
  - Tulis nilai `0x36` ke port `0x43` (Channel 0, Square Wave Mode 3, 16-bit binary).
  - Tulis byte rendah `0x9B` ke port `0x40`, kemudian byte tinggi `0x2E` ke port `0x40`.
  - Menghasilkan interupsi pewaktu tepat setiap 10 milidetik (digunakan oleh kernel scheduler).
