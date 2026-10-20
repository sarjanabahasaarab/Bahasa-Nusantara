# Tata Kelola Proyek & Komunitas NUSANTARA

Dokumen ini mendefinisikan struktur organisasi, pembagian peran, hak akses, serta mekanisme pengambilan keputusan dalam pengembangan bahasa pemrograman **NUSANTARA**.

---

## 1. Prinsip Fundamental Tata Kelola

Pengembangan NUSANTARA dikelola secara meritokratis dan transparan dengan berpegang pada prinsip:
1. **Keputusan Terdokumentasi:** Setiap keputusan arsitektur, sintaksis, atau tata bahasa wajib terdokumentasi dalam NIP, Issue, atau Catatan Rilis publik.
2. **Keterbukaan & Kesantunan Diskusi:** Seluruh perdebatan teknis dilakukan secara terbuka di forum resmi GitHub dengan mematuhi [KODE-ETIK.md](KODE-ETIK.md).
3. **Perubahan Bahasa Melalui Proposal:** Perubahan sintaksis atau semantik bahasa wajib melalui proses evaluasi formal NIP.
4. **Tinjauan Sejawat Wajib (*Peer Review*):** Tidak ada kontributor yang memiliki hak mengubah spesifikasi atau menggabungkan kode ke cabang utama tanpa proses peninjauan minimal satu Reviewer independen.
5. **Prioritas Keamanan & Stabilitas:** Keamanan sistem, keterandalan biner, dan stabilitas backward-compatibility selalu didahulukan di atas penambahan fitur yang tergesa-gesa.

---

## 2. Struktur Peran Komunitas

Peran dalam proyek NUSANTARA didasarkan pada rekam jejak kontribusi, keahlian teknis, dan komitmen terhadap kemajuan ekosistem:

### A. Pengguna (*Users*)
- **Peran:** Individu, pelajar, pengajar, atau institusi yang menggunakan bahasa NUSANTARA untuk belajar, berkarya, atau membangun aplikasi.
- **Tanggung Jawab:** Memberikan umpan balik pengalaman pengguna, melaporkan kutu (*bug report*), dan menyebarluaskan adopsi bahasa.

### B. Kontributor (*Contributors*)
- **Peran:** Anggota komunitas yang mengajukan usulan kode, perbaikan dokumentasi, kasus uji, atau proposal NIP melalui Pull Request.
- **Tanggung Jawab:** Mematuhi panduan kontribusi, merespons masukan peninjau, dan menyertakan pengujian yang memadai.

### C. Peninjau (*Reviewers*)
- **Peran:** Kontributor berpengalaman yang ditunjuk untuk memeriksa kelayakan, gaya penulisan, keamanan, dan kepatuhan Pull Request terhadap Konstitusi Bahasa.
- **Tanggung Jawab:** Memberikan kritik teknis yang konstruktif, menguji usulan perubahan, dan merekomendasikan persetujuan atau revisi kode.

### D. Pemelihara (*Maintainers*)
- **Peran:** Tim inti yang memegang tanggung jawab teknis berkelanjutan atas repositori proyek, penggabungan (*merge*) Pull Request yang disetujui, dan arah pengembangan roadmap.
- **Tanggung Jawab:** Mengawal integritas arsitektur kompilator, menjaga ketertiban issue tracker, menengahi perbedaan teknis, dan mengesahkan proposal NIP.

### E. Pengelola Rilis (*Release Managers*)
- **Peran:** Maintainer yang bertanggung jawab mengoordinasikan pembekuan kode (*code freeze*), persiapan catatan rilis, verifikasi pengujian akhir, penandaan tag Git versi, dan penerbitan GitHub Release resmi.
- **Tanggung Jawab:** Memastikan kepatuhan Semantic Versioning, kelengkapan berkas rilis, dan integritas biner rilis.

---

## 3. Penegasan Hak Akses & Pengaturan GitHub

Struktur peran di atas bukan sekadar pedoman tertulis, melainkan **ditegakkan secara teknis melalui pengaturan repositori GitHub**:
- Hak akses tulis (*Write / Maintain / Admin*) ke repositori diatur melalui manajemen tim organisasi GitHub.
- Perlindungan cabang (*Branch Protection*) pada `main` dan `develop` dikonfigurasi untuk mewajibkan review tertulis sebelum penggabungan kode diizinkan oleh sistem GitHub.
- Akses ke kunci penandatanganan rilis (*Release signing keys*) hanya dipegang oleh pengelola rilis terdaftar.
