# Prinsip Desain & Filosofi Bahasa NUSANTARA

Dokumen ini mendefinisikan prinsip-prinsip arsitektural dan filosofis yang menjadi kompas bagi seluruh perancangan sintaksis, kompilator, dan ekosistem bahasa pemrograman **NUSANTARA**.

---

## 1. Visi Utama

Mewujudkan bahasa pemrograman modern serba guna (*general-purpose*) yang 100% berakar pada Bahasa Indonesia, berstandar industri internasional, dan mampu menggerakkan ekosistem digital dari aplikasi tingkat tinggi hingga sistem operasi berdaulat.

---

## 2. 12 Prinsip Desain NUSANTARA

### 1. Bahasa Pemrograman untuk Semua
Bahasa ini dirancang agar dapat diakses dengan mudah oleh pelajar pemula di sekolah, mahasiswa, maupun insinyur perangkat lunak berpengalaman di industri.

### 2. Bahasa Indonesia sebagai Bahasa Utama
Bukan sekadar mengganti beberapa kata kunci (*keywords*) bahasa Inggris. Struktur logika, konvensi penamaan, pesan kesalahan (*error messages*), perkakas baris perintah (CLI), serta dokumentasi resmi dibangun dengan kosakata dan kaidah bahasa Indonesia yang tertib dan berwibawa.

### 3. Sintaksis Mudah Dibaca Manusia (*Human-Readable*)
Membaca kode sumber `.nusantara` terasa alami seperti membaca teks formal yang logis. Struktur blok menggunakan pembatas yang jelas (`mulai` ... `selesai`, `jika` ... `maka` ... `akhir`) untuk menghilangkan ambiguitas tanda baca yang berlebihan.

### 4. Kemampuan Teknis Tingkat Tinggi
Kemudahan bacaan tidak boleh mengorbankan ketepatan teknis. NUSANTARA dirancang dengan dukungan abstraksi tingkat tinggi (fungsi orde tinggi, tipe data generik, pemrograman berorientasi objek, konkurensi) tanpa kehilangan ketelitian komputasi.

### 5. Terbuka Seutuhnya (*Open Source*)
Seluruh spesifikasi, kode kompilator, pustaka standar, dan perkakas ekosistem dilisensikan di bawah lisensi terbuka bebas (MIT License) tanpa penguncian hak milik tertutup (*vendor lock-in*).

### 6. Berorientasi Komunitas
Arah perkembangan bahasa ditentukan secara transparan melalui mekanisme **NIP (Nusantara Improvement Proposal)**. Setiap anggota masyarakat memiliki hak untuk mengusulkan dan meninjau rancangan bahasa.

### 7. Lintas Platform (*Cross-Platform*)
Arsitektur kompilator dirancang agar dapat menghasilkan biner untuk berbagai arsitektur perangkat keras (x86_64, ARM64, RISC-V) dan berbagai sistem operasi (Linux, Windows, macOS, Android), serta WebAssembly (WASM).

### 8. Keamanan & Pencegahan Cacat (*Safety by Design*)
Mencegah galat umum pemrograman sedini mungkin pada fase kompilasi:
- Penanganan nilai `kosong` (*null-safety*) yang ketat.
- Sistem tipe data statis terinferensi yang mencegah inkonsistensi tipe saat *runtime*.
- Bebas dari kebocoran memori pada fase lanjutan.

### 9. Performa Tinggi Tanpa Klaim Kosong
Meskipun target akhir adalah kecepatan sekelas bahasa native yang dikompilasi (melalui integrasi LLVM atau backend mandiri), kami memegang prinsip kejujuran rekayasa: **tidak mengklaim performa kecepatan sebelum tolok ukur (*benchmark*) resmi diuji dan diverifikasi secara publik**.

### 10. Mudah Dipelajari & Diajarkan (*Pedagogical Elegance*)
Kurva belajar yang landai memungkinkan konsep fundamental logika (variabel, percabangan, perulangan, fungsi) diajarkan tanpa hambatan bahasa.

### 11. Skalabilitas dari Skrip Kecil hingga Sistem Enterprise
Mendukung penulisan skrip otomasi satu berkas hingga struktur proyek berskala besar yang melibatkan ratusan modul dan ribuan pengembang.

### 12. Mampu Berkembang Menuju Pemrograman Sistem & NusantaraOS
Jangka panjang bahasa ini tidak terbatas pada aplikasi web atau desktop, melainkan mencakup pemrograman tingkat rendah: manajemen memori perangkat keras, driver sistem, dan kernel sistem operasi mandiri (**NusantaraOS**).

---

## 3. Kebijakan Penggunaan Istilah Bahasa

Untuk menjaga konsistensi dan integritas bahasa, disepakati aturan leksikal berikut:

### Wajib 100% Bahasa Indonesia:
1. **Kata Kunci Bahasa (Keywords):** `program`, `mulai`, `selesai`, `fungsi`, `kembalikan`, `jika`, `maka`, `selain`, `untuk`, `selama`, `dan`, `atau`, `tidak`, dll.
2. **Pesan Galat Kompilator & Runtime:** Pesan galat harus menerangkan lokasi baris, kolom, dan penjelasan sebab serta saran perbaikan dalam Bahasa Indonesia yang santun dan jelas.
3. **Antarmuka Baris Perintah (CLI):** Perintah `nusantara bangun`, `nusantara jalankan`, `nusantara pasang`, `nusantara uji`.
4. **Dokumentasi Resmi & Spesifikasi API:** Seluruh panduan dan referensi pustaka standar.
5. **Perkakas Ekosistem:** Pemformat kode (*formatter*), penganalisis sintaksis (*linter*), pelacak galat (*debugger*), dan pengelola paket.

### Pengecualian Bahasa Asing / Standar Teknis:
Bahasa Inggris diperbolehkan secara terbatas dan proporsional pada:
1. Nama dependensi pustaka luar pihak ketiga (misalnya pustaka C/C++ eksternal atau modul Node.js pendukung).
2. Nama standar teknis internasional yang belum memiliki padanan baku (misalnya *TCP/IP*, *LLVM IR*, *IEEE 754*, *POSIX*).
3. Kode internal kompilator tingkat rendah yang berinteraksi langsung dengan antarmuka sistem operasi induk (*FFI / Foreign Function Interface*).
