# Dokumentasi Pengembang: Arsitektur Debugger & Profiler NUSANTARA

Dokumen ini ditujukan untuk para pengembang dan kontributor yang mengembangkan komponen internal `src/debugger/` pada Bahasa Pemrograman NUSANTARA.

---

## 1. Struktur Modul `src/debugger/`

```
src/debugger/
├── types.ts              # Definisi interface, enum status, breakpoint, stack frame, DAP, & profil
├── breakpointManager.ts  # Logika verifikasi baris executable AST, kondisi, & siklus breakpoint
├── profiler.ts           # Mesin timer monotonik, kalkulasi waktu mandiri (self-time) & memori
├── sesiDebug.ts          # State machine SesiDebug (created, running, paused, finished, failed, terminated)
├── penelusur.ts          # Orchestrator PenelusurNUSANTARA dengan stepping controller
├── adapterDAP.ts         # Pemroses pesan standar Debug Adapter Protocol (DAP)
├── cliDebugger.ts        # Driver antarmuka CLI (nusantara debug & nusantara profil)
└── index.ts              # Titik ekspor terpadu subsistem
```

---

## 2. Model Siklus Hidup Sesi Debug (DebugSession Lifecycle)

```
[ created ]
    │
    ▼ (mulai / resume)
[ running ] ────── (terjadi galat) ──────► [ failed ]
    │   ▲                                      │
    │   │                                      │ (inspeksi post-mortem)
(jeda / bp / step)                             ▼
    ▼   │                                [ terminated ]
[ paused ]
    │
    ▼ (selesai eksekusi)
[ finished ]
```

### Penanganan Jeda & Checkpoint
Pada lingkungan eksekusi single-threaded, `Interpreter` memanggil `kaitDebug.sebelumPernyataan(stmt, konteks)` sebelum setiap simpul AST dieksekusi.
Kondisi jeda dipicu bila:
1. Lokasi baris pernyataan cocok dengan Breakpoint aktif yang kondisinya terpenuhi.
2. Mode langkah aktif (`step_into`, `step_over`, atau `step_out`).
3. Permintaan jeda eksplisit (`mintaJeda()`).

---

## 3. Kalkulasi Waktu Mandiri (Self-Time) pada Profiler

Profiler menggunakan tumpukan waktu (`tumpukanWaktu: BingkaiProfil[]`):

1. Saat fungsi `A` dipanggil:
   - Catat `mulaiA = performance.now()`, `waktuAnak = 0`.
   - Dorong ke tumpukan.
2. Saat fungsi `B` dipanggil di dalam `A`:
   - Catat `mulaiB = performance.now()`, `waktuAnak = 0`.
   - Dorong ke tumpukan.
3. Saat `B` selesai:
   - `durasiB = sekarang - mulaiB`.
   - `mandiriB = durasiB - frameB.waktuAnak`.
   - Pop `B`.
   - Tambahkan `durasiB` ke `frameA.waktuAnak`.
4. Saat `A` selesai:
   - `durasiA = sekarang - mulaiA`.
   - `mandiriA = durasiA - frameA.waktuAnak`.
   - Pop `A`.

Dengan algoritma ini, waktu eksekusi rekursif atau bersarang tidak akan menduplikasi waktu mandiri (self-time), menghasilkan data profil yang akurat dan terpercaya.

---

## 4. Keamanan & Nol Overhead

Ketika opsi `profiler` atau `kaitDebug` tidak diteruskan ke `Interpreter`, overhead eksekusi adalah **nol** (hanya satu evaluasi `if (this.kaitDebug)` yang bernilai `false`), mempertahankan kecepatan eksekusi native pada mode produksi dan continuous integration.
