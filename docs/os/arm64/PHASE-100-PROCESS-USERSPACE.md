# Phase 100 — Process and Userspace Foundation

Status: implementation and host contract tests proposed in stacked PR.

## Tujuan
Menyediakan metadata proses dan transisi lifecycle awal yang dapat dihubungkan dengan scheduler Phase 99 serta page-table root dari VMM Phase 98.

## Isi
- Tabel proses statis dengan kapasitas 32 entri.
- PID monotonik, parent PID, scheduler task ID, root page table, tipe USER/KERNEL, status, dan exit code.
- Validasi parent, ID task, root page-table alignment, dan batas alamat fisik.
- Transisi CREATED → READY → RUNNING, RUNNING/READY → BLOCKED → READY, serta EXITED.
- Slot proses EXITED dipertahankan agar PID lama tidak dipakai ulang pada fase ini.

## Batas integrasi dan keselamatan
- Modul ini belum membuat page table, memetakan image executable, menyiapkan stack EL0, mengatur register SPSR_EL1/ELR_EL1, atau menjalankan exception return ke EL0.
- Scheduler task ID harus berasal dari scheduler Phase 99; pemanggil bertanggung jawab memastikan task tersebut memang ada.
- Root page table harus dibuat dan dimiliki oleh subsistem memori. Modul proses hanya menyimpan alamat fisiknya.
- Belum ada syscall ABI, handle table, IPC, permission model UID/GID, process reaper, atau isolasi SMP.
- Status proses adalah metadata; perubahan status tidak otomatis melakukan context switch.

## Validasi
Pengujian host C11 mencakup pembuatan proses, parent-child, validasi root page-table, validasi scheduler task ID nonzero, transisi lifecycle, exit code, dan penolakan parent yang sudah keluar. CI melakukan cross-compile AArch64 freestanding.
