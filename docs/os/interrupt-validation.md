# Validasi Interupsi, Exception, & Driver Perangkat

## 1. Interrupt Descriptor Table (IDT)
- IDT x86_64 memuat 256 gerbang deskriptor 16-byte (total ukuran 4096 byte).
- Struktur Gerbang:
  - Offset low (bit 0..15), Selector segmen (bit 16..31).
  - IST (Interrupt Stack Table) & Tipe atribut (bit 32..47).
  - Offset mid (bit 48..63).
  - Offset high (bit 64..95), Reserved 32-bit (bit 96..127).
- IDTR (IDT Register): Limit 16-bit (`0x0FFF`) dan Base linear 64-bit.

## 2. Pemetaan Ulang PIC 8259 (Programmable Interrupt Controller)
Secara bawaan IBM PC, IRQ 0..7 bertabrakan dengan Exception CPU 0..7. NUSANTARA OS memetakan ulang:
- Master PIC: Offset interupsi `0x20` (vektor 32..39).
- Slave PIC: Offset interupsi `0x28` (vektor 40..47).

## 3. Penanganan Exception CPU x86_64
- **Vektor 0 (#DE)**: Divide Error (pembagian dengan nol).
- **Vektor 6 (#UD)**: Invalid Opcode (instruksi tidak dikenal).
- **Vektor 8 (#DF)**: Double Fault.
- **Vektor 13 (#GP)**: General Protection Fault.
- **Vektor 14 (#PF)**: Page Fault (menyimpan alamat virtual pemicu dari register `CR2`).
Setiap exception memicu `KernelPanic` yang mencetak register dump 64-bit lengkap ke serial port COM1.
