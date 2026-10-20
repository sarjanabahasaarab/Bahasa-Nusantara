# Proses & Tata Kelola NIP (Nusantara Improvement Proposal)

**NIP (*Nusantara Improvement Proposal*)** adalah mekanisme formal untuk mengusulkan perubahan, perbaikan, atau penambahan fitur baru pada spesifikasi bahasa NUSANTARA.

---

## 1. Kapan NIP Diperlukan?

NIP **wajib diajukan** jika usulan melibatkan:
1. Penambahan atau penghapusan kata kunci resmi.
2. Perubahan pada tata bahasa formal EBNF.
3. Perubahan sintaksis atau semantik yang memutus kompatibilitas (*breaking change*).
4. Penambahan tipe data primitif baru.

Perbaikan dokumentasi atau koreksi salah ketik (*typo*) tidak memerlukan NIP dan dapat diajukan langsung melalui Pull Request biasa.

---

## 2. Alur 7 Tahapan Siklus Hidup NIP

```text
[Draf] ──► [Diskusi] ──► [Peninjauan Formal] ──► [Diterima / Ditolak / Ditunda]
                                                          │ (Jika Diterima)
                                                          ▼
                                                  [Implementasi Teknis]
                                                          │
                                                          ▼
                                                  [Pengujian & Dokumentasi]
                                                          │
                                                          ▼
                                                  [Diterapkan dalam Rilis]
```

1. **Draf:** Penulis menyusun berkas NIP menggunakan templat resmi.
2. **Diskusi:** Dibahas secara terbuka oleh komunitas di forum GitHub Issue / Discussions.
3. **Peninjauan Formal:** Tim Maintainer memeriksa kepatuhan terhadap Konstitusi Bahasa.
4. **Keputusan:** Penetapan status resmi (`Diterima`, `Ditunda`, atau `Ditolak`).
5. **Implementasi Teknis:** Rekayasa kode pada repositori setelah proposal disahkan.
6. **Pengujian & Dokumentasi:** Pembuatan kasus uji dan pembaruan dokumen spesifikasi.
7. **Rilis:** Dimasukkan ke dalam versi rilis resmi SemVer.

---

## 3. Format Baku Templat NIP

Templat baku penulisan proposal NIP dapat dilihat pada dokumen:
`dokumentasi/NIP/TEMPLATE-NIP.md`
