# Phase 112 — Ruang alamat proses ARM64

## Sasaran
Menyediakan fondasi ruang alamat terpisah per proses, pemetaan halaman EL0, pergantian TTBR0_EL1, dan pelepasan sumber daya ketika ruang alamat dihentikan.

## Implementasi
- Manajer menyimpan hingga 16 ruang alamat; metadata setiap ruang alamat menyimpan ID, root TTBR0, daftar halaman tabel, dan hingga 128 pemetaan user.
- Root dan tabel tingkat bawah dialokasikan melalui callback frame allocator dan dipetakan kembali ke alias kernel yang dapat ditulis.
- Pemetaan user hanya menerima akses USER_RW atau USER_RO. Kebijakan W^X diterapkan: halaman USER_RW tidak boleh executable.
- Pemetaan virtual duplikat dan kepemilikan frame ganda ditolak.
- Pengalihan ruang alamat memakai callback instalasi root; implementasi ARM64 dapat menggunakan `nusantara_arm64_mmu_install_ttbr0`, yang menjalankan DSB/TLBI/ISB lokal.
- Penghancuran ruang alamat aktif ditolak. Setelah kernel beralih ke root lain, frame user yang dimiliki dan seluruh halaman tabel dilepas.

## Pengujian
Workflow Phase 112 menjalankan uji host untuk dua ruang alamat yang memetakan VA sama ke PA berbeda, izin EL0, W^X, duplikasi, pergantian root, larangan menghancurkan ruang aktif, dan pelepasan frame. Workflow juga melakukan cross-compile AArch64.

## Batas yang disengaja
- Host test memvalidasi kontrak pengelola, bukan bukti pergantian TTBR0 pada CPU.
- Satu CPU saja; belum ada ASID, SMP TLB shootdown, copy-on-write, demand paging, guard page, ELF loader, atau pemulihan dari kegagalan alokasi parsial.
- Callback `install_root` harus mengerjakan invalidasi TLB dan ordering yang sesuai; implementasi bawaan Phase 110 melakukan invalidasi lokal menyeluruh tanpa ASID.
- Caller bertanggung jawab memastikan frame fisik yang dipetakan benar-benar tersedia dan tidak sedang dipakai kernel atau ruang alamat lain.
- Proses yang sedang aktif wajib dialihkan ke ruang alamat kernel/ruang lain sebelum dihancurkan.
