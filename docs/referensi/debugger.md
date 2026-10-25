# Panduan Referensi Debugger & Profiler NUSANTARA

Dokumen ini memuat spesifikasi arsitektur, perintah, protokol, dan panduan penggunaan subsistem **Debugger, Runtime Inspection & Profiler** Bahasa NUSANTARA (Phase 25, target versi `v0.25.0`).

---

## 1. Ikhtisar Arsitektur

Subsistem Penelusur NUSANTARA menghubungkan kode sumber Bahasa Indonesia dengan instrumen eksekusi runtime:

```
Program NUSANTARA (.nusantara)
            ↓
Runtime & AST Parser
            ↓
Debug Instrumentation (KaitDebug & Profiler Hooks)
            ↓
Mesin Penelusur (PenelusurNUSANTARA)
            ↓
CLI (`nusantara debug` / `nusantara profil`) ⇄ DAP Adapter ⇄ IDE / Studio
```

---

## 2. Perintah CLI

### 2.1 Menjalankan Debugger

```bash
# Debugging interaktif program
nusantara debug program.nusantara

# Debugging non-interaktif terarah (batch commands)
nusantara debug program.nusantara --perintah="break 12; continue; print x; quit"
```

Alias perintah: `nusantara debug`, `nusantara debig`, `nusantara telusur`.

### 2.2 Menjalankan Profiler

```bash
# Profiling konsol standar
nusantara profil program.nusantara

# Profiling dengan keluaran JSON
nusantara profil program.nusantara --json

# Memfilter fungsi di atas ambang batas durasi tertentu (ms)
nusantara profil program.nusantara --ambang=1.0
```

Alias perintah: `nusantara profil`, `nusantara profile`, `nusantara profiler`.

---

## 3. Perintah Sesi Debugger Interaktif

Ketika program mencapai titik henti (breakpoint) atau langkah eksekusi, prompt debugger aktif dengan perintah berikut:

| Perintah Bahasa Inggris | Perintah Bahasa Indonesia | Deskripsi |
| :--- | :--- | :--- |
| `c`, `continue` | `lanjut` | Melanjutkan eksekusi program hingga breakpoint berikutnya atau selesai |
| `s`, `step` | `langkah`, `step-in` | Melangkah masuk ke pernyataan berikutnya (step-into) |
| `n`, `next` | `lewati`, `step-over` | Melangkah lewati pemanggilan fungsi (step-over) |
| `fin`, `finish` | `keluar-fungsi`, `step-out` | Menjalankan fungsi hingga kembali ke pemanggil (step-out) |
| `b`, `break <baris>` | `henti <baris>` | Menambahkan titik henti (breakpoint) pada nomor baris |
| `break <baris> when <exp>` | `henti <baris> jika <exp>` | Memasang breakpoint kondisional yang hanya jeda jika ekspresi benar |
| `d`, `delete <id>` | `hapus <id>` | Menghapus breakpoint berdasarkan nomor ID |
| `breakpoints`, `info b` | `daftar-henti` | Menampilkan seluruh breakpoint yang terpasang |
| `l`, `locals` | `variabel`, `lokal` | Menampilkan seluruh variabel lokal pada bingkai saat ini |
| `g`, `globals` | `global` | Menampilkan variabel lingkup global |
| `p`, `print <ekspresi>` | `cetak <ekspresi>` | Mengevaluasi ekspresi pada konteks lingkungan bingkai aktif |
| `w`, `watch <ekspresi>` | `pantau <ekspresi>` | Mendaftarkan ekspresi untuk dipantau secara otomatis setiap jeda |
| `unwatch <id>` | `hapus-pantau <id>` | Menghapus ekspresi pantau berdasarkan ID |
| `bt`, `stack` | `tumpukan` | Menampilkan jejak tumpukan panggilan (call stack) lengkap |
| `f`, `frame <nomor>` | `bingkai <nomor>` | Memilih bingkai tumpukan untuk inspeksi data dan evaluasi ekspresi |
| `q`, `quit` | `keluar` | Menghentikan sesi penelusuran program |
| `help`, `?` | `bantuan` | Menampilkan petunjuk penggunaan perintah |

---

## 4. Validasi Lokasi Titik Henti (Breakpoint Validation)

NUSANTARA memvalidasi posisi breakpoint terhadap AST simpul pernyataan executable.
Jika pengguna memasang titik henti pada baris kosong atau baris komentar:
1. Debugger **tidak mengalami crash**.
2. Sistem memberikan pesan informatif:
   `Breakpoint tidak dapat ditempatkan pada lokasi tersebut.`
3. Sistem secara otomatis mencari dan menawarkan baris terdekat yang dapat dieksekusi:
   `Baris terdekat yang dapat dieksekusi adalah baris 6.`

---

## 5. Metrik & Pengukuran Profiler

Profiler eksekusi runtime menggunakan **timer monotonik berpresisi tinggi** (`performance.now()`) untuk mencegah distorsi waktu akibat penyesuaian jam sistem atau NTP.

Metrik yang dikumpulkan:
- **Jumlah Panggilan (`jumlahPanggilan`)**: Frekuensi pemanggilan fungsi.
- **Waktu Total (`waktuTotalMs`)**: Durasi sejak fungsi dipanggil hingga kembali.
- **Waktu Mandiri (`waktuMandiriMs`)**: Waktu total dikurangi durasi yang dihabiskan di dalam sub-fungsi anak.
- **Waktu Rata-rata (`waktuRataRataMs`)**: `waktuTotalMs / jumlahPanggilan`.
- **Statistik Memori**: Penggunaan heap terkini, alokasi puncak (peak heap usage), dan RSS (jika runtime host mendukung).

---

## 6. Debug Adapter Protocol (DAP)

Kelas `AdapterDAPNUSANTARA` mengimplementasikan protokol standar DAP untuk integrasi editor:
- `initialize`: Negosiasi kemampuan debugger (capabilities).
- `launch`: Memuat kode sumber dan berkas target.
- `setBreakpoints`: Pendaftaran dan verifikasi titik henti.
- `continue`, `next`, `stepIn`, `stepOut`, `pause`: Kendali alur eksekusi.
- `stackTrace`: Penyerahan daftar bingkai tumpukan.
- `scopes` & `variables`: Inspeksi lingkup variabel lokal dan global.
- `evaluate`: Evaluasi ekspresi dinamis.
- `disconnect`: Penutupan sesi penelusuran.
