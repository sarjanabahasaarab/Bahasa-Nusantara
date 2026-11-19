/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NUSANTARA Phase 38 — Android adapter.
 *
 * Host-side TypeScript does not itself invoke Android framework APIs. Until a
 * verified JNI/Capacitor/native bridge is attached, hardware operations fail closed
 * instead of returning simulator URIs, invented sensor values, or fake keystore claims.
 */
import { AdaptorPlatformNative } from './platform_adapter';
import { AdaptorSimulatorMobile } from './simulator_adapter';
import { HasilOperasiNative, buatHasilGagal, buatHasilSukses, KodeGalatNative } from '../core/result';
import { PemeriksaHardwareHost } from '../core/hardware_probe';

export class AdaptorAndroidMobile extends AdaptorSimulatorMobile implements AdaptorPlatformNative {
  public override readonly namaPlatform: 'android' | 'ios' | 'simulator' = 'android';

  private belumTerhubung(fitur: string): HasilOperasiNative<any> {
    return buatHasilGagal(
      `API Android '${fitur}' belum terhubung ke implementasi Android Framework native; operasi tidak dijalankan dan tidak ada data simulasi yang dikembalikan.`,
      KodeGalatNative.TIDAK_DIDUKUNG,
      'tidak_didukung',
      { platform: 'android', fitur, nativeBridgeRequired: true }
    );
  }

  public override async dapatkanInfoPerangkat(): Promise<HasilOperasiNative<any>> {
    const probe = PemeriksaHardwareHost.periksaHost();
    const adbAktif = probe.perangkatADB.find((p) => p.status === 'device');
    if (!adbAktif || !Number.isFinite(adbAktif.levelAPI)) {
      return buatHasilGagal(
        'Tidak ada perangkat Android/Emulator ADB yang benar-benar terhubung. Informasi perangkat tidak ditebak.',
        KodeGalatNative.PERANGKAT_TIDAK_TERSEDIA,
        'perangkat_tidak_tersedia',
        { platform: 'android', perangkatADB: probe.perangkatADB.length }
      );
    }
    const emulator = /emulator|sdk_gphone|generic|goldfish|ranchu/i.test(`${adbAktif.model || ''} ${adbAktif.serial}`);
    return buatHasilSukses({
      platform: 'android',
      levelAPI: adbAktif.levelAPI,
      model: adbAktif.model,
      adbSerial: adbAktif.serial,
      perangkatFisikTerhubung: !emulator,
      apakahSimulator: emulator,
      sumberData: emulator ? 'ADB_EMULATOR' : 'ADB_DEVICE_REAL',
    }, emulator ? 'Android Emulator terdeteksi melalui ADB; bukan perangkat fisik.' : 'Perangkat Android terdeteksi melalui ADB.');
  }

  public override async ambilFoto(_opsi?: { kamera?: 'depan' | 'belakang'; flash?: boolean; kualitas?: number }): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('kamera.ambil'); }
  public override async pilihMedia(_opsi?: { tipe?: 'foto' | 'video' | 'semua'; maksPilihan?: number }): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('galeri.pilih'); }
  public override async dapatkanLokasi(_opsi?: { akurasiTinggi?: boolean; timeoutMs?: number }): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('lokasi.ambil'); }
  public override async jadwalkanNotifikasi(_notif: { id: string; judul: string; pesan: string; tundaDetik?: number }): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('notifikasi.jadwal'); }
  public override async batalkanNotifikasi(_id: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('notifikasi.batal'); }
  public override async bacaSensor(_sensor: 'akselerometer' | 'giroskop' | 'magnetometer' | 'kedekatan' | 'cahaya'): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('sensor.baca'); }
  public override async pindaiBluetooth(_opsi?: { durasiMs?: number }): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('bluetooth.pindai'); }
  public override async dapatkanStatusBaterai(): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('baterai.info'); }
  public override async dapatkanStatusJaringan(): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('jaringan.status'); }
  public override async putarAudio(_urlAtauPath: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('audio.putar'); }
  public override async rekamAudio(_opsi?: { durasiMaksDetik?: number }): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('audio.rekam'); }
  public override async hentikanAudio(): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('audio.hentikan'); }
  public override async bacaBerkas(_jalur: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('berkas.baca'); }
  public override async tulisBerkas(_jalur: string, _konten: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('berkas.tulis'); }
  public override async hapusBerkas(_jalur: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('berkas.hapus'); }
  public override async salinTeks(_teks: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('clipboard.salin'); }
  public override async tempelTeks(): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('clipboard.tempel'); }
  public override async bagikan(_opsi: { judul?: string; teks?: string; url?: string; jalurBerkas?: string }): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('share.bagikan'); }
  public override async simpanAman(_kunci: string, _nilai: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('keystore.simpan'); }
  public override async ambilAman(_kunci: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('keystore.ambil'); }
  public override async hapusAman(_kunci: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('keystore.hapus'); }
  public override async getar(_durasiMs?: number): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('haptik.getar'); }
  public override async haptik(_pola?: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('haptik.pola'); }
}
