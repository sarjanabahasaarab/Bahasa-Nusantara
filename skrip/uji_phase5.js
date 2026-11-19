import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');let pass=0,fail=0;
function cek(n,k){if(k){pass++;console.log('✓ '+n)}else{fail++;console.error('✗ '+n)}}
function baca(p){return fs.readFileSync(path.join(root,p),'utf8')}
function tautanValid(p){const s=baca(p),r=/\\[[^\\]]*\\]\\(([^)]+)\\)/g;for(const m of s.matchAll(r)){const u=m[1].trim().split('#')[0];if(!u||/^(https?:|mailto:|tel:|data:)/i.test(u))continue;const t=path.resolve(root,path.dirname(p),decodeURIComponent(u));if(!t.startsWith(root+path.sep)||!fs.existsSync(t))return false}return true}
const d=baca('docs/README.md'),i=baca('docs/indeks.md'),g=baca('docs/glosarium.md'),p=baca('docs/panduan/persiapan.md'),q=baca('docs/panduan/program-pertama.md'),s=baca('docs/pengenalan/status-pengembangan.md'),t=baca('docs/pengembang/standar-dokumentasi.md');
cek('Pusat dokumentasi memuat enam bagian utama',['Pengenalan','Panduan Pemula','Referensi Bahasa','Panduan Pengembang','Panduan Kontribusi','Glosarium Istilah'].every(x=>d.includes(x)));
cek('Pusat dokumentasi menautkan indeks lengkap',d.includes('[Indeks Dokumentasi](indeks.md)'));
cek('Indeks memuat enam bagian',['Bagian 1: Pengenalan','Bagian 2: Panduan Pemula','Bagian 3: Referensi Bahasa Formal','Bagian 4: Dokumentasi Pengembang','Bagian 5: Panduan Kontribusi','Bagian 6: Glosarium'].every(x=>i.includes(x)));
cek('Tautan lokal pusat dokumentasi valid',tautanValid('docs/README.md'));
cek('Tautan lokal indeks valid',tautanValid('docs/indeks.md'));
cek('Panduan persiapan menyebut UTF-8 dan ekstensi',p.includes('UTF-8')&&p.includes('.nusantara'));
cek('Panduan persiapan membedakan kode sumber dan paket biner',p.includes('paket biner resmi')&&p.includes('kode sumber'));
cek('Program pertama menjelaskan batas verifikasi',q.includes('Dukungan eksekusi bergantung'));
cek('Status milestone merujuk implementasi Phase 6–8',s.includes('Phase 6–8'));
cek('Status milestone menyebut Phase 50',s.includes('Phase 50'));
cek('Status milestone mengarahkan ke roadmap terkini',s.includes('bukan laporan status repositori terkini'));
cek('Standar mengatur tautan lokal dan status akurat',t.includes('Tautan Lokal')&&t.includes('Status Pengembangan'));
cek('Glosarium memuat sedikitnya 25 istilah',(g.match(/^\\| \\*\\*/gm)||[]).length>=25);
console.log('Phase 5: '+pass+'/12 lulus, '+fail+' gagal');if(fail)process.exitCode=1;
