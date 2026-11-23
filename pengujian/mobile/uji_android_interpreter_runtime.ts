import assert from "node:assert/strict";
import {
  jalankanKodeAndroid,
  PenulisOutputAndroidTerbatas,
} from "../../native/android/runtime/runner";

const hasil = jalankanKodeAndroid(
  'program UjiAndroid\nmulai\n  tampilkan("Halo dari runtime Android")\nselesai'
);
assert.equal(hasil.berhasil, true, hasil.galat);
assert.deepEqual(hasil.keluaran, ["Halo dari runtime Android"]);

const sintaksSalah = jalankanKodeAndroid("program Rusak\nmulai\n  tampilkan(");
assert.equal(sintaksSalah.berhasil, false);
assert.ok(sintaksSalah.galat);

const kosong = jalankanKodeAndroid("");
assert.equal(kosong.berhasil, false);
assert.match(kosong.galat ?? "", /kosong/i);

const terlaluBesar = jalankanKodeAndroid(" ".repeat(256 * 1024 + 1));
assert.equal(terlaluBesar.berhasil, false);
assert.match(terlaluBesar.galat ?? "", /256 KiB/);

const writerBaris = new PenulisOutputAndroidTerbatas();
for (let i = 0; i < 1200; i++) writerBaris.tulisBaris("baris-" + i);
const hasilBaris = writerBaris.dapatkanSeluruhTeks();
assert.ok(hasilBaris.length <= 1000);
assert.ok(hasilBaris.some((baris) => baris.includes("dibatasi")));

const writerKarakter = new PenulisOutputAndroidTerbatas();
writerKarakter.tulisBaris("x".repeat(300 * 1024));
writerKarakter.tulisBaris("baris tambahan yang tidak boleh ditampung");
const hasilKarakter = writerKarakter.dapatkanSeluruhTeks();
assert.ok(hasilKarakter.reduce((jumlah, baris) => jumlah + baris.length, 0) <= 256 * 1024);
assert.ok(hasilKarakter.some((baris) => baris.includes("dibatasi")));

console.log("PASS: Android official interpreter runtime smoke tests (6 assertion groups)");
