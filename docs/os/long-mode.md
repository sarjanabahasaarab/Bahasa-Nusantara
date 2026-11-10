# Transisi Long Mode x86_64 pada NUSANTARA OS

## 1. Urutan Transisi Perangkat Keras
Transisi dari 32-bit Protected Mode ke 64-bit Long Mode dilakukan dalam 8 tahap terurut:

1. **Matikan Interupsi**:
   `CLI` memastikan tidak ada interupsi perangkat keras yang mengganggu selama alih mode.
2. **Uji Fitur CPU via CPUID**:
   - Flip bit 21 di EFLAGS untuk memastikan instruksi `CPUID` didukung.
   - Panggil `CPUID (EAX = 0x80000000)` untuk membaca tingkat extended tertinggi.
   - Panggil `CPUID (EAX = 0x80000001)`, periksa bit 29 di register `EDX` (Long Mode bit).
3. **Bangun Struktur Tabel Halaman 4-Level**:
   - `PML4` (Page Map Level 4) di physical address `0x00106000`.
   - `PDPT` (Page Directory Pointer Table) di `0x00107000`.
   - `PD` (Page Directory) di `0x00108000` dengan bit `0x83` (2 MiB Huge Page).
4. **Muat Alamat Fisik PML4 ke Register CR3**:
   `mov %eax, %cr3`.
5. **Aktifkan PAE (Physical Address Extension)**:
   Set bit 5 pada register `CR4` (`CR4.PAE = 1`).
6. **Aktifkan Long Mode (LME) di Model Specific Register**:
   Tulis bit 8 pada `IA32_EFER MSR (0xC0000080)` melalui instruksi `RDMSR` dan `WRMSR`.
7. **Aktifkan Paging di Register CR0**:
   Set bit 31 (`CR0.PG`) dan bit 0 (`CR0.PE`). Pada saat ini, CPU berada dalam status *compatibility mode*.
8. **Muat GDT 64-bit & Far Jump**:
   - Muat GDT dengan deskriptor kode 64-bit (`L=1`, `D=0`).
   - Eksekusi `ljmp $0x08, $long_mode_entry` untuk memasuki sub-mode 64-bit murni.
