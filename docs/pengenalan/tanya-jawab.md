# Tanya Jawab Umum (FAQ)

Berikut adalah jawaban atas pertanyaan yang paling sering diajukan mengenai proyek bahasa pemrograman **NUSANTARA**:

---

### 1. Apakah kode program `.nusantara` sudah bisa dijalankan saat ini?
**Belum.** Pada saat ini (Phase 5), proyek baru menyelesaikan spesifikasi tata bahasa formal (EBNF), tata kelola, dan dokumentasi awal. Kompilator atau penerjemah yang dapat mengeksekusi berkas belum dirilis.

---

### 2. Apakah compiler NUSANTARA sudah tersedia untuk diunduh?
**Belum.** Kompilator biner belum tersedia. Pembangunan komponen kompilator akan dimulai dari **Phase 6 (Lexer)** dan **Phase 7 (Parser)**. Jangan mengunduh biner tidak resmi yang mengklaim sebagai kompiler NUSANTARA.

---

### 3. Apa fungsi ekstensi `.nusantara`?
Ekstensi `.nusantara` adalah identitas resmi berkas kode sumber bahasa NUSANTARA. Berkas ini berformat teks polos dengan pengkodean **UTF-8**, yang nantinya akan dibaca oleh kompiler resmi.

---

### 4. Bagaimana cara berkontribusi ke proyek NUSANTARA?
Anda dapat berkontribusi melalui alur 10 langkah resmi yang dijelaskan pada [Panduan Kontribusi](../kontribusi/mulai-berkontribusi.md):
1. Membaca dokumentasi dan konstitusi bahasa.
2. Memilih issue terbuka atau membuka issue diskusi baru.
3. Membuat cabang kerja terpisah (*feature branch*).
4. Mengirimkan Pull Request yang mematuhi templat resmi.

---

### 5. Bagaimana cara mengusulkan kata kunci atau fitur bahasa baru?
Penambahan kata kunci baru tidak boleh dilakukan langsung melalui pull request kode. Setiap perubahan atau usulan sintaksis baru **wajib melalui pengajuan proposal NIP (Nusantara Improvement Proposal)** sesuai panduan di [Proses NIP](../kontribusi/proses-nip.md).

---

### 6. Apa itu NIP?
**NIP (*Nusantara Improvement Proposal*)** adalah mekanisme formal untuk mengusulkan perbaikan spesifikasi, penambahan kata kunci, atau perubahan tata bahasa NUSANTARA agar dapat ditinjau dan disepakati oleh seluruh komunitas secara transparan.

---

### 7. Apa target pengembangan pada fase berikutnya?
Target berikutnya adalah **Phase 6: Lexer (Penganalisis Leksikal)**, yaitu modul rekayasa pertama yang akan membaca karakter kode sumber `.nusantara` dan mengubahnya menjadi rangkaian token terstruktur.
