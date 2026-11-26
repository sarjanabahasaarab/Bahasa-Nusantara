# Phase 108 — QEMU EL0 Execution dan SVC Round Trip

## Sasaran

Membuktikan instruksi AArch64 EL0 benar-benar dieksekusi pada QEMU virt,
melakukan SVC ke EL1, menjalankan syscall WRITE yang memvalidasi rentang
alamat pesan, kembali ke EL0, lalu melakukan syscall EXIT.

## Alur

1. Entry image melakukan transisi EL2 → EL1h.
2. Kernel memasang VBAR_EL1 dan exception router.
3. Kernel menyiapkan frame awal EL0 dengan SP_EL0 dan SPSR_EL1=EL0t.
4. ERET masuk ke payload assembly EL0.
5. Payload memanggil SVC #0 untuk WRITE; handler EL1 memvalidasi alamat dan
   panjang lalu menulis sentinel melalui PL011.
6. Payload menerima hasil di x0 dan memanggil SVC #0 untuk EXIT.
7. Kernel mencetak sentinel akhir dari callback EXIT.

## Batasan keamanan

Ini adalah demonstrasi EL0/SVC, bukan isolasi proses yang aman. Image berjalan
tanpa page-table user khusus; kode dan data demo masih berada dalam satu image
fisik dan callback validasi hanya mengizinkan rentang pesan statis. Belum ada
MMU mapping terpisah, U/S permission enforcement, ELF loader, safe copy dari
memori yang tidak dipetakan, atau address-space switch. Jangan jalankan kode
pengguna yang tidak tepercaya dengan konfigurasi demo ini.

## Validasi

Workflow Phase 108 membangun image freestanding dan menjalankannya dengan
QEMU virt AArch64. Keberhasilan mensyaratkan sentinel BOOT, EL0_ENTER,
EL0_SVC_WRITE_OK, dan EL0_EXIT_OK; pesan FAIL atau sentinel yang hilang
menggagalkan job.
