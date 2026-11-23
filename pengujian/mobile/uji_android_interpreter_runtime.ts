import assert from "node:assert/strict";
import { jalankanKodeAndroid } from "../../native/android/runtime/runner";

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

console.log("PASS: Android official interpreter runtime smoke tests (4 assertions groups)");
