# Manajemen Interrupt dan Exception (IDT & PIC)

Subsistem interupsi menangani sinyal perangkat keras asinkron (IRQ) serta pengecualian sinkron dari instruksi CPU (faults, traps, aborts).

## 1. Interrupt Descriptor Table (IDT)
- Tabel 256 gerbang (gates) berukuran 16 byte per entri pada mode 64-bit:
  - Gerbang 0 s/d 31: Pengecualian Arsitektur Intel / AMD.
  - Gerbang 32 s/d 47: Pemetaan IRQ Master dan Slave PIC 8259.
  - Gerbang 128 (0x80): Gerbang perangkat lunak panggilan sistem warisan (legacy syscall).
- Setiap entri menyimpan offset pointer ISR 64-bit yang dipecah menjadi `offset_low`, `offset_mid`, dan `offset_high`, serta selector segmen kode kernel `CS = 0x08`.

## 2. Pengecualian CPU Kunci (Exceptions)
- **#DE (Vector 0 - Divide-by-Zero Error)**: Terjadi jika pembagi bernilai 0.
- **#UD (Vector 6 - Invalid Opcode)**: Terjadi jika opcode instruksi tidak dikenali atau instruksi privileged dijalankan di ring pengguna.
- **#DF (Vector 8 - Double Fault)**: Terjadi ketika kegagalan penanganan interupsi terjadi beruntun.
- **#GP (Vector 13 - General Protection Fault)**: Pelanggaran proteksi memori atau batasan segmen.
- **#PF (Vector 14 - Page Fault)**: Akses ke alamat virtual yang belum dipetakan atau melanggar hak izin (register `CR2` menyimpan alamat penyebab kegagalan).

## 3. Programmable Interrupt Controller (PIC 8259)
- Master PIC (Port `0x20`/`0x21`) dan Slave PIC (Port `0xA0`/`0xA1`).
- Port diremap dari vector default BIOS (0..15) ke vector 32 s/d 47 (`0x20` s/d `0x2F`) agar tidak bentrok dengan exception x86.
