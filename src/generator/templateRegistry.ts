/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA CLI Application Generator (Phase 33)
 * Registry Template Proyek Terpusat & Terverifikasi
 */

import { DefinisiTemplate } from './types';
import { VERSI_NUSANTARA } from '../konstanta/versi';

export class TemplateRegistry {
  private templates: Map<string, DefinisiTemplate> = new Map();

  constructor() {
    this.inisialisasiTemplateBawaan();
  }

  private inisialisasiTemplateBawaan(): void {
    // 1. Template: Basic Application
    this.daftarkan({
      id: 'basic',
      nama: 'Aplikasi Dasar (Basic Application)',
      kategori: 'aplikasi',
      deskripsi: 'Proyek perdana minimalis untuk mempelajari sintaks dasar dan eksekusi program bahasa NUSANTARA.',
      versi: '1.0.0',
      versiMinimumNusantara: '0.1.0',
      persyaratanRuntime: ['interpreter', 'penulisOutput'],
      dependensi: {},
      status: 'siap',
      petunjukJalankan: [
        'nusantara check',
        'nusantara jalankan src/utama.nusantara',
      ],
      batasan: ['Tidak menyertakan server HTTP atau basis data (gunakan template web/database jika diperlukan).'],
      berkas: [
        {
          jalur: 'src/utama.nusantara',
          konten: `program {{PASCAL_NAME}}

mulai
    tampilkan("Halo Dunia dari bahasa NUSANTARA!")
    tampilkan("Selamat datang di proyek: {{NAMA_PROYEK}}")
    tampilkan("Versi: {{VERSI_PROYEK}} | Tahun: {{TAHUN}}")
selesai
`,
        },
        {
          jalur: 'README.md',
          konten: `# {{NAMA_PROYEK}}

{{DESKRIPSI_PROYEK}}

## Persyaratan
- Bahasa Pemrograman NUSANTARA >= v{{VERSI_NUSANTARA}}

## Menjalankan Program
\`\`\`bash
nusantara jalankan src/utama.nusantara
\`\`\`

## Memeriksa Proyek
\`\`\`bash
nusantara check
\`\`\`

## Lisensi
Proyek ini dilisensikan di bawah lisensi {{LISENSI}}.
`,
        },
        {
          jalur: '.gitignore',
          konten: `# Direktori keluaran & cache NUSANTARA
target/
.cache/
node_modules/
*.db
*.log
`,
        },
      ],
    });

    // 2. Template: Reusable Library
    this.daftarkan({
      id: 'library',
      nama: 'Pustaka Terpakai Ulang (Reusable Library)',
      kategori: 'pustaka',
      deskripsi: 'Struktur modul pustaka (library) untuk mendistribusikan fungsi dan logika terenkapsulasi ke ekosistem paket.',
      versi: '1.0.0',
      versiMinimumNusantara: '0.15.0',
      persyaratanRuntime: ['sistemModul', 'pemuatModul'],
      dependensi: {},
      status: 'siap',
      petunjukJalankan: [
        'nusantara check',
        'nusantara jalankan contoh/pemakaian.nusantara',
      ],
      batasan: ['Merupakan pustaka murni; entry point utama adalah modul deklaratif tanpa blok mulai program.'],
      berkas: [
        {
          jalur: 'src/lib.nusantara',
          konten: `// ============================================================================
// Pustaka: {{NAMA_PROYEK}} (v{{VERSI_PROYEK}})
// Lisensi: {{LISENSI}}
// ============================================================================

fungsi sapa(nama : teks) : teks
mulai
    kembalikan "Halo, " + nama + "! Selamat datang di modul {{NAMA_PROYEK}}."
selesai

fungsi jumlahkan(a : bilangan, b : bilangan) : bilangan
mulai
    kembalikan a + b
selesai
`,
        },
        {
          jalur: 'contoh/pemakaian.nusantara',
          konten: `program ContohPemakaian
gunakan "lib" sebagai pustaka

mulai
    pesan : teks = pustaka.sapa("Pengembang Nusantara")
    tampilkan(pesan)
    
    total : bilangan = pustaka.jumlahkan(35, 65)
    tampilkan("Hasil penjumlahan: 35 + 65 =", total)
selesai
`,
        },
        {
          jalur: 'README.md',
          konten: `# Pustaka {{NAMA_PROYEK}}

{{DESKRIPSI_PROYEK}}

## Modul dan Fungsi
- \`sapa(nama: teks): teks\`
- \`jumlahkan(a: bilangan, b: bilangan): bilangan\`

## Menjalankan Contoh
\`\`\`bash
nusantara jalankan contoh/pemakaian.nusantara
\`\`\`
`,
        },
        {
          jalur: '.gitignore',
          konten: `target/\n.cache/\n*.log\n`,
        },
      ],
    });

    // 3. Template: Web Application
    this.daftarkan({
      id: 'web',
      nama: 'Aplikasi Web Dinamis (Web Application)',
      kategori: 'layanan',
      deskripsi: 'Fondasi aplikasi website dinamis berbasis NUSANTARA Web Application Framework dengan router, handler, dan berkas statis.',
      versi: '1.0.0',
      versiMinimumNusantara: '0.30.0',
      persyaratanRuntime: ['modulWeb', 'serverHTTP', 'mesinTemplate'],
      dependensi: {
        web: '^0.30.0',
      },
      status: 'siap',
      petunjukJalankan: [
        'nusantara check',
        'nusantara jalankan src/utama.nusantara',
        'nusantara layani src/utama.nusantara --port 3000',
      ],
      batasan: ['Menjalankan server web HTTP lokal pada port yang ditentukan (default 3000).'],
      berkas: [
        {
          jalur: 'src/utama.nusantara',
          konten: `program {{PASCAL_NAME}}
gunakan "web" sebagai web

fungsi tanganiBeranda(req : peta, res : peta)
mulai
    res.html("<!doctype html><html><head><meta charset='utf-8'><title>{{NAMA_PROYEK}}</title><link rel='stylesheet' href='/aset/gaya.css'></head><body><header><h1>{{NAMA_PROYEK}}</h1><p>{{DESKRIPSI_PROYEK}}</p></header><main><p>Selamat datang! Aplikasi web NUSANTARA siap melayani permintaan.</p></main></body></html>")
selesai

fungsi tanganiStatus(req : peta, res : peta)
mulai
    res.json({ "layanan": "{{NAMA_PROYEK}}", "status": "berjalan", "versi": "{{VERSI_PROYEK}}" })
selesai

mulai
    app : peta = web.buatAplikasi()
    app.dapatkan("/", tanganiBeranda)
    app.dapatkan("/status", tanganiStatus)
    tampilkan("Aplikasi Web '{{NAMA_PROYEK}}' telah siap.")
selesai
`,
        },
        {
          jalur: 'publik/aset/gaya.css',
          konten: `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  margin: 0;
  padding: 40px;
  background-color: #f1f5f9;
  color: #0f172a;
}
header h1 {
  color: #0284c7;
  margin-bottom: 8px;
}
`,
        },
        {
          jalur: 'README.md',
          konten: `# {{NAMA_PROYEK}} (Aplikasi Web)

{{DESKRIPSI_PROYEK}}

## Cara Menjalankan
\`\`\`bash
nusantara layani src/utama.nusantara --port 3000
\`\`\`
Buka peramban (browser) di \`http://localhost:3000\`.
`,
        },
        {
          jalur: '.gitignore',
          konten: `target/\n.cache/\n*.log\n`,
        },
      ],
    });

    // 4. Template: REST API Service
    this.daftarkan({
      id: 'api',
      nama: 'Layanan REST API (API Service)',
      kategori: 'layanan',
      deskripsi: 'Kerangka RESTful API dengan JSON serialization, endpoint kesehatan, routing modular, dan validasi input.',
      versi: '1.0.0',
      versiMinimumNusantara: '0.30.0',
      persyaratanRuntime: ['modulWeb', 'jsonParser'],
      dependensi: {
        web: '^0.30.0',
      },
      status: 'siap',
      petunjukJalankan: [
        'nusantara check',
        'nusantara jalankan src/utama.nusantara',
        'nusantara layani src/utama.nusantara --port 8080',
      ],
      batasan: ['Menyajikan respons format JSON murni.'],
      berkas: [
        {
          jalur: 'src/utama.nusantara',
          konten: `program {{PASCAL_NAME}}
gunakan "web" sebagai web

fungsi tanganiKesehatan(req : peta, res : peta)
mulai
    res.json({
        "layanan": "{{NAMA_PROYEK}}",
        "status": "sehat",
        "versi": "{{VERSI_PROYEK}}"
    })
selesai

fungsi tanganiDaftarItem(req : peta, res : peta)
mulai
    res.json({
        "sukses": benar,
        "total": 2,
        "data": [
            { "id": 1, "nama": "Contoh Item A", "status": "tersedia" },
            { "id": 2, "nama": "Contoh Item B", "status": "dalam_proses" }
        ]
    })
selesai

mulai
    app : peta = web.buatAplikasi()
    app.dapatkan("/api/kesehatan", tanganiKesehatan)
    app.dapatkan("/api/v1/item", tanganiDaftarItem)
    tampilkan("Layanan API '{{NAMA_PROYEK}}' telah terkonfigurasi.")
selesai
`,
        },
        {
          jalur: 'README.md',
          konten: `# Layanan API: {{NAMA_PROYEK}}

{{DESKRIPSI_PROYEK}}

## Endpoint Tersedia
- \`GET /api/kesehatan\` - Memeriksa status kesehatan layanan
- \`GET /api/v1/item\` - Mengambil daftar koleksi data percontohan

## Menjalankan Layanan
\`\`\`bash
nusantara layani src/utama.nusantara --port 8080
\`\`\`
`,
        },
        {
          jalur: '.gitignore',
          konten: `target/\n.cache/\n*.log\n`,
        },
      ],
    });

    // 5. Template: Database & ORM Application
    this.daftarkan({
      id: 'database',
      nama: 'Aplikasi Basis Data & ORM (Database Application)',
      kategori: 'aplikasi',
      deskripsi: 'Aplikasi terintegrasi dengan mesin database SQLite, ORM Query Builder berparameter, migrasi skema, dan seeder.',
      versi: '1.0.0',
      versiMinimumNusantara: '0.32.0',
      persyaratanRuntime: ['adaptorBasisdata', 'ormModule', 'sqliteDriver'],
      dependensi: {
        basisdata: '^0.29.0',
        orm: '^0.32.0',
      },
      status: 'siap',
      petunjukJalankan: [
        'nusantara check',
        'nusantara db status',
        'nusantara db migrasi',
        'nusantara jalankan src/utama.nusantara',
      ],
      batasan: ['Menggunakan SQLite lokal (:memory: atau berkas .db) dengan binding parameter aman.'],
      berkas: [
        {
          jalur: 'src/utama.nusantara',
          konten: `program {{PASCAL_NAME}}
gunakan "basisdata" sebagai db
gunakan "orm" sebagai o

mulai
    tampilkan("Menginisialisasi basis data untuk proyek '{{NAMA_PROYEK}}'...")
    koneksi : peta = db.bukaMemori()
    o.tetapkanKoneksi(koneksi)
    
    // Inisialisasi skema tabel awal
    koneksi.eksekusi("CREATE TABLE IF NOT EXISTS barang (id INTEGER PRIMARY KEY, nama TEXT, stok INTEGER);")
    koneksi.eksekusi("INSERT INTO barang (nama, stok) VALUES ('Kopi Mandailing', 50);")
    koneksi.eksekusi("INSERT INTO barang (nama, stok) VALUES ('Teh Kayu Aro', 30);")
    
    // Query Builder ORM
    kueri : peta = o.buatKueri("barang", koneksi)
    kueri.diMana("stok", ">=", 20)
    daftarBarang : daftar = kueri.ambil()
    
    tampilkan("Total komoditas dalam stok:", panjang(daftarBarang))
    tampilkan("Komoditas pertama:", daftarBarang[0]["nama"])
selesai
`,
        },
        {
          jalur: 'migrasi/001_buat_tabel_barang.ts',
          konten: `// Migrasi Awal: 001_buat_tabel_barang
export default {
  nama: '001_buat_tabel_barang',
  naik(skema: any, db: any) {
    skema.buatTabel('barang', (t: any) => {
      t.id();
      t.teks('nama', 100);
      t.bilangan('stok').nilaiBawaan(0);
    });
  },
  turun(skema: any, db: any) {
    skema.hapusTabelJikaAda('barang');
  },
};
`,
        },
        {
          jalur: 'README.md',
          konten: `# {{NAMA_PROYEK}} (Database & ORM)

{{DESKRIPSI_PROYEK}}

## Perintah Migrasi
\`\`\`bash
nusantara db status
nusantara db migrasi
nusantara db rollback
\`\`\`

## Menjalankan Program
\`\`\`bash
nusantara jalankan src/utama.nusantara
\`\`\`
`,
        },
        {
          jalur: '.gitignore',
          konten: `target/\n.cache/\n*.db\n*.sqlite\n*.log\n`,
        },
      ],
    });

    // 6. Template: Console / CLI Tool Application
    this.daftarkan({
      id: 'console',
      nama: 'Aplikasi Konsol / CLI Tool (Console Application)',
      kategori: 'alat',
      deskripsi: 'Aplikasi baris perintah interaktif dengan pemrosesan argumen, bantuan terformat, dan penanganan status keluar.',
      versi: '1.0.0',
      versiMinimumNusantara: '0.27.0',
      persyaratanRuntime: ['sistemIO', 'argumenCLI'],
      dependensi: {
        sistem: '^0.27.0',
      },
      status: 'siap',
      petunjukJalankan: [
        'nusantara check',
        'nusantara jalankan src/utama.nusantara',
        'nusantara jalankan src/utama.nusantara --bantuan',
      ],
      batasan: ['Menjalankan input dan output pada antarmuka terminal/konsol.'],
      berkas: [
        {
          jalur: 'src/utama.nusantara',
          konten: `program {{PASCAL_NAME}}
gunakan "sistem" sebagai sistem

mulai
    tampilkan("==================================================")
    tampilkan("ALAT KONSOL NUSANTARA: {{NAMA_PROYEK}}")
    tampilkan("Versi: {{VERSI_PROYEK}} | Tahun: {{TAHUN}}")
    tampilkan("==================================================")
    tampilkan("Status: Siap memproses input baris perintah.")
    tampilkan("Ketik 'nusantara jalankan src/utama.nusantara --bantuan' untuk panduan.")
selesai
`,
        },
        {
          jalur: 'README.md',
          konten: `# Alat Konsol: {{NAMA_PROYEK}}

{{DESKRIPSI_PROYEK}}

## Penggunaan
\`\`\`bash
nusantara jalankan src/utama.nusantara
\`\`\`
`,
        },
        {
          jalur: '.gitignore',
          konten: `target/\n.cache/\n*.log\n`,
        },
      ],
    });
  }

  public daftarkan(template: DefinisiTemplate): void {
    this.templates.set(template.id.toLowerCase(), template);
  }

  public dapatkan(id: string): DefinisiTemplate | undefined {
    return this.templates.get(id.toLowerCase());
  }

  public apakahAda(id: string): boolean {
    return this.templates.has(id.toLowerCase());
  }

  public dapatkanSemua(): DefinisiTemplate[] {
    return Array.from(this.templates.values());
  }

  public dapatkanDaftarId(): string[] {
    return Array.from(this.templates.keys());
  }
}
