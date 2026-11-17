# API Reference — Phase 37 (`std:mobile` Core UI, Layout, Navigation & Bridge)

## NUSANTARA Standard Library (`gunakan "std:mobile"`)
Aliases: `mobile`, `seluler`, `android`, `ios`.

### Lifecycle & Application
- `buatAplikasiMobile(konfig: peta) -> peta`: Creates an `AplikasiMobile` instance exposing `.tambahKomponen()`, `.setNavigator()`, `.jalankan()`, `.jeda()`, `.lanjutkan()`, `.keLatarBelakang()`, `.berhenti()`, `.hancurkan()`, `.aturState(kunci, nilai)`, `.dapatkanState(kunci)`, `.keJson()`.
- `jalankanAplikasiMobile(aplikasi: peta)`: Transitions application to `AKTIF`.
- `tambahKomponenMobile(wadah: peta, anak: peta) -> peta`: Attaches a component to app root or parent container.
- `aturNavigatorMobile(aplikasi: peta, navigator: peta) -> peta`: Binds primary navigator (`NavigatorTumpukanMobile` or `NavigatorTabMobile`).

### UI & Layout Constructors
- `buatTeks(teks, ukuran?, ketebalan?, warna?)` (`setTeks`, `dapatkanTeks`)
- `buatTombol(teks, saatKlik?, varian?, warna?)` (`setMemuat`, `klik`)
- `buatInputTeks(placeholder?, nilaiAwal?, saatBerubah?)` / `buatInputSandi(placeholder?, nilaiAwal?)`
- `buatSakelar(aktif?, saatBerubah?)` / `buatKotakCentang(label, dicentang?, saatBerubah?)` / `buatTombolRadio(label, nilai, grup, terpilih?, saatPilih?)` / `buatDropdown(opsi, nilaiAwal?, saatPilih?)`
- `buatGambar(sumber, lebar?, tinggi?)` / `buatIkon(nama, ukuran?, warna?)`
- `buatIndikatorProgres(nilai?, maks?)` / `buatIndikatorMemuat(aktif?, ukuran?)`
- `buatKartu(anak?)` / `buatPemisah()` / `buatDaftar(data, pembuatItem?)` / `buatGrid(kolom?)`
- `buatAreaAman()` / `buatTataLetakVertikal(anak?, jarak?)` / `buatTataLetakHorizontal(anak?, jarak?)` / `buatTataLetakTumpuk()` / `buatTampilanGulir()`
- `tampilkanDialog(judulOrOpsi, pesan?)`, `tampilkanAlert(judul, pesan, konfirmasi?, batal?)`, `tampilkanSnackbar(pesan, durasiMs?, tipe?)`

### Navigation & Deep Linking
- `buatNavigatorTumpukan(ruteAwal?)`: Methods `.daftarkanRute(nama, hal)`, `.dorong(nama, param?)`, `.kembali()`, `.dapatkanKedalaman()`.
- `buatNavigatorTab(daftarTab)` (`.pilihTab(kunci)`), `buatNavigasiBawah(items)` (`.pilih(kunci)`).
- `uraiDeepLinkMobile(url) -> peta | kosong`: Parses URL scheme, host, path, and query parameters safely.

### Native Bridge & CLI (`src/mobile/`)
- `JembatanMobileNative`: `pasangTransport()`, `panggilNative()`, `langgananPeristiwa()`, `hasilkanBindingNative()`.
- `HostPreviewMobile`: Loopback HTTP (`/`, `/health`, `/api/state`) + WebSocket (`/ipc`).
- `MobileCLI`: `baru <nama>`, `platform <daftar|tambah>`, `periksa`, `build <android|ios> [--out=dir]`, `jalankan <android|ios|desktop>`, `verifikasiBundel(dir)`.
