# Driver Serial Port UART 16550 (COM1)

Port serial COM1 adalah saluran diagnostik utama pada tahap awal booting kernel sebelum subsistem grafis atau desktop siap.

## 1. Peta Register COM1 (Base: 0x3F8)
- `0x3F8` (DLAB=0): Data Register (R: Receiver Buffer, W: Transmitter Holding).
- `0x3F8` (DLAB=1): Divisor Latch Low (DLL).
- `0x3F9` (DLAB=0): Interrupt Enable Register (IER).
- `0x3F9` (DLAB=1): Divisor Latch High (DLM).
- `0x3FA`: FIFO Control Register (FCR).
- `0x3FB`: Line Control Register (LCR).
- `0x3FC`: Modem Control Register (MCR).
- `0x3FD`: Line Status Register (LSR).

## 2. Inisialisasi Kecepatan Baud (115200 8N1)
- Frekuensi osilator clock dasar UART = 1.8432 MHz.
- Rumus divisor: `Divisor = 115200 / Target_Baud`.
- Untuk kecepatan maksimum 115200 baud, `Divisor = 1` (`DLL = 1`, `DLM = 0`).
- Format 8N1 diatur dengan menulis nilai `0x03` (8 bit data, tanpa paritas, 1 bit stop) ke port LCR (`0x3FB`).

## 3. Pengiriman Karakter
Sebelum mengirim byte ke port `0x3F8`, kernel memeriksa bit 5 (Transmitter Holding Register Empty) pada Line Status Register (`0x3FD`). Setelah kosong, byte dikirim tanpa hambatan.
