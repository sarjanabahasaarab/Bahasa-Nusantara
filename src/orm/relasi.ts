/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Relasi Antarmodel: One-to-One, One-to-Many, Many-to-One, Many-to-Many.
 */

import { DefinisiRelasi, KelasModel, InstansiModel } from './types';
import { GalatBasisdata, JenisGalatBasisdata } from '../database/jenis';

export function memilikiSatu(
  nama: string,
  modelTarget: () => KelasModel<any>,
  foreignKey: string,
  localKey: string = 'id'
): DefinisiRelasi {
  return {
    nama,
    jenis: 'memilikiSatu',
    modelTarget,
    foreignKey,
    localKey,
  };
}

export function memilikiBanyak(
  nama: string,
  modelTarget: () => KelasModel<any>,
  foreignKey: string,
  localKey: string = 'id'
): DefinisiRelasi {
  return {
    nama,
    jenis: 'memilikiBanyak',
    modelTarget,
    foreignKey,
    localKey,
  };
}

export function milikDari(
  nama: string,
  modelTarget: () => KelasModel<any>,
  foreignKey: string,
  localKey: string = 'id'
): DefinisiRelasi {
  return {
    nama,
    jenis: 'milikDari',
    modelTarget,
    foreignKey,
    localKey,
  };
}

export function banyakKeBanyak(
  nama: string,
  modelTarget: () => KelasModel<any>,
  tabelPivot: string,
  pivotForeignKey: string,
  pivotOtherKey: string
): DefinisiRelasi {
  return {
    nama,
    jenis: 'banyakKeBanyak',
    modelTarget,
    foreignKey: pivotForeignKey,
    tabelPivot,
    pivotForeignKey,
    pivotOtherKey,
  };
}

/**
 * Memuat relasi data secara efisien untuk sebuah entitas model.
 */
export function muatRelasiUntukInstansi(
  instansi: InstansiModel<any>,
  relasi: DefinisiRelasi
): any {
  const TargetModel = relasi.modelTarget();
  if (!TargetModel) {
    throw new GalatBasisdata(
      JenisGalatBasisdata.PARAMETER_TIDAK_VALID,
      `Target model untuk relasi '${relasi.nama}' tidak terdefinisi.`
    );
  }

  const localKey = relasi.localKey || 'id';

  switch (relasi.jenis) {
    case 'memilikiSatu': {
      const idLokal = instansi.dapatkan(localKey);
      if (idLokal === undefined || idLokal === null) return null;
      return TargetModel.temukanBerdasarkan(relasi.foreignKey, idLokal);
    }

    case 'memilikiBanyak': {
      const idLokal = instansi.dapatkan(localKey);
      if (idLokal === undefined || idLokal === null) return [];
      const baris = TargetModel.kueri().where(relasi.foreignKey, idLokal).get();
      return baris.map((b: any) => TargetModel.hidupkan(b));
    }

    case 'milikDari': {
      const idAsing = instansi.dapatkan(relasi.foreignKey);
      if (idAsing === undefined || idAsing === null) return null;
      return TargetModel.temukan(idAsing);
    }

    case 'banyakKeBanyak': {
      const idLokal = instansi.dapatkan(localKey);
      if (idLokal === undefined || idLokal === null) return [];

      const tabelPivot = relasi.tabelPivot!;
      const pivotFk = relasi.pivotForeignKey!;
      const pivotOther = relasi.pivotOtherKey!;
      const adaptor = TargetModel.dapatkanAdaptor();

      // Query JOIN melalui tabel pivot
      const sql = `SELECT t.* FROM "${TargetModel.namaTabel}" t INNER JOIN "${tabelPivot}" p ON t."id" = p."${pivotOther}" WHERE p."${pivotFk}" = ?`;
      const rows = adaptor.ambilSemua(sql, [idLokal]);
      return rows.map((r: any) => TargetModel.hidupkan(r));
    }
  }
}
