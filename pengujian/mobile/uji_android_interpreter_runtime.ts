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



// Fitur bahasa inti harus berjalan melalui runtime resmi yang dipakai WebView Android.
const kasusBahasa = [
  {
    nama: "variabel dan operasi matematika",
    sumber: `program UjiVariabel
mulai
  nilai : bilangan = 10
  nilai = nilai + 5
  tampilkan(nilai * 2)
selesai`,
    keluaran: ["30"],
  },
  {
    nama: "percabangan jika-maka-selain",
    sumber: `program UjiPercabangan
mulai
  nilai : bilangan = 80
  jika nilai >= 75 maka
    tampilkan("Lulus")
  selain
    tampilkan("Belum Lulus")
  akhir
selesai`,
    keluaran: ["Lulus"],
  },
  {
    nama: "perulangan untuk",
    sumber: `program UjiPerulangan
mulai
  untuk angka dari 1 sampai 3 lakukan
    tampilkan(angka)
  akhir
selesai`,
    keluaran: ["1", "2", "3"],
  },
  {
    nama: "fungsi dan nilai kembali",
    sumber: `fungsi tambah(a : bilangan, b : bilangan) : bilangan
mulai
  kembalikan a + b
selesai
program UjiFungsi
mulai
  tampilkan(tambah(12, 8))
selesai`,
    keluaran: ["20"],
  },
  {
    nama: "daftar dan akses indeks",
    sumber: `program UjiDaftar
mulai
  angka : daftar = [10, 20, 30]
  tampilkan(angka[1])
  tampilkan(panjang(angka))
selesai`,
    keluaran: ["20", "3"],
  },
  {
    nama: "peta dan akses kunci",
    sumber: `program UjiPeta
mulai
  pengguna : peta = {nama: "Nusantara", aktif: benar}
  tampilkan(pengguna["nama"])
  tampilkan(pengguna["aktif"])
selesai`,
    keluaran: ["Nusantara", "benar"],
  },
] as const;

for (const kasus of kasusBahasa) {
  const hasilKasus = jalankanKodeAndroid(kasus.sumber);
  assert.equal(hasilKasus.berhasil, true, `${kasus.nama}: ${hasilKasus.galat ?? "runtime gagal"}`);
  assert.deepEqual(hasilKasus.keluaran, kasus.keluaran, kasus.nama);
}

// Setiap eksekusi membuat instance interpreter baru; variabel program sebelumnya
// tidak boleh bocor ke eksekusi berikutnya.
const eksekusiPertama = jalankanKodeAndroid(
  'program Pertama\nmulai\n  rahasia : bilangan = 123\n  tampilkan(rahasia)\nselesai'
);
const eksekusiKedua = jalankanKodeAndroid(
  'program Kedua\nmulai\n  tampilkan("runtime bersih")\nselesai'
);
assert.equal(eksekusiPertama.berhasil, true);
assert.equal(eksekusiKedua.berhasil, true);
assert.deepEqual(eksekusiKedua.keluaran, ["runtime bersih"]);

// Batas output diuji terhadap kedua dimensi secara bersamaan.
assert.ok(hasilBaris.length <= 1000, "Jumlah baris tidak boleh melewati 1.000");
assert.ok(
  hasilKarakter.reduce((jumlah, baris) => jumlah + baris.length, 0) <= 256 * 1024,
  "Jumlah karakter tidak boleh melewati 256 KiB"
);

console.log("PASS: Android official interpreter runtime tests (6 language feature cases + limits + isolation)");
