# Format Biner ELF64 Kernel NUSANTARA OS

## 1. Identifikasi Berkas (ELF Header 64-bit)
- `e_ident[EI_MAG0..3]`: `\x7fELF` (0x7F, 0x45, 0x4C, 0x46).
- `e_ident[EI_CLASS]`: `2` (ELFCLASS64, format biner 64-bit).
- `e_ident[EI_DATA]`: `1` (ELFDATA2LSB, Little-Endian).
- `e_ident[EI_VERSION]`: `1` (EV_CURRENT).
- `e_ident[EI_OSABI]`: `0` (ELFOSABI_NONE / System V ABI).
- `e_type`: `2` (ET_EXEC, file executable).
- `e_machine`: `0x3E` (EM_X86_64, AMD64 architecture).
- `e_entry`: `0x00101000` (Alamat fisik entry point `_start`).

## 2. Segmen Program (PT_LOAD)
Kernel membagi pemuatan memori menjadi 2 segmen utama:
1. **Boot & Kode Eksekusi (R-X)**:
   - File offset: `0x1000`
   - Virtual / Physical Address: `0x00100000`
   - Permissions: `PF_R | PF_X` (Readable, Executable).
2. **Data & Higher-Half Kernel (RW-)**:
   - File offset: `0x2000`
   - Virtual Address: `0xFFFF800000100000`
   - Permissions: `PF_R | PF_W` (Readable, Writable).

## 3. Perintah Inspeksi ELF64
```bash
nusantara os inspect biner/kernel.elf
```
