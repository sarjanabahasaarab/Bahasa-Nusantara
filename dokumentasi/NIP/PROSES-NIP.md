# Alur & Proses Nusantara Improvement Proposal (NIP)

Dokumen ini menjelaskan mekanisme pengajuan, evaluasi, dan adopsi perubahan spesifikasi bahasa melalui sistem **NIP (Nusantara Improvement Proposal)**.

---

## 1. Definisi & Tujuan NIP

NIP adalah dokumen desain formal yang menguraikan fitur baru, perubahan tata bahasa, atau peningkatan arsitektur untuk bahasa NUSANTARA. NIP menjadi wahana musyawarah mufakat komunitas untuk menjaga kejelasan dan konsistensi bahasa sebelum kode diimplementasikan.

---

## 2. 7 Tahapan Siklus Hidup NIP

```
1. Draf (Draft)
       │
       ▼
2. Dalam Diskusi (Under Discussion)
       │
       ▼
3. Peninjauan Formal (Review by Maintainers)
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼                 ▼
4. Diterima           Ditunda           Ditolak
  (Accepted)         (Deferred)        (Rejected)
       │
       ▼
5. Implementasi Teknis (Implementation)
       │
       ▼
6. Dokumentasi & Pengujian (Documentation)
       │
       ▼
7. Diterapkan dalam Rilis (Final / Released)
```

---

## 3. Rincian Status NIP

| Status | Makna & Kondisi |
|---|---|
| **Draf** | Dokumen sedang ditulis oleh inisiator dan belum diajukan untuk peninjauan umum. |
| **Dalam Diskusi** | Dokumen telah diajukan melalui Pull Request dan sedang dibahas secara terbuka oleh komunitas. |
| **Diterima** | Proposal disetujui oleh tim maintainer untuk dijadikan acuan implementasi resmi pada fase yang ditentukan. |
| **Ditunda** | Ide proposal dinilai baik, namun ditunda karena belum sesuai dengan prioritas fase roadmap saat ini. |
| **Ditolak** | Proposal tidak dapat diterima karena bertentangan dengan Konstitusi Bahasa, memicu inkonsistensi, atau tidak layak secara teknis. |
| **Diterapkan** | Spesifikasi dalam proposal telah selesai diimplementasikan, diuji, didokumentasikan, dan disertakan dalam versi rilis resmi. |

---

## 4. Panduan Mengajukan Proposal NIP Baru

1. Salin berkas templat resmi di [TEMPLATE-NIP.md](TEMPLATE-NIP.md).
2. Tentukan nomor urut NIP berikutnya (misal: `NIP-0003.md`).
3. Tulis usulan dengan uraian teknis yang jelas, motivasi kedaulatan, contoh kode `.nusantara`, dan analisis kompatibilitas ke belakang.
4. Buka Pull Request ke cabang `develop` dengan awalan judul `nip: Usulan Nama NIP`.
5. Ikuti sesi diskusi dan masukan komunitas hingga maintainer menetapkan status proposal.
