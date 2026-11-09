# Hardware Abstraction Layer (HAL)

Hardware Abstraction Layer (HAL) memisahkan kode logika tingkat tinggi kernel dari antarmuka bus dan arsitektur CPU spesifik.

## 1. Antarmuka Komponen HAL
HAL Nusantara didefinisikan melalui kontrak antarmuka TypeScript/Nusantara yang terisolasi:
- **`ICPU`**: Pengendali siklus CPU, instruksi `halt()`, `enableInterrupts()`, `disableInterrupts()`, `areInterruptsEnabled()`.
- **`IMemoryHAL`**: Pengendali I/O port (`inb`, `outb`, `inw`, `outw`, `inl`, `outl`) dan pemetaan frame memory buffer.
- **`ITimerHAL`**: Pengukur ticks perangkat keras, frekuensi clock, dan kalibrasi interrupt pewaktu.
- **`IConsoleHAL`**: Antarmuka output teks cepat untuk logging kernel darurat ke frame buffer VGA atau UART.
- **`IInputHAL`**: Antarmuka penerimaan data scancode dari pengontrol keyboard atau mouse.

## 2. Kelas `X86_64HAL`
Implementasi standar x86_64 menyediakan emulasi register I/O port terintegrasi:
- Port `0x3F8` s/d `0x3FF`: Port serial COM1.
- Port `0x20` / `0x21`: PIC Master Command & Data.
- Port `0x40` / `0x43`: PIT Channel 0 & Command Port.
- Port `0x60` / `0x64`: PS/2 Data & Status Register.
