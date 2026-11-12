/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36 Test Suite
 * Pengujian Komprehensif GUI Framework & Desktop Application Development
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AplikasiGUI,
  JendelaGUI,
  StatusAplikasi,
  EventLoopGUI,
  PengelolaLifecycle,
  LabelWidget,
  TombolWidget,
  InputTeksWidget,
  AreaTeksWidget,
  KotakCentangWidget,
  TombolRadioWidget,
  GrupRadio,
  PilihanDropdownWidget,
  DaftarWidget,
  TabelWidget,
  GambarWidget,
  IndikatorProgresWidget,
  SliderWidget,
  TabWidget,
  BarisLayout,
  KolomLayout,
  GridLayout,
  StackLayout,
  WadahGulirWidget,
  BilahMenu,
  Menu,
  ItemMenu,
  BilahAlat,
  PengelolaDialogGUI,
  PengelolaTema,
  pengelolaTemaGlobal,
  PengelolaFormGUI,
  AdaptorHeadlessGUI,
  JembatanDesktopWebview,
  MesinTataLetak,
  KanvasFramebuffer,
  PerenderDesktop,
  PengelolaInputGUI,
  DetektorPlatformDesktop,
  AdaptorDesktopWebviewServer,
  AdaptorDesktopLinux,
  AdaptorDesktopWindows,
  AdaptorDesktopMacOS,
  PengemasAplikasiDesktop,
  sesuaikanShortcutOS,
  buatAtributAria,
  temukanWidgetDapatDifokuskan,
} from '../../src/gui';
import * as os from 'node:os';
import { WebSocket } from 'ws';
import { NusantaraCLI } from '../../src/paket/cli';
import { TemplateRegistry } from '../../src/generator/templateRegistry';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';

let lulusSemua = true;
let totalTes = 0;
let tesBerhasil = 0;

function uji(nama: string, fn: () => void | Promise<void>): Promise<void> {
  totalTes++;
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      tesBerhasil++;
      console.log(`  \x1b[32m✓\x1b[0m [LULUS] ${nama}`);
    })
    .catch((err) => {
      lulusSemua = false;
      console.error(`  \x1b[31m✗\x1b[0m [GAGAL] ${nama}`);
      console.error(`    Alasan: ${err.message || err}`);
    });
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) {
    throw new Error(pesan);
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('PENGUJIAN SISTEM GUI FRAMEWORK & DESKTOP APPLICATION (PHASE 36)');
  console.log('Target Versi: v0.36.0');
  console.log('='.repeat(70));

  // --- 1. CORE & LIFECYCLE ---
  await uji('1.1 Manajemen Lifecycle & Transisi Status Aplikasi', async () => {
    const lc = new PengelolaLifecycle();
    pastikan(lc.getStatus() === StatusAplikasi.DIBUAT, 'Status awal harus DIBUAT');

    let inisialisasiDipanggil = false;
    let mulaiDipanggil = false;
    let berhentiDipanggil = false;

    lc.onInisialisasi(() => { inisialisasiDipanggil = true; });
    lc.onMulai(() => { mulaiDipanggil = true; });
    lc.onBerhenti(() => { berhentiDipanggil = true; });

    await lc.transisiKe(StatusAplikasi.MEMULAI);
    pastikan(inisialisasiDipanggil, 'Hook inisialisasi harus dipanggil');

    await lc.transisiKe(StatusAplikasi.BERJALAN);
    pastikan(mulaiDipanggil, 'Hook mulai harus dipanggil');

    await lc.transisiKe(StatusAplikasi.BERHENTI);
    pastikan(berhentiDipanggil, 'Hook berhenti harus dipanggil');
  });

  await uji('1.2 EventLoopGUI Antrean Tugas & Tick Processing', async () => {
    const loop = new EventLoopGUI();
    let tugas1Selesai = false;
    let tugas2Selesai = false;

    loop.kirimTugas(() => { tugas1Selesai = true; });
    loop.kirimTugas(async () => { tugas2Selesai = true; });

    const jml = await loop.prosesSatuTick();
    pastikan(jml === 2, 'Harus memproses 2 tugas');
    pastikan(tugas1Selesai && tugas2Selesai, 'Kedua tugas dalam antrean harus dieksekusi');
    loop.hentikan();
  });

  // --- 2. WINDOW MANAGEMENT ---
  await uji('2.1 Pembuatan dan Konfigurasi JendelaGUI', async () => {
    const jendela = new JendelaGUI({
      judul: 'Jendela Uji',
      lebar: 800,
      tinggi: 600,
      lebarMin: 400,
      tinggiMin: 300,
      lebarMaks: 1200,
      tinggiMaks: 900,
      dapatDiubahUkuran: true,
    });

    pastikan(jendela.judul === 'Jendela Uji', 'Judul jendela harus sesuai');
    pastikan(jendela.lebar === 800 && jendela.tinggi === 600, 'Ukuran awal harus 800x600');

    // Ubah ukuran dalam batas
    jendela.ubahUkuran(1000, 700);
    pastikan(jendela.lebar === 1000 && jendela.tinggi === 700, 'Ukuran baru harus 1000x700');

    // Uji clamping batas minimum
    jendela.ubahUkuran(200, 100);
    pastikan(jendela.lebar === 400 && jendela.tinggi === 300, 'Ukuran harus dijepit pada batas minimum');

    // Uji clamping batas maksimum
    jendela.ubahUkuran(2000, 1500);
    pastikan(jendela.lebar === 1200 && jendela.tinggi === 900, 'Ukuran harus dijepit pada batas maksimum');

    // Manipulasi status
    jendela.maksimalkan();
    pastikan(jendela.status === 'dimaksimalkan', 'Status harus dimaksimalkan');
    jendela.minimalkan();
    pastikan(jendela.status === 'diminimalkan', 'Status harus diminimalkan');
    jendela.pulihkan();
    pastikan(jendela.status === 'normal', 'Status harus normal');

    let jendelaDitutup = false;
    jendela.pasang('jendela_ditutup', () => {
      jendelaDitutup = true;
    });
    await jendela.tutup();
    pastikan(jendelaDitutup, 'Event jendela_ditutup harus terpanggil');
  });

  // --- 3. WIDGET SYSTEM ---
  await uji('3.1 LabelWidget, TombolWidget, InputTeksWidget, AreaTeksWidget', async () => {
    const label = new LabelWidget('Teks Awal');
    label.setTeks('Teks Diperbarui');
    pastikan(label.getTeks() === 'Teks Diperbarui', 'Teks label harus diperbarui');

    let tombolDiklik = false;
    const tombol = new TombolWidget('Simpan');
    tombol.pasang('klik', () => { tombolDiklik = true; });
    await tombol.picu('klik');
    pastikan(tombolDiklik, 'Tombol harus menerima event klik');

    // Tombol nonaktif tidak boleh memicu klik
    tombolDiklik = false;
    tombol.setAktif(false);
    await tombol.picu('klik');
    pastikan(!tombolDiklik, 'Tombol nonaktif tidak boleh memproses klik');

    const input = new InputTeksWidget('Placeholder Nama', 'Budi');
    pastikan(input.getNilai() === 'Budi', 'Nilai awal input harus sesuai');
    input.setNilai('Siti');
    pastikan(input.getNilai() === 'Siti', 'Nilai input harus Siti');
    input.bersihkan();
    pastikan(input.getNilai() === '', 'Input harus kosong setelah bersihkan');

    const area = new AreaTeksWidget('Deskripsi...', 'Baris 1', 5);
    area.tambahBaris('Baris 2');
    pastikan(area.getNilai() === 'Baris 1\nBaris 2', 'Multiline teks area harus tersambung baris baru');
  });

  await uji('3.2 KotakCentang, TombolRadio, Dropdown, Tabel, Progres, Slider', async () => {
    const cb = new KotakCentangWidget('Ingat Saya', false);
    const hasilCentang = { berubah: false };
    cb.pasang('nilai_berubah', (evt) => {
      hasilCentang.berubah = evt.nilaiLogika === true;
    });
    await cb.setCentang(true);
    pastikan(cb.isCentang() === true, 'Kotak centang harus bernilai true');
    pastikan(hasilCentang.berubah === true, 'Event perubahan nilai kotak centang harus terpicu');

    // Radio button group
    const grup = new GrupRadio('metode_bayar');
    const r1 = new TombolRadioWidget('Tunai', 'tunai', 'metode_bayar');
    const r2 = new TombolRadioWidget('Kartu', 'kartu', 'metode_bayar');
    grup.tambah(r1);
    grup.tambah(r2);
    r1.setTerpilih(true);
    pastikan(grup.getTerpilih() === 'tunai', 'Grup radio harus bernilai tunai');
    r2.setTerpilih(true);
    pastikan(grup.getTerpilih() === 'kartu', 'Grup radio harus berganti ke kartu');
    pastikan(!r1.terpilih, 'Radio 1 harus tidak terpilih lagi');

    // Dropdown / Select
    const dropdown = new PilihanDropdownWidget(['Apel', 'Jeruk', 'Mangga'], 'Apel');
    dropdown.setTerpilih('Mangga');
    pastikan(dropdown.getTerpilih() === 'Mangga', 'Dropdown harus terpilih Mangga');

    // Tabel Widget
    const tabel = new TabelWidget(
      [{ id: 'id', judul: 'ID' }, { id: 'nama', judul: 'Nama' }],
      [{ id: 1, nama: 'Produk A' }]
    );
    tabel.tambahBaris({ id: 2, nama: 'Produk B' });
    pastikan(tabel.getData().length === 2, 'Tabel harus memiliki 2 baris');

    // Progres & Slider
    const progres = new IndikatorProgresWidget(50, 100);
    pastikan(progres.getPersentase() === 50, 'Persentase progres harus 50%');

    const slider = new SliderWidget(0, 100, 25);
    slider.setNilai(75);
    pastikan(slider.getNilai() === 75, 'Nilai slider harus 75');
  });

  // --- 4. LAYOUT SYSTEM ---
  await uji('4.1 Kolom, Baris, Grid, Stack, dan Wadah Gulir', async () => {
    const l1 = new LabelWidget('Label 1');
    const l2 = new LabelWidget('Label 2');
    const b1 = new TombolWidget('Tombol 1');

    const baris = new BarisLayout(10, 'awal');
    baris.tambahAnak(l1).tambahAnak(b1);
    pastikan(baris.anak.length === 2, 'Baris harus memiliki 2 anak');
    pastikan(l1.induk === baris, 'Induk elemen harus mengarah ke baris');

    const kolom = new KolomLayout(15, 'tengah');
    kolom.tambahAnak(baris).tambahAnak(l2);
    pastikan(kolom.anak.length === 2, 'Kolom harus berisi baris dan label 2');

    const grid = new GridLayout(3, 8);
    pastikan(grid.kolom === 3, 'Grid harus 3 kolom');

    const stack = new StackLayout();
    stack.tambahAnak(l1);
    pastikan(stack.jenis === 'stack', 'Jenis layout harus stack');

    const gulir = new WadahGulirWidget();
    gulir.tambahAnak(kolom);
    pastikan(gulir.jenis === 'gulir', 'Jenis wadah harus gulir');

    // Uji serialisasi pohon layout
    const serial = kolom.serialisasi();
    pastikan(serial.jenis === 'kolom', 'Serialisasi harus berjenis kolom');
    pastikan(serial.anak.length === 2, 'Anak serialisasi harus berjumlah 2');
  });

  // --- 5. MENUS & DIALOGS ---
  await uji('5.1 Bilah Menu, Item Menu, Toolbar, dan Dialog', async () => {
    const menuBar = new BilahMenu();
    const menuBerkas = new Menu('Berkas');
    let aksiDipanggil = false;

    const itemBuka = new ItemMenu('Buka', () => { aksiDipanggil = true; }, 'Ctrl+O');
    const pemisah = ItemMenu.buatPemisah();
    const itemKeluar = new ItemMenu('Keluar', undefined, 'Ctrl+Q');

    menuBerkas.tambahItem(itemBuka).tambahItem(pemisah).tambahItem(itemKeluar);
    menuBar.tambahMenu(menuBerkas);

    pastikan(menuBar.daftarMenu.length === 1, 'Bilah menu harus memiliki 1 menu utama');
    pastikan(menuBerkas.item.length === 3, 'Menu berkas harus memiliki 3 item termasuk separator');

    // Eksekusi aksi
    itemBuka.eksekusi();
    pastikan(aksiDipanggil, 'Aksi item menu harus terpanggil');

    // Toolbar
    const toolbar = new BilahAlat();
    toolbar.tambahAksi(itemBuka);
    pastikan(toolbar.daftarAksi.length === 1, 'Bilah alat harus memiliki 1 aksi');

    // Dialog Manager
    const dialogMgr = new PengelolaDialogGUI();
    dialogMgr.tampilkanPesan({ judul: 'Info', pesan: 'Pesan Berhasil' });
    const konfirmasi = dialogMgr.tampilkanKonfirmasi({ judul: 'Tanya', pesan: 'Yakin?' });
    pastikan(konfirmasi === true, 'Konfirmasi default harus true');

    const fileResult = dialogMgr.bukaDialogBerkas({ judul: 'Buka File' });
    pastikan(fileResult.dibatalkan === false, 'Dialog berkas tidak dibatalkan');
  });

  // --- 6. THEMES & ACCESSIBILITY ---
  await uji('6.1 Pengelola Tema dan Skema Kontras', async () => {
    const tema = new PengelolaTema('terang');
    let temaTerganti: string = '';
    tema.onTemaBerubah((skema) => {
      temaTerganti = skema.nama;
    });

    tema.setTema('gelap');
    pastikan(tema.getTemaSaatIni().nama === 'gelap', 'Tema aktif harus gelap');
    pastikan(temaTerganti === 'gelap', 'Listener tema harus menerima perubahan ke gelap');

    tema.setTema('kontras_tinggi');
    pastikan(tema.getTemaSaatIni().nama === 'kontras_tinggi', 'Tema aktif harus kontras_tinggi');

    // Aksesibilitas
    const tombol = new TombolWidget('Bantuan');
    tombol.setAksesibilitas({ peran: 'button', label: 'Tombol Bantuan Aplikasi', wajib: true });
    const aria = buatAtributAria(tombol.aksesibilitas);
    pastikan(aria['role'] === 'button', 'Role ARIA harus button');
    pastikan(aria['aria-label'] === 'Tombol Bantuan Aplikasi', 'aria-label harus sesuai');

    const shortcutMac = sesuaikanShortcutOS('Ctrl+S', 'darwin');
    pastikan(shortcutMac === 'Cmd+S', 'Shortcut macOS harus menggunakan Cmd+S');
  });

  // --- 7. FORM VALIDATION ---
  await uji('7.1 PengelolaFormGUI Validasi Field', async () => {
    const form = new PengelolaFormGUI();
    form.tambahAturan('email', { wajib: true, panjangMin: 5 });
    form.tambahAturan('usia', { wajib: true, nilaiMin: 17, nilaiMaks: 65 });

    // Uji data tidak sah
    const hasilTidakSah = form.validasi({ email: '', usia: 12 });
    pastikan(!hasilTidakSah.sah, 'Form dengan field kosong/dibawah batas usia harus tidak sah');
    pastikan(hasilTidakSah.daftarGalat.length === 2, 'Harus mendeteksi 2 galat');

    // Uji data sah
    const hasilSah = form.validasi({ email: 'pengembang@nusantara.org', usia: 28 });
    pastikan(hasilSah.sah, 'Form dengan data valid harus sah');
    pastikan(hasilSah.daftarGalat.length === 0, 'Daftar galat harus kosong');
  });

  // --- 8. PLATFORM ADAPTER & BRIDGE ---
  await uji('8.1 AdaptorHeadlessGUI & JembatanDesktopWebview', async () => {
    const headless = new AdaptorHeadlessGUI();
    await headless.inisialisasi({ idAplikasi: 'id.test', namaAplikasi: 'Test App' });

    const jendela = new JendelaGUI({ judul: 'Headless Window' });
    const label = new LabelWidget('Label Headless');
    jendela.setKonten(label);

    await headless.bukaJendela(jendela);
    const riwayat = headless.getRiwayatAksi();
    pastikan(riwayat.length >= 2, 'Riwayat aksi headless harus mencatat pembukaan jendela');

    const teksTree = headless.renderPohonTeks(jendela);
    pastikan(teksTree.includes('Headless Window'), 'Render teks harus memuat judul jendela');

    // IPC Bridge
    const bridge = new JembatanDesktopWebview();
    let pesanDiterima: any = null;
    bridge.langganan('saluran:utama', (muatan) => {
      pesanDiterima = muatan;
    });

    bridge.siarkan('saluran:utama', { aksi: 'pembaharuan', nilai: 100 });
    pastikan(pesanDiterima !== null && pesanDiterima.nilai === 100, 'Pesan IPC harus diterima');
  });

  // --- 9. CLI TEMPLATE GENERATOR ---
  await uji('9.1 Pendaftaran Template Proyek "desktop" di TemplateRegistry', async () => {
    const reg = new TemplateRegistry();
    pastikan(reg.apakahAda('desktop'), 'Template desktop harus terdaftar di TemplateRegistry');

    const tpl = reg.dapatkan('desktop');
    pastikan(tpl !== undefined, 'Definisi template desktop harus dapat diambil');
    pastikan(tpl!.kategori === 'aplikasi', 'Kategori template desktop harus aplikasi');
    pastikan(tpl!.persyaratanRuntime.includes('gui'), 'Persyaratan runtime harus menyertakan gui');

    const fileUtama = tpl!.berkas.find((b) => b.jalur === 'src/utama.nusantara');
    pastikan(fileUtama !== undefined, 'Template desktop harus memiliki file src/utama.nusantara');
    pastikan(fileUtama!.konten.includes('gunakan "gui" sebagai antarmuka'), 'File template harus mengimpor gui');
  });

  // --- 10. INTERPRETER EXECUTION SAMPLE PROGRAMS ---
  await uji('10.1 Eksekusi Skrip contoh/desktop/demo_desktop.nusantara', async () => {
    const jalurBerkas = path.join(process.cwd(), 'contoh/desktop/demo_desktop.nusantara');
    const kodeSumber = fs.readFileSync(jalurBerkas, 'utf-8');

    const penulis = new PenulisOutputBuffer();
    const interpreter = new Interpreter(penulis);
    interpreter.jalankanKode(kodeSumber);

    const log = penulis.ambilOutput();
    pastikan(log.includes('Menginisialisasi Demo Aplikasi Desktop NUSANTARA...'), 'Harus mencetak log inisialisasi demo');
    pastikan(log.includes('Aplikasi Demo GUI berhasil disiapkan!'), 'Harus berhasil menyiapkan jendela dan widget');
    pastikan(log.includes('NUSANTARA Desktop Application v0.36.0'), 'Harus memuat judul jendela yang benar');
  });

  await uji('10.2 Eksekusi Skrip contoh/desktop/aplikasi_kasir.nusantara', async () => {
    const jalurBerkas = path.join(process.cwd(), 'contoh/desktop/aplikasi_kasir.nusantara');
    const kodeSumber = fs.readFileSync(jalurBerkas, 'utf-8');

    const penulis = new PenulisOutputBuffer();
    const interpreter = new Interpreter(penulis);
    interpreter.jalankanKode(kodeSumber);

    const log = penulis.ambilOutput();
    pastikan(log.includes('Memulai Sistem Kasir Desktop NUSANTARA...'), 'Harus mencetak inisialisasi kasir');
    pastikan(log.includes('Aplikasi Kasir Nusantara POS siap melayani transaksi.'), 'Harus siap melayani transaksi');
    pastikan(log.includes('Item berhasil ditambahkan: Buku Catatan Nusantara A5 (Subtotal: Rp 30000)'), 'Transaksi kasir harus menghitung subtotal dengan tepat');
  });

  // --- 11. REAL LAYOUT ENGINE (PHASE 36 COMPLETION) ---
  await uji('11.1 MesinTataLetak menghitung koordinat Baris, Kolom, Grid, Tab, dan BilahMenu', async () => {
    const jendela = new JendelaGUI({ judul: 'Uji Layout', lebar: 800, tinggi: 600 });
    const bm = new BilahMenu();
    bm.tambahMenu(new Menu('Berkas'));
    jendela.setBilahMenu(bm);

    const kol = new KolomLayout(10);
    const l1 = new LabelWidget('Judul Aplikasi');
    const b1 = new TombolWidget('Simpan', { flex: 1 });
    const b2 = new TombolWidget('Batal', { flex: 1 });
    const baris = new BarisLayout(8);
    baris.tambahAnak(b1).tambahAnak(b2);
    const grid = new GridLayout(2, 6);
    grid.tambahAnak(new LabelWidget('A')).tambahAnak(new LabelWidget('B')).tambahAnak(new LabelWidget('C'));
    kol.tambahAnak(l1).tambahAnak(baris).tambahAnak(grid);
    jendela.setKonten(kol);

    const engine = new MesinTataLetak();
    const layout = engine.hitungTataLetakJendela(jendela);

    pastikan(layout.kotakBilahMenu !== null && layout.kotakBilahMenu.tinggi === 28, 'BilahMenu harus terukur tinggi 28px');
    pastikan(layout.kotakKonten.y === 40, 'Area konten harus digeser ke bawah setelah BilahMenu + padding');
    const nb1 = layout.petaKotak.get(b1.id)!;
    const nb2 = layout.petaKotak.get(b2.id)!;
    pastikan(nb1.kotak.x < nb2.kotak.x, 'BarisLayout harus meletakkan b2 di sebelah kanan b1');
    pastikan(nb1.kotak.y === nb2.kotak.y, 'BarisLayout harus menyejajarkan b1 dan b2 secara horizontal');

    const hit = engine.cariNodePadaTitik(layout.akarKonten, nb1.kotak.x + 5, nb1.kotak.y + 5);
    pastikan(hit !== null && hit.widget.id === b1.id, 'Hit-testing koordinat harus menemukan b1 tepat sasaran');
  });

  // --- 12. SOFTWARE RGBA32 FRAMEBUFFER & RENDERING ENGINE ---
  await uji('12.1 KanvasFramebuffer & PerenderDesktop menghasilkan BMP, PPM, dan SVG valid', async () => {
    const jendela = new JendelaGUI({ judul: 'Render Uji', lebar: 400, tinggi: 300 });
    const kol = new KolomLayout(12);
    kol.tambahAnak(new LabelWidget('Halo Pixel'));
    kol.tambahAnak(new TombolWidget('Eksekusi'));
    kol.tambahAnak(new IndikatorProgresWidget(65, 100));
    jendela.setKonten(kol);

    const perender = new PerenderDesktop();
    const fbTerang = perender.renderKeFramebuffer(jendela);
    const bmp = fbTerang.eksporBMP();
    const ppm = fbTerang.eksporPPM();

    pastikan(bmp[0] === 0x42 && bmp[1] === 0x4d, 'Header BMP harus dimulai dengan signature BM');
    const dv = new DataView(bmp.buffer, bmp.byteOffset, bmp.byteLength);
    pastikan(dv.getInt32(18, true) === 400 && dv.getInt32(22, true) === 300, 'Dimensi BMP DIB harus 400x300');
    pastikan(dv.getUint32(2, true) === bmp.length, 'Ukuran berkas di header BMP harus cocok dengan byte array');

    const ppmHeader = Buffer.from(ppm.slice(0, 20)).toString('ascii');
    pastikan(ppmHeader.startsWith('P6\n400 300\n255\n'), 'Header PPM P6 harus valid');

    const gelapTema = new PengelolaTema('gelap').dapatkanSkema();
    const fbGelap = perender.renderKeFramebuffer(jendela, { skemaWarna: gelapTema });
    pastikan(fbTerang.hitungHashFNV1a() !== fbGelap.hitungHashFNV1a(), 'Tema gelap harus menghasilkan piksel berbeda dari tema terang');

    const svg = perender.renderKeSVG(jendela);
    pastikan(svg.includes('<svg') && svg.includes('Eksekusi'), 'Render SVG harus valid dan memuat label tombol');
  });

  // --- 13. INPUT ROUTER, FOCUS TRAVERSAL & MENU SHORTCUTS ---
  await uji('13.1 PengelolaInputGUI menangani klik koordinat, ketikan keyboard, Tab, dan shortcut menu', async () => {
    let shortcutDipicu = false;
    let tombolDiklik = false;

    const jendela = new JendelaGUI({ judul: 'Input Uji', lebar: 600, tinggi: 400 });
    const bm = new BilahMenu();
    const mBerkas = new Menu('Berkas');
    mBerkas.tambahItem(new ItemMenu('Simpan', () => { shortcutDipicu = true; }, 'Ctrl+S'));
    bm.tambahMenu(mBerkas);
    jendela.setBilahMenu(bm);

    const kol = new KolomLayout(10);
    const input = new InputTeksWidget('Nama', '');
    const cb = new KotakCentangWidget('Setuju', false);
    const tombol = new TombolWidget('Kirim', () => { tombolDiklik = true; });
    const slider = new SliderWidget(0, 100, 10);
    kol.tambahAnak(input).tambahAnak(cb).tambahAnak(tombol).tambahAnak(slider);
    jendela.setKonten(kol);

    const engine = new MesinTataLetak();
    const layout = engine.hitungTataLetakJendela(jendela);
    const router = new PengelolaInputGUI(jendela);

    // Fokus ke input melalui klik mouse
    const kInput = layout.petaKotak.get(input.id)!.kotak;
    await router.klikMouse(kInput.x + 10, kInput.y + 10);
    pastikan(router.getIdWidgetFokus() === input.id, 'Klik pada InputTeksWidget harus memindahkan fokus ke input');

    await router.tekanTombol('H');
    await router.tekanTombol('i');
    await router.tekanTombol('!');
    await router.tekanTombol('Backspace');
    pastikan(input.getNilai() === 'Hi', 'Ketikan keyboard dan Backspace harus mengubah nilai input');

    // Tab ke checkbox lalu Space untuk toggle
    await router.tekanTombol('Tab');
    pastikan(router.getIdWidgetFokus() === cb.id, 'Tombol Tab harus memindahkan fokus ke checkbox berikutnya');
    await router.tekanTombol(' ');
    pastikan(cb.isCentang() === true, 'Spasi pada checkbox terfokus harus mengubah status centang');

    // Klik mouse pada tombol
    const kTombol = layout.petaKotak.get(tombol.id)!.kotak;
    await router.klikMouse(kTombol.x + 10, kTombol.y + 10);
    pastikan(tombolDiklik, 'Klik koordinat pada tombol harus mengeksekusi handler klik');

    // Klik tengah slider
    const kSlider = layout.petaKotak.get(slider.id)!.kotak;
    await router.klikMouse(kSlider.x + Math.floor(kSlider.lebar / 2), kSlider.y + Math.floor(kSlider.tinggi / 2));
    pastikan(slider.getNilai() >= 45 && slider.getNilai() <= 55, 'Klik di tengah slider harus mengatur nilai sekitar 50');

    // Menu shortcut Ctrl+S
    const ditangani = await router.tekanTombol('s', { ctrl: true });
    pastikan(ditangani && shortcutDipicu, 'Shortcut Ctrl+S harus memicu ItemMenu Simpan');
  });

  // --- 14. LOOPBACK HTTP + WEBSOCKET DESKTOP HOST RUNTIME ---
  await uji('14.1 AdaptorDesktopWebviewServer melayani HTTP HTML & IPC WebSocket nyata', async () => {
    const srv = new AdaptorDesktopWebviewServer(0);
    const jendela = new JendelaGUI({ judul: 'Live Host', lebar: 500, tinggi: 300 });
    let diklik = false;
    const btn = new TombolWidget('Tekan WebSocket', () => { diklik = true; });
    const inp = new InputTeksWidget('Isi...', '');
    const kol = new KolomLayout(8);
    kol.tambahAnak(btn).tambahAnak(inp);
    jendela.setKonten(kol);

    await srv.inisialisasi({ idAplikasi: 'id.test.ws', namaAplikasi: 'WS App' });
    await srv.bukaJendela(jendela);

    try {
      const url = srv.getUrlAktif();
      pastikan(url.startsWith('http://127.0.0.1:'), 'Server desktop harus mendengarkan pada loopback port nyata');
      const resHtml = await fetch(url);
      const html = await resHtml.text();
      pastikan(resHtml.status === 200 && html.includes('Tekan WebSocket'), 'GET / harus menyajikan HTML antarmuka jendela');

      const wsUrl = url.replace('http://', 'ws://') + '/ipc';
      await new Promise<void>((resolve, reject) => {
        const client = new WebSocket(wsUrl);
        client.on('open', () => {
          client.send(JSON.stringify({ tipe: 'peristiwa', jenis: 'teks_berubah', idWidget: inp.id, nilaiTeks: 'Dari Klien' }));
          client.send(JSON.stringify({ tipe: 'peristiwa', jenis: 'klik', idWidget: btn.id }));
        });
        client.on('message', (raw) => {
          const msg = JSON.parse(String(raw));
          if (msg.tipe === 'sinkronisasi' && diklik && inp.getNilai() === 'Dari Klien') {
            client.close();
            resolve();
          }
        });
        client.on('error', reject);
        setTimeout(() => reject(new Error('Timeout menunggu sinkronisasi WebSocket')), 3000);
      });

      pastikan(diklik && inp.getNilai() === 'Dari Klien', 'Peristiwa WebSocket harus memperbarui widget nyata');
    } finally {
      await srv.hancurkan();
    }
  });

  // --- 15. NATIVE OS DETECTORS, PLATFORM ADAPTERS & DESKTOP PACKAGING ---
  await uji('15.1 Detektor OS, Adaptor Native & PengemasAplikasiDesktop menghasilkan bundel sah', async () => {
    const status = DetektorPlatformDesktop.deteksi();
    pastikan(['linux', 'windows', 'macos', 'lainnya'].includes(status.os), 'Detektor harus mengenali OS host');

    const jendela = new JendelaGUI({ judul: 'Aplikasi Kasir', lebar: 800, tinggi: 600 });
    jendela.setKonten(new LabelWidget('Kasir Nusantara'));

    const adLinux = new AdaptorDesktopLinux();
    await adLinux.inisialisasi({ idAplikasi: 'id.nusantara.kasir', namaAplikasi: 'Kasir' });
    const srcLinux = adLinux.hasilkanSumberHostNative(jendela);
    pastikan(srcLinux.isi.includes('#include <gtk/gtk.h>'), 'Host C Linux harus menghasilkan kode GTK3 valid');

    await adLinux.bukaJendela(jendela);
    const lap = adLinux.dapatkanLaporanTerakhir()!;
    if (!status.displayAktif) {
      pastikan(lap.status === 'NATIVE_DISPLAY_UNAVAILABLE', 'Harus melaporkan NATIVE_DISPLAY_UNAVAILABLE secara jujur tanpa display');
    }
    await adLinux.hancurkan();

    const adWin = new AdaptorDesktopWindows();
    pastikan(adWin.hasilkanSumberHostNative(jendela).isi.includes('WinMain'), 'Host Win32 harus valid');
    const adMac = new AdaptorDesktopMacOS();
    pastikan(adMac.hasilkanSumberHostNative(jendela).isi.includes('NSApplication'), 'Host Cocoa harus valid');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusantara-desktop-pkg-'));
    try {
      const pengemas = new PengemasAplikasiDesktop();
      const resLinux = pengemas.kemas({
        konfig: { idAplikasi: 'id.nusantara.kasir', namaAplikasi: 'Kasir Nusantara', versi: '0.36.0' },
        jendelaUtama: jendela,
        target: 'linux',
        direktoriKeluaran: tmpDir,
      });
      pastikan(resLinux.sukses && fs.existsSync(path.join(resLinux.direktoriBundel, 'id.nusantara.kasir.desktop')), 'Bundel Linux harus berisi berkas .desktop');
      pastikan(fs.existsSync(path.join(resLinux.direktoriBundel, 'SHA256SUMS')), 'Bundel harus berisi SHA256SUMS');

      const resMac = pengemas.kemas({
        konfig: { idAplikasi: 'id.nusantara.kasir', namaAplikasi: 'Kasir Nusantara', versi: '0.36.0' },
        jendelaUtama: jendela,
        target: 'macos',
        direktoriKeluaran: tmpDir,
      });
      pastikan(fs.existsSync(path.join(resMac.direktoriBundel, 'Contents/Info.plist')), 'Bundel macOS harus berisi Info.plist');

      const resWin = pengemas.kemas({
        konfig: { idAplikasi: 'id.nusantara.kasir', namaAplikasi: 'Kasir Nusantara', versi: '0.36.0' },
        jendelaUtama: jendela,
        target: 'windows',
        direktoriKeluaran: tmpDir,
      });
      pastikan(fs.existsSync(path.join(resWin.direktoriBundel, 'id.nusantara.kasir.exe.manifest')), 'Bundel Windows harus berisi Win32 manifest');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // --- 16. CLI DESKTOP COMMAND INTEGRATION ---
  await uji('16.1 CLI nusantara desktop check, render, package & run berfungsi menyeluruh', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusantara-desktop-cli-'));
    try {
      const logs: string[] = [];
      const cli = new NusantaraCLI({ log: (m) => logs.push(m) });
      pastikan(cli.jalankan(['desktop', 'check']) === 0, 'desktop check harus exit 0');
      pastikan(logs.join('\n').includes('AUDIT KAPABILITAS DESKTOP GUI NUSANTARA'), 'Output check harus berisi laporan kapabilitas');

      const outBmp = path.join(tmpDir, 'out.bmp');
      pastikan(cli.jalankan(['desktop', 'render', `--out=${outBmp}`]) === 0, 'desktop render BMP harus exit 0');
      const bmpBytes = fs.readFileSync(outBmp);
      pastikan(bmpBytes[0] === 0x42 && bmpBytes[1] === 0x4d, 'Berkas output desktop render harus berupa BMP valid');

      pastikan(cli.jalankan(['desktop', 'package', '--target=linux', `--out=${tmpDir}`]) === 0, 'desktop package harus exit 0');
      pastikan(cli.jalankan(['desktop', 'run']) === 0, 'desktop run harus exit 0 dan melaporkan status display');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  console.log('='.repeat(70));
  console.log(`HASIL PENGUJIAN FASE 36: ${tesBerhasil}/${totalTes} LULUS`);
  if (!lulusSemua) {
    console.error('Pengujian Fase 36 GAGAL!');
    process.exit(1);
  } else {
    console.log('Semua pengujian Fase 36 BERHASIL 100%!');
  }
}

main().catch((err) => {
  console.error('Galat fatal dalam pengujian Fase 36:', err);
  process.exit(1);
});
