/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NUSANTARA Phase 38 — iOS adapter.
 *
 * Xcode availability or a Simulator runtime is not an attached native application
 * bridge. Device operations remain explicitly unsupported until the Swift bridge
 * is implemented and connected to the runtime.
 */
import { AdaptorPlatformNative } from './platform_adapter';
import { AdaptorSimulatorMobile } from './simulator_adapter';
import { HasilOperasiNative, buatHasilGagal, KodeGalatNative } from '../core/result';

export class AdaptorIOSMobile extends AdaptorSimulatorMobile implements AdaptorPlatformNative {
  public override readonly namaPlatform: 'android' | 'ios' | 'simulator' = 'ios';

  private belumTerhubung(fitur: string): HasilOperasiNative<any> {
    return buatHasilGagal(
      `API iOS '${fitur}' belum terhubung ke implementasi UIKit/AVFoundation/CoreLocation native; operasi tidak dijalankan dan tidak ada data simulasi yang dikembalikan.`,
      KodeGalatNative.TIDAK_DIDUKUNG,
      'tidak_didukung',
      { platform: 'ios', fitur, nativeBridgeRequired: true }
    );
  }

  public override async dapatkanInfoPerangkat(): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('perangkat.info'); }
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
  public override async simpanAman(_kunci: string, _nilai: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('keychain.simpan'); }
  public override async ambilAman(_kunci: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('keychain.ambil'); }
  public override async hapusAman(_kunci: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('keychain.hapus'); }
  public override async getar(_durasiMs?: number): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('haptik.getar'); }
  public override async haptik(_pola?: string): Promise<HasilOperasiNative<any>> { return this.belumTerhubung('haptik.pola'); }
}
