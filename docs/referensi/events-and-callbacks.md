# Sistem Peristiwa & Callback GUI NUSANTARA

Interaktivitas pada GUI Framework NUSANTARA digerakkan oleh sistem peristiwa (*event-driven architecture*) yang terintegrasi dengan Event System NUSANTARA.

---

## 1. Jenis Peristiwa yang Didukung

| Nama Peristiwa | Deskripsi | Komponen Terkait |
| :--- | :--- | :--- |
| `klik` | Tombol ditekan dan dilepas | `TombolWidget`, `WadahWidget` |
| `klik_ganda` | Klik dua kali berturut-turut | `TabelWidget`, `DaftarWidget` |
| `teks_berubah` | Teks di dalam input mengalami perubahan | `InputTeksWidget`, `AreaTeksWidget` |
| `nilai_berubah` | Nilai status berubah | `KotakCentangWidget`, `SliderWidget`, `PilihanDropdownWidget` |
| `seleksi_berubah` | Baris atau item dipilih pengguna | `TabelWidget`, `DaftarWidget` |
| `fokus` | Komponen menerima fokus keyboard | Semua komponen input |
| `blur` | Komponen kehilangan fokus | Semua komponen input |
| `tombol_ditekan` | Tombol keyboard ditekan | Jendela & Komponen Input |
| `jendela_ubah_ukuran` | Ukuran jendela diubah oleh pengguna | `JendelaGUI` |
| `jendela_ditutup` | Permintaan penutupan jendela | `JendelaGUI` |

---

## 2. Pendaftaran dan Penanganan Event

### Menggunakan Metode `.pasang()`
```nusantara
definisi inputCari = ui.buatInputTeks("Cari produk...")

inputCari.pasang("teks_berubah", fungsi(evt)
    tampilkan("Kata kunci pencarian: " + evt.nilaiTeks)
selesai)
```

### Objek Peristiwa (`DataPeristiwaGUI`)
Saat callback dieksekusi, runtime menyuntikkan objek data peristiwa dengan properti:
- `idWidget`: ID elemen yang memicu peristiwa.
- `jenis`: Nama jenis peristiwa (misal: `"klik"`, `"nilai_berubah"`).
- `stempelWaktu`: Timestamp milidetik saat peristiwa terjadi.
- `nilaiTeks`: Nilai teks terkini (pada event input atau teks berubah).
- `nilaiAngka`: Nilai angka (pada slider atau progress).
- `nilaiLogika`: Nilai status boolean (pada kotak centang).

---

## 3. Isolasi Error & Pencegahan Kebocoran Memori

- Setiap pemanggilan handler dieksekusi di dalam blok proteksi galat. Jika sebuah penangan melempar galat runtime, jendela dan widget lain tidak akan mengalami crash atau *hang*.
- Pemanggilan `jendela.tutup()` atau `widget.hancurkan()` otomatis mencabut seluruh listener dari memori (*garbage collection friendly*).
