/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 38
 * Pengelola Kemampuan & Fitur Perangkat (Device Capability Manager)
 */

import { InfoPerangkatMobile } from '../../device/info';
import { PemeriksaHardwareHost } from './hardware_probe';

export interface KemampuanPerangkat {
  kamera: {
    tersedia: boolean;
    depan: boolean;
    belakang: boolean;
    flash: boolean;
    v4l2Host?: string[];
  };
  sensor: {
    akselerometer: boolean;
    giroskop: boolean;
    magnetometer: boolean;
    kedekatan: boolean;
    cahaya: boolean;
  };
  konektivitas: {
    wifi: boolean;
    seluler: boolean;
    bluetooth: boolean;
    bluetoothLE: boolean;
    gps: boolean;
    bluetoothHCIHost?: string[];
    jaringanOSTerhubung?: boolean;
  };
  audio: {
    perekam: boolean;
    pemutar: boolean;
  };
  keamanan: {
    penyimpananAman: boolean;
    biometrik: boolean;
  };
  haptik: boolean;
  papanKlip: boolean;
  berbagi: boolean;
  sistem: {
    platform: 'android' | 'ios' | 'desktop' | 'simulator';
    versiOS: string;
    model: string;
    arsitektur: string;
    apakahSimulator: boolean;
    modeKontrakSimulasi: boolean;
  };
  probeHost?: {
    nodeRuntime: boolean;
    bateraiSysfsTerdeteksi: boolean;
    kameraV4L2Terdeteksi: boolean;
    bluetoothHCITerdeteksi: boolean;
    adbTerhubung: boolean;
  };
}

export class PengelolaKemampuanPerangkat {
  private static instance: PengelolaKemampuanPerangkat;
  private cacheKemampuan?: KemampuanPerangkat;

  private constructor() {}

  public static dapatkanInstance(): PengelolaKemampuanPerangkat {
    if (!PengelolaKemampuanPerangkat.instance) {
      PengelolaKemampuanPerangkat.instance = new PengelolaKemampuanPerangkat();
    }
    return PengelolaKemampuanPerangkat.instance;
  }

  public dapatkanKemampuan(paksaSegarkan: boolean = false): KemampuanPerangkat {
    if (this.cacheKemampuan && !paksaSegarkan) {
      return this.cacheKemampuan;
    }

    const info = InfoPerangkatMobile.dapatkanInfo();
    const isSim = InfoPerangkatMobile.apakahSimulator();
    const plat = info.platform as 'android' | 'ios' | 'desktop' | 'simulator';
    const probe = PemeriksaHardwareHost.periksaHost();
    const adbPerangkat = probe.perangkatADB.find((p) => p.status === 'device');
    const adbAktif = Boolean(adbPerangkat);
    const adbEmulator = Boolean(adbPerangkat && /emulator|sdk_gphone|generic|goldfish|ranchu/i.test(`${adbPerangkat.model || ''} ${adbPerangkat.serial}`));
    const perangkatAndroidFisikTerdeteksi = Boolean(adbAktif && !adbEmulator);
    const wifiTerdeteksi = probe.jaringan.terhubung && probe.jaringan.tipeDominan === 'wifi';
    const kameraHostTerdeteksi = probe.kameraV4L2.length > 0;

    this.cacheKemampuan = {
      kamera: {
        tersedia: kameraHostTerdeteksi || perangkatAndroidFisikTerdeteksi,
        depan: false,
        belakang: kameraHostTerdeteksi || perangkatAndroidFisikTerdeteksi,
        flash: false,
        v4l2Host: probe.kameraV4L2,
      },
      // Sensor tidak boleh diasumsikan tersedia hanya karena OS mendukung API.
      // Perlu enumerasi sensor dari native bridge/perangkat sebelum dinyatakan ada.
      sensor: {
        akselerometer: false,
        giroskop: false,
        magnetometer: false,
        kedekatan: false,
        cahaya: false,
      },
      konektivitas: {
        wifi: wifiTerdeteksi,
        seluler: false,
        bluetooth: probe.bluetoothHCI.length > 0,
        bluetoothLE: false,
        gps: false,
        bluetoothHCIHost: probe.bluetoothHCI,
        jaringanOSTerhubung: probe.jaringan.terhubung,
      },
      audio: {
        perekam: false,
        pemutar: false,
      },
      keamanan: {
        penyimpananAman: false,
        biometrik: false,
      },
      haptik: false,
      papanKlip: false,
      berbagi: false,
      sistem: {
        platform: plat,
        versiOS: info.versiOS,
        model: info.model,
        arsitektur: typeof process !== 'undefined' ? process.arch : 'arm64',
        apakahSimulator: isSim,
        modeKontrakSimulasi: isSim || adbEmulator,
      },
      probeHost: {
        nodeRuntime: probe.nodeRuntime,
        bateraiSysfsTerdeteksi: probe.baterai.terdeteksi,
        kameraV4L2Terdeteksi: probe.kameraV4L2.length > 0,
        bluetoothHCITerdeteksi: probe.bluetoothHCI.length > 0,
        adbTerhubung: adbAktif,
      },
    };

    return this.cacheKemampuan;
  }

  public apakahMendukung(fitur: string): boolean {
    const k = this.dapatkanKemampuan();
    const bagian = fitur.toLowerCase().split('.');

    let obj: any = k;
    for (const b of bagian) {
      if (obj && typeof obj === 'object' && b in obj) {
        obj = obj[b];
      } else {
        return false;
      }
    }
    return Boolean(obj);
  }
}
