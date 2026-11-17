# Referensi API Phase 38 — Native Device API & `std:mobile`

## 1. Fungsi Standard Library NUSANTARA (`gunakan "std:mobile" sebagai seluler`)
- `seluler.panggilNative(namaApi : teks, argumen? : peta) -> peta`: Memanggil salah satu dari 35 endpoint Native API secara sinkron bila tersedia, mengembalikan `{ sukses, status, data, pesan, kodeGalat, stempelWaktu }`.
- `seluler.daftarNativeAPI() -> daftar`: Mengembalikan seluruh nama endpoint Native API yang terdaftar (35 endpoint).
- `seluler.periksaNativeAPI(namaApi : teks) -> peta | kosong`: Mengambil metadata (`kategori`, `status`, `platform`, `izin`, `dokumentasi`).
- `seluler.dapatkanKemampuanPerangkat() -> peta`: Mengembalikan pohon kemampuan perangkat dan field `probeHost`.
- `seluler.periksaIzin(izin : teks) -> teks`: Mengembalikan `'belum_diminta' | 'diberikan' | 'ditolak' | 'ditolak_permanen'`.
- `seluler.mintaIzin(izin : teks, alasan? : teks) -> logika`: Meminta izin pengguna secara sinkron dalam runtime.
- `seluler.simpanAman(kunci : teks, nilai : teks) -> logika`: Enkripsi AES-256-GCM (Node) / CTR+HMAC (Browser).
- `seluler.ambilAman(kunci : teks) -> teks | kosong` / `seluler.hapusAman(kunci : teks) -> logika`.
- `seluler.salinPapanKlip(teks : teks) -> logika` / `seluler.tempelPapanKlip() -> teks`.

## 2. Daftar 35 Endpoint `RegistriNativeAPI`
| Kategori | Endpoint | Izin Wajib |
|---|---|---|
| `perangkat` | `perangkat.info` | - |
| `kamera` | `kamera.ketersediaan`, `kamera.ambil` | `kamera` (untuk `ambil`) |
| `media` | `galeri.pilih_foto`, `galeri.pilih_video` | `foto_media` |
| `lokasi` | `lokasi.ambil`, `lokasi.pantau`, `lokasi.henti` | `lokasi` (`ambil`, `pantau`) |
| `notifikasi` | `notifikasi.kirim`, `notifikasi.jadwal`, `notifikasi.batal` | `notifikasi` (`kirim`, `jadwal`) |
| `sensor` | `sensor.akselerometer`, `sensor.giroskop`, `sensor.magnetometer`, `sensor.kedekatan`, `sensor.cahaya` | `sensor` |
| `bluetooth` | `bluetooth.status`, `bluetooth.pindai` | `bluetooth` (+ `lokasi` saat `pindai`) |
| `baterai` | `baterai.info` | - |
| `jaringan` | `jaringan.status` | `internet` |
| `audio` | `audio.putar`, `audio.rekam`, `audio.henti` | `mikrofon` (saat `rekam`) |
| `berkas` | `berkas.baca`, `berkas.tulis`, `berkas.hapus` | `penyimpanan` |
| `papan_klip` | `papan_klip.salin`, `papan_klip.tempel` | - |
| `bagikan` | `bagikan.konten` | - |
| `simpan_aman` | `simpan_aman.tulis`, `simpan_aman.baca`, `simpan_aman.hapus` | - |
| `haptik` | `haptik.getar`, `haptik.pola` | - |
| `lifecycle` | `lifecycle.status` | - |
