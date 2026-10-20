# Kebijakan Kompatibilitas Versi Bahasa NUSANTARA

Dokumen ini memuat piagam komitmen stabilitas dan tata kelola kompatibilitas versi bagi bahasa **NUSANTARA**.

Status: **[DITETAPKAN] — Acuan Kebijakan Rilis (Phase 2)**

---

## 1. Prinsip Utama Kompatibilitas

Kestabilan dan kepastian hukum kode sumber adalah syarat mutlak bagi adopsi bahasa oleh industri, akademisi, dan institusi. Bahasa NUSANTARA menganut prinsip stabilitas jangka panjang:

1. **Perlindungan Kode Sah (Stabilitas Sintaks):**
   Perubahan versi minor atau patch tidak boleh mengubah makna atau merusak kode sumber `.nusantara` yang telah dinyatakan sah menurut spesifikasi resmi yang berlaku.
2. **Dokumentasi Komprehensif Perubahan:**
   Setiap penambahan konstruksi atau modifikasi sekecil apa pun wajib dicatat secara transparan pada dokumen [PERUBAHAN.md](../PERUBAHAN.md).
3. **Kewajiban Pengajuan NIP untuk Perubahan Merusak (*Breaking Changes*):**
   Setiap perubahan yang berpotensi merusak kompatibilitas ke belakang (*backward compatibility*) **wajib diajukan melalui proposal formal NIP (Nusantara Improvement Proposal)**, melalui masa uji coba publik, serta mendapat persetujuan badan pengawas bahasa.
4. **Keterlacakan Spesifikasi (*Traceability*):**
   Spesifikasi teknis pada setiap nomor rilis versi disimpan secara permanen pada arsip repositori ber-tag rilis Git resmi.
5. **Kewajiban Pengujian & Bukti Kode:**
   Setiap usulan perubahan sintaksis harus disertai dengan contoh kode konkret dan skenario pengujian regresi di folder `pengujian/`.

---

## 2. Skema Penomoran Versi (*Semantic Versioning*)

NUSANTARA menerapkan penomoran versi SemVer formal: `vMAJOR.MINOR.PATCH`

- **MAJOR (v1.0.0, v2.0.0):**
  Perubahan arsitektur besar yang berpotensi memutus kompatibilitas. Sebelum `v1.0.0` (masa pembentukan Phase 1 hingga Phase 35), digit versi berstatus prarilis (`v0.X.Y`).
- **MINOR (v0.1.0, v0.2.0, v0.3.0, dst.):**
  Penambahan fitur besar, penyelesaian fase roadmap baru, atau penerimaan proposal NIP tanpa merusak kode yang sah sebelumnya.
- **PATCH (v0.2.1, v0.2.2, dst.):**
  Penyempurnaan redaksional dokumentasi, perbaikan galat pengetikan, atau optimalisasi internal tanpa mengubah spesifikasi bahasa.

---

## 3. Periode Depresiasi (*Deprecation Policy*)

Apabila suatu kata kunci atau fitur di masa depan diputuskan untuk diganti:
1. Fitur lama akan ditandai dengan peringatan depresiasi (*warning*) minimal selama 2 versi minor.
2. Fitur lama tidak boleh dihapus secara mendadak sebelum alternatif resmi tersedia dan teruji.
3. Perkakas otomatis pembaruan kode (*code migration tool*) harus disediakan oleh proyek sebelum penghapusan final.
