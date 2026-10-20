# Kebijakan Penomoran Versi & Siklus Rilis NUSANTARA

Dokumen ini mendefinisikan aturan penomoran versi, alur pembuatan rilis, dan kriteria penerbitan biner ekosistem **NUSANTARA**.

---

## 1. Skema Versi SemVer (MAJOR.MINOR.PATCH)

Bahasa NUSANTARA mematuhi kaidah **Semantic Versioning 2.0.0**:

Format: `vMAJOR.MINOR.PATCH`

Contoh:
- `v0.1.0` — Rilis Phase 1 (Identitas & Fondasi)
- `v0.2.0` — Rilis Phase 2 (Konstitusi Bahasa)
- `v0.2.1` — Rilis Patch Perbaikan Dokumentasi Konstitusi
- `v0.3.0` — Rilis Phase 3 (Lisensi & Tata Kelola)
- `v1.0.0` — Rilis Produksi Pertama (Sistem Lengkap / NusantaraOS)

---

## 2. Kriteria Kenaikan Angka Versi

| Bagian Versi | Kapan Dinaikkan? | Dampak Kompatibilitas |
|---|---|---|
| **PATCH** (`x.y.Z`) | Perbaikan kutu (*bug fix*), klarifikasi redaksional dokumentasi, atau perbaikan kecil tanpa penambahan fitur baru. | 100% Kompatibel Balik |
| **MINOR** (`x.Y.0`) | Penambahan fase roadmap baru, fitur spesifikasi baru yang sah, atau adopsi proposal NIP tanpa merusak kode sah sebelumnya. | 100% Kompatibel Balik |
| **MAJOR** (`X.0.0`) | Perubahan besar arsitektur (*breaking change*), transformasi tata bahasa radikal, atau tonggak puncak `v1.0.0`. | Berpotensi Memutus Kompatibilitas Lama |

> 📌 **Catatan Target Roadmap:** Nomor versi pada dokumen [ROADMAP.md](../ROADMAP.md) adalah tonggak target pencapaian rekayasa (*engineering milestones*). Nomor versi rilis aktual dapat disesuaikan oleh tim maintainer jika arsitektur proyek mengalami pemekaran atau kebutuhan patch tambahan.

---

## 3. Komponen Rilis Resmi

Setiap rilis resmi NUSANTARA terdiri dari:
1. **Tag Git Beranotasi (*Annotated Git Tag*):** Ditandai dengan prefiks `v` (misal: `v0.3.0`). **Tag tidak boleh dibuat secara otomatis oleh skrip** tanpa persetujuan eksplisit maintainer.
2. **Catatan Perubahan (Changelog):** Rincian fitur baru, perbaikan, dan kredit kontributor yang dicatat di [PERUBAHAN.md](../PERUBAHAN.md).
3. **GitHub Release:** Paket publikasi resmi di portal GitHub yang merangkum changelog dan menyediakan artefak yang dapat diunduh (pada fase biner).
