/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 29 Browser Fallback Test Suite
 * Pengujian terpisah khusus untuk fallback in-memory peramban (MesinMemoriBrowserSQLite)
 * guna memverifikasi batas kemampuan yang terdokumentasi tanpa mencemari pengujian native Node.js.
 */

import { MesinMemoriBrowserSQLite } from '../../src/database/sqlite';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;

function uji(deskripsi: string, fn: () => void) {
  totalUji++;
  try {
    fn();
    totalLulus++;
    console.log(`  ✓ ${deskripsi}`);
  } catch (err) {
    totalGagal++;
    console.error(`  ✗ ${deskripsi}`);
    console.error(`    ${(err as Error).message}`);
  }
}

function pastikan(kondisi: boolean, pesan: string) {
  if (!kondisi) throw new Error(pesan);
}

function pastikanSama(aktual: any, diharapkan: any, pesan?: string) {
  if (aktual !== diharapkan) {
    throw new Error(pesan || `Diharapkan ${JSON.stringify(diharapkan)}, didapat ${JSON.stringify(aktual)}`);
  }
}

console.log('=== PENGUJIAN TERPISAH FALLBACK PERAMBAN (BROWSER IN-MEMORY SQLITE) ===\n');

uji('Mendukung CREATE TABLE, INSERT, SELECT, UPDATE, DELETE dasar di memori peramban', () => {
  const db = new MesinMemoriBrowserSQLite(':memory:');
  db.exec('CREATE TABLE catatan (id INTEGER PRIMARY KEY, judul TEXT UNIQUE, status TEXT)');
  const ins = db.prepare('INSERT INTO catatan (judul, status) VALUES (?, ?)').run('Rencana', 'baru');
  pastikanSama(ins.changes, 1);

  const row = db.prepare('SELECT * FROM catatan WHERE judul = ?').get('Rencana');
  pastikan(row !== undefined, 'Baris harus ditemukan');
  pastikanSama(row.status, 'baru');

  const upd = db.prepare('UPDATE catatan SET status = ? WHERE judul = ?').run('selesai', 'Rencana');
  pastikanSama(upd.changes, 1);
  pastikanSama(db.prepare('SELECT status FROM catatan WHERE judul = ?').get('Rencana').status, 'selesai');

  const del = db.prepare('DELETE FROM catatan WHERE judul = ?').run('Rencana');
  pastikanSama(del.changes, 1);
  pastikanSama(db.prepare('SELECT * FROM catatan').all().length, 0);
  db.close();
});

uji('Menegakkan UNIQUE constraint dan menolak sintaks tidak didukung secara eksplisit', () => {
  const db = new MesinMemoriBrowserSQLite(':memory:');
  db.exec('CREATE TABLE pengguna (email TEXT UNIQUE)');
  db.prepare('INSERT INTO pengguna (email) VALUES (?)').run('uji@nusantara.id');

  let kenaUnik = false;
  try {
    db.prepare('INSERT INTO pengguna (email) VALUES (?)').run('uji@nusantara.id');
  } catch (err) {
    kenaUnik = true;
    pastikan((err as Error).message.includes('UNIQUE constraint'), 'Harus melempar galat UNIQUE');
  }
  pastikan(kenaUnik, 'Duplikasi UNIQUE pada fallback peramban harus ditolak');

  let kenaSintaks = false;
  try {
    db.prepare('SELECTT DARI tabel_palsu').run();
  } catch (err) {
    kenaSintaks = true;
    pastikan((err as Error).message.includes('syntax error'), 'Sintaks tidak valid harus ditolak eksplisit');
  }
  pastikan(kenaSintaks, 'Fallback peramban tidak boleh menelan perintah SQL salah secara diam-diam');
  db.close();
});

uji('Mendukung snapshot transaksi BEGIN, COMMIT, dan ROLLBACK pada fallback peramban', () => {
  const db = new MesinMemoriBrowserSQLite(':memory:');
  db.exec('CREATE TABLE item (nama TEXT)');
  db.exec('BEGIN');
  db.prepare('INSERT INTO item (nama) VALUES (?)').run('Sementara');
  db.exec('ROLLBACK');
  pastikanSama(db.prepare('SELECT * FROM item').all().length, 0);

  db.exec('BEGIN');
  db.prepare('INSERT INTO item (nama) VALUES (?)').run('Permanen');
  db.exec('COMMIT');
  pastikanSama(db.prepare('SELECT * FROM item').all().length, 1);
  db.close();
});

console.log('\n=============================================================================');
console.log(`HASIL FALLBACK PERAMBAN: ${totalLulus} Lulus, ${totalGagal} Gagal dari ${totalUji} Uji.`);
console.log('=============================================================================');

if (totalGagal > 0) {
  process.exit(1);
}
