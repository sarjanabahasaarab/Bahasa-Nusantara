/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 38
 * Adaptor Simulator / Desktop Mobile (Simulator Platform Adapter)
 */

import { AdaptorPlatformNative } from './platform_adapter';
import { HasilOperasiNative, buatHasilSukses, buatHasilGagal, KodeGalatNative } from '../core/result';
import { InfoPerangkatMobile } from '../../device/info';
import { StatusJaringanMobile } from '../../device/network';
import { StatusBateraiMobile } from '../../device/battery';
import { GetaranMobile } from '../../device/haptics';
import { PapanKlipMobile } from '../../device/clipboard';
import { LokasiPerangkatMobile } from '../../device/location';
import { NotifikasiLokalMobile } from '../../device/notification';
import { BerbagiMobile } from '../../device/share';
import { PenyimpananAmanMobile } from '../../security/secure_storage';
import { PengirimPeristiwaNative } from '../core/events';
import { PemeriksaHardwareHost } from '../core/hardware_probe';
import { muatModulNode, apakahNodeRuntime } from '../../../gui/platform/node_bridge';

export class AdaptorSimulatorMobile implements AdaptorPlatformNative {
  public readonly namaPlatform: 'android' | 'ios' | 'simulator' = 'simulator';
  private pengirimPeristiwa = PengirimPeristiwaNative.dapatkanInstance();
  private readonly direktoriSandbox?: string;
  private berkasMemoriBrowser: Map<string, string> = new Map();

  constructor(direktoriSandbox?: string) {
    this.direktoriSandbox = direktoriSandbox;
  }

  private dapatkanAkarSandbox(): string | null {
    if (!apakahNodeRuntime()) return null;
    const os = muatModulNode<any>('os');
    const path = muatModulNode<any>('path');
    const fs = muatModulNode<any>('fs');
    if (!os || !path || !fs) return null;
    const akar = path.resolve(this.direktoriSandbox || path.join(os.tmpdir(), 'nusantara-mobile-sandbox'));
    fs.mkdirSync(akar, { recursive: true });
    return fs.realpathSync(akar);
  }

  private selesaikanJalurSandbox(jalur: string): { ok: true; absolut: string } | { ok: false } {
    if (!jalur || jalur.includes('\0') || jalur.startsWith('/') || jalur.startsWith('\\')) {
      return { ok: false };
    }
    const path = muatModulNode<any>('path');
    const akar = this.dapatkanAkarSandbox();
    if (!path || !akar) {
      if (jalur.includes('..')) return { ok: false };
      return { ok: true, absolut: jalur };
    }
    const bersih = path.normalize(jalur);
    if (bersih.startsWith('..') || path.isAbsolute(bersih)) {
      return { ok: false };
    }
    const tujuan = path.resolve(akar, bersih);
    if (tujuan !== akar && !tujuan.startsWith(akar + path.sep)) {
      return { ok: false };
    }
    return { ok: true, absolut: tujuan };
  }

  public async dapatkanInfoPerangkat(): Promise<HasilOperasiNative<any>> {
    const info = InfoPerangkatMobile.dapatkanInfo();
    const probe = PemeriksaHardwareHost.periksaHost();
    return buatHasilSukses({
      ...info,
      produsen: 'Nusantara Host Runtime',
      merek: probe.adbTersedia && probe.perangkatADB.length > 0 ? probe.perangkatADB[0].model || 'ADB Device' : 'Virtual Device',
      tipePerangkat: 'simulator',
      dukunganSensor: ['akselerometer', 'giroskop', 'magnetometer'],
      perangkatFisikTerhubung: probe.perangkatADB.some((p) => p.status === 'device'),
      sumberData: probe.nodeRuntime ? 'HOST_OS_REAL' : 'BROWSER_SANDBOX',
      hardwareProbe: {
        hostOS: probe.hostOS,
        arsitektur: probe.arsitektur,
        namaHost: probe.namaHost,
        memoriTotalMB: probe.memoriTotalMB,
        memoriBebasMB: probe.memoriBebasMB,
        kameraV4L2: probe.kameraV4L2,
        bluetoothHCI: probe.bluetoothHCI,
        perangkatADB: probe.perangkatADB,
      },
    });
  }

  public async ambilFoto(opsi?: { kamera?: 'depan' | 'belakang'; flash?: boolean; kualitas?: number }): Promise<HasilOperasiNative<any>> {
    const kamera = opsi?.kamera || 'belakang';
    const probe = PemeriksaHardwareHost.periksaHost();
    return buatHasilSukses({
      uri: `file:///data/user/0/id.nusantara.app/cache/foto_sim_${Date.now()}.jpg`,
      lebar: 1920,
      tinggi: 1080,
      format: 'image/jpeg',
      kamera,
      flashDigunakan: Boolean(opsi?.flash),
      ukuranByte: 1024 * 350,
      perangkatKameraHost: probe.kameraV4L2,
      sumberData: probe.kameraV4L2.length > 0 ? 'V4L2_NODE_DETECTED' : 'SIMULASI_KAMERA',
    }, 'Foto simulator berhasil diambil.');
  }

  public async pilihMedia(opsi?: { tipe?: 'foto' | 'video' | 'semua'; maksPilihan?: number }): Promise<HasilOperasiNative<any>> {
    const tipe = opsi?.tipe || 'foto';
    return buatHasilSukses({
      item: [
        {
          uri: `content://media/external/images/media/sim_${Date.now()}`,
          nama: 'gambar_contoh.png',
          tipeMime: tipe === 'video' ? 'video/mp4' : 'image/png',
          ukuranByte: 1024 * 512,
        },
      ],
      jumlah: 1,
    }, 'Media berhasil dipilih dari pemilih sistem.');
  }

  public async dapatkanLokasi(opsi?: { akurasiTinggi?: boolean; timeoutMs?: number }): Promise<HasilOperasiNative<any>> {
    const lok = await LokasiPerangkatMobile.dapatkanLokasiSaatIni({ akurasiTinggi: opsi?.akurasiTinggi });
    return buatHasilSukses({
      ...lok,
      sumberData: 'SIMULASI_GPS_TIDAK_TERSEDIA_HARDWARE',
    }, 'Koordinat lokasi berhasil diperoleh.');
  }

  public async jadwalkanNotifikasi(notif: { id: string; judul: string; pesan: string; tundaDetik?: number }): Promise<HasilOperasiNative<any>> {
    const sukses = await NotifikasiLokalMobile.jadwalkan(notif);
    if (!sukses) {
      return buatHasilGagal('Gagal menjadwalkan notifikasi lokal.', KodeGalatNative.OPERASI_GAGAL);
    }
    return buatHasilSukses({ id: notif.id, terjadwal: true }, 'Notifikasi lokal simulator berhasil dijadwalkan.');
  }

  public async batalkanNotifikasi(id: string): Promise<HasilOperasiNative<any>> {
    const sukses = NotifikasiLokalMobile.batalkan(id);
    return buatHasilSukses({ id, dibatalkan: sukses }, sukses ? 'Notifikasi berhasil dibatalkan.' : 'Notifikasi tidak ditemukan.');
  }

  public async bacaSensor(sensor: 'akselerometer' | 'giroskop' | 'magnetometer' | 'kedekatan' | 'cahaya'): Promise<HasilOperasiNative<any>> {
    const stempel = Date.now();
    let data: any;

    switch (sensor) {
      case 'akselerometer':
        data = { x: 0.05, y: 9.81, z: 0.12, stempelWaktu: stempel, sumberData: 'SIMULASI_SENSOR' };
        break;
      case 'giroskop':
        data = { alpha: 0.0, beta: 0.01, gamma: -0.02, stempelWaktu: stempel, sumberData: 'SIMULASI_SENSOR' };
        break;
      case 'magnetometer':
        data = { x: 22.5, y: -5.1, z: 41.2, stempelWaktu: stempel, sumberData: 'SIMULASI_SENSOR' };
        break;
      case 'kedekatan':
        data = { jarakCm: 5.0, terhalang: false, stempelWaktu: stempel, sumberData: 'SIMULASI_SENSOR' };
        break;
      case 'cahaya':
        data = { lux: 350, stempelWaktu: stempel, sumberData: 'SIMULASI_SENSOR' };
        break;
      default:
        return buatHasilGagal(`Sensor '${sensor}' tidak dikenal.`, KodeGalatNative.ARGUMEN_TIDAK_VALID);
    }

    this.pengirimPeristiwa.kirim(`sensor.${sensor}`, data);
    return buatHasilSukses(data, `Pembacaan sensor ${sensor} berhasil.`);
  }

  public async pindaiBluetooth(opsi?: { durasiMs?: number }): Promise<HasilOperasiNative<any>> {
    const durasi = opsi?.durasiMs || 3000;
    const probe = PemeriksaHardwareHost.periksaHost();
    const perangkatDitemukan = [
      { id: 'AA:BB:CC:11:22:33', nama: 'Nusantara-BLE-Beacon', rssi: -65, terhubung: false },
      { id: '11:22:33:DD:EE:FF', nama: 'Wireless Headset Pro', rssi: -78, terhubung: false },
    ];
    this.pengirimPeristiwa.kirim('bluetooth.pindai_selesai', perangkatDitemukan);
    return buatHasilSukses({
      perangkat: perangkatDitemukan,
      durasiMs: durasi,
      adaptorHCIHost: probe.bluetoothHCI,
      sumberData: probe.bluetoothHCI.length > 0 ? 'HCI_HOST_TERDETEKSI' : 'SIMULASI_BLE',
    }, 'Pemindaian Bluetooth selesai.');
  }

  public async dapatkanStatusBaterai(): Promise<HasilOperasiNative<any>> {
    const batSim = StatusBateraiMobile.dapatkanStatus();
    const probe = PemeriksaHardwareHost.periksaHost();
    if (probe.baterai.terdeteksi && probe.baterai.level !== null) {
      return buatHasilSukses({
        ...batSim,
        level: probe.baterai.level,
        sedangMengisi: Boolean(probe.baterai.sedangMengisi),
        statusTeks: probe.baterai.statusTeks,
        sumberData: probe.baterai.sumber,
      }, 'Status baterai hardware berhasil diambil.');
    }
    return buatHasilSukses({
      ...batSim,
      sumberData: 'FALLBACK_SIMULASI_NO_SYSFS_BATTERY',
    }, 'Status baterai berhasil diambil.');
  }

  public async dapatkanStatusJaringan(): Promise<HasilOperasiNative<any>> {
    const netSim = StatusJaringanMobile.dapatkanStatus();
    const probe = PemeriksaHardwareHost.periksaHost();
    if (probe.jaringan.sumber === 'OS_NETWORK_INTERFACES') {
      return buatHasilSukses({
        ...netSim,
        terhubung: probe.jaringan.terhubung,
        tipe: probe.jaringan.tipeDominan,
        antarmukaAktif: probe.jaringan.antarmukaAktif,
        ipLokal: probe.jaringan.ipLokal,
        sumberData: 'OS_NETWORK_INTERFACES',
      }, 'Status jaringan OS nyata berhasil diambil.');
    }
    return buatHasilSukses({
      ...netSim,
      sumberData: 'FALLBACK_SIMULASI',
    }, 'Status jaringan berhasil diambil.');
  }

  public async putarAudio(urlAtauPath: string): Promise<HasilOperasiNative<any>> {
    return buatHasilSukses({ sumber: urlAtauPath, diputar: true }, `Audio '${urlAtauPath}' sedang diputar.`);
  }

  public async rekamAudio(opsi?: { durasiMaksDetik?: number }): Promise<HasilOperasiNative<any>> {
    const durasi = opsi?.durasiMaksDetik || 5;
    return buatHasilSukses({
      jalurBerkas: `file:///data/user/0/id.nusantara.app/cache/rekaman_${Date.now()}.m4a`,
      format: 'audio/m4a',
      durasiDetik: durasi,
    }, 'Perekaman audio berhasil diselesaikan.');
  }

  public async hentikanAudio(): Promise<HasilOperasiNative<any>> {
    return buatHasilSukses({ dihentikan: true }, 'Pemutaran/perekaman audio dihentikan.');
  }

  public async bacaBerkas(jalur: string): Promise<HasilOperasiNative<any>> {
    const valid = this.selesaikanJalurSandbox(jalur);
    if (!valid.ok) {
      return buatHasilGagal('Deteksi path traversal pada jalur berkas.', KodeGalatNative.PATH_TIDAK_AMAN);
    }
    const fs = muatModulNode<any>('fs');
    if (fs && apakahNodeRuntime()) {
      if (!fs.existsSync(valid.absolut)) {
        return buatHasilGagal(`Berkas sandbox '${jalur}' tidak ditemukan.`, KodeGalatNative.OPERASI_GAGAL);
      }
      const konten = String(fs.readFileSync(valid.absolut, 'utf-8'));
      const stat = fs.statSync(valid.absolut);
      return buatHasilSukses({ jalur, konten, ukuran: stat.size, sumberData: 'DISK_SANDBOX_REAL' }, 'Berkas berhasil dibaca.');
    }
    const kontenMem = this.berkasMemoriBrowser.get(jalur);
    if (kontenMem === undefined) {
      return buatHasilGagal(`Berkas '${jalur}' tidak ditemukan.`, KodeGalatNative.OPERASI_GAGAL);
    }
    return buatHasilSukses({ jalur, konten: kontenMem, ukuran: kontenMem.length, sumberData: 'BROWSER_MEMORY_SANDBOX' }, 'Berkas berhasil dibaca.');
  }

  public async tulisBerkas(jalur: string, konten: string): Promise<HasilOperasiNative<any>> {
    const valid = this.selesaikanJalurSandbox(jalur);
    if (!valid.ok) {
      return buatHasilGagal('Deteksi path traversal pada jalur berkas.', KodeGalatNative.PATH_TIDAK_AMAN);
    }
    const fs = muatModulNode<any>('fs');
    const path = muatModulNode<any>('path');
    if (fs && path && apakahNodeRuntime()) {
      fs.mkdirSync(path.dirname(valid.absolut), { recursive: true });
      fs.writeFileSync(valid.absolut, konten, 'utf-8');
      const byteTertulis = Buffer.byteLength(konten, 'utf-8');
      return buatHasilSukses({ jalur, byteTertulis, jalurAbsolut: valid.absolut, sumberData: 'DISK_SANDBOX_REAL' }, 'Berkas berhasil ditulis.');
    }
    this.berkasMemoriBrowser.set(jalur, konten);
    return buatHasilSukses({ jalur, byteTertulis: konten.length, sumberData: 'BROWSER_MEMORY_SANDBOX' }, 'Berkas berhasil ditulis.');
  }

  public async hapusBerkas(jalur: string): Promise<HasilOperasiNative<any>> {
    const valid = this.selesaikanJalurSandbox(jalur);
    if (!valid.ok) {
      return buatHasilGagal('Deteksi path traversal pada jalur berkas.', KodeGalatNative.PATH_TIDAK_AMAN);
    }
    const fs = muatModulNode<any>('fs');
    if (fs && apakahNodeRuntime()) {
      const ada = fs.existsSync(valid.absolut);
      if (ada) fs.unlinkSync(valid.absolut);
      return buatHasilSukses({ jalur, terhapus: ada, sumberData: 'DISK_SANDBOX_REAL' }, 'Berkas berhasil dihapus.');
    }
    const terhapus = this.berkasMemoriBrowser.delete(jalur);
    return buatHasilSukses({ jalur, terhapus, sumberData: 'BROWSER_MEMORY_SANDBOX' }, 'Berkas berhasil dihapus.');
  }

  public async salinTeks(teks: string): Promise<HasilOperasiNative<any>> {
    await PapanKlipMobile.salin(teks);
    return buatHasilSukses({ teks, tersalin: true }, 'Teks berhasil disalin ke papan klip.');
  }

  public async tempelTeks(): Promise<HasilOperasiNative<any>> {
    const teks = await PapanKlipMobile.tempel();
    return buatHasilSukses({ teks }, 'Teks berhasil diambil dari papan klip.');
  }

  public async bagikan(opsi: { judul?: string; teks?: string; url?: string; jalurBerkas?: string }): Promise<HasilOperasiNative<any>> {
    const sukses = BerbagiMobile.bagikan(opsi);
    return buatHasilSukses({ sukses, data: opsi }, 'Dialog berbagi sistem berhasil dibuka.');
  }

  public async simpanAman(kunci: string, nilai: string): Promise<HasilOperasiNative<any>> {
    const sukses = PenyimpananAmanMobile.simpan(kunci, nilai);
    return buatHasilSukses({ kunci, tersimpan: sukses }, 'Nilai berhasil disimpan dengan enkripsi AES-256.');
  }

  public async ambilAman(kunci: string): Promise<HasilOperasiNative<any>> {
    const nilai = PenyimpananAmanMobile.ambil(kunci);
    return buatHasilSukses({ kunci, nilai, ditemukan: nilai !== null }, nilai !== null ? 'Nilai aman ditemukan.' : 'Kunci tidak ditemukan.');
  }

  public async hapusAman(kunci: string): Promise<HasilOperasiNative<any>> {
    const sukses = PenyimpananAmanMobile.hapus(kunci);
    return buatHasilSukses({ kunci, terhapus: sukses }, 'Nilai aman berhasil dihapus.');
  }

  public async getar(durasiMs: number = 200): Promise<HasilOperasiNative<any>> {
    GetaranMobile.getar(durasiMs);
    return buatHasilSukses({ durasiMs }, 'Getaran perangkat dipicu.');
  }

  public async haptik(pola: string = 'sukses'): Promise<HasilOperasiNative<any>> {
    GetaranMobile.haptik(pola as any);
    return buatHasilSukses({ pola }, 'Umpan balik haptik dipicu.');
  }
}
