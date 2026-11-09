# Manajemen Proses dan Thread (PCB & TCB)

Kernel Nusantara mengadopsi model multi-threading dengan pemisahan antara wadah kepemilikan sumber daya (Process) dan unit eksekusi yang dijadwalkan (Thread).

## 1. Process Control Block (PCB)
Struktur `Process` mengelola:
- **`pid`**: Identitas numerik unik proses.
- **`name`**: Nama biner proses.
- **`state`**: Status siklus hidup (`CREATED`, `READY`, `RUNNING`, `BLOCKED`, `TERMINATED`).
- **`pageDirectoryRoot`**: Pointer alamat fisik tabel halaman (CR3) milik proses.
- **`fileDescriptors`**: Tabel pemetaan deskriptor berkas terbuka (VFS fd table).
- **`threads`**: Daftar thread yang berjalan di dalam konteks proses ini.

## 2. Thread Control Block (TCB)
Struktur `Thread` mengelola:
- **`tid`**: Identitas thread.
- **`processId`**: Referensi ke proses induk.
- **`priority`**: Prioritas penjadwalan (tingkat 1 terendah s/d 5 tertinggi).
- **`quantum`**: Sisa siklus ticks eksekusi CPU sebelum dipreempt.
- **`registers`**: Salinan register konteks CPU 64-bit saat thread dihentikan sementara (`RAX`..`R15`, `RIP`, `RSP`, `RFLAGS`).
- **`stackBase` & `stackSize`**: Ruang stack lokal thread.

## 3. Context Switch
Pergantian konteks mengeksekusi urutan:
1. Menyimpan seluruh register umum thread aktif ke dalam struktur TCB lamanya.
2. Memuat alamat tabel halaman proses tujuan ke register `CR3` jika berganti proses.
3. Memulihkan register umum dari TCB thread terpilih.
4. Memperbarui pointer stack `RSP` dan melompat ke `RIP` tujuan.
