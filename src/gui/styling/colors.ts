/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Palet Warna Resmi & Skema Warna GUI
 */

import { SkemaWarnaGUI } from '../types';

export const SKEMA_TEMA_TERANG: SkemaWarnaGUI = {
  nama: 'terang',
  latarBelakang: '#f8fafc',
  latarKomponen: '#ffffff',
  latarKomponenHover: '#f1f5f9',
  latarKomponenAktif: '#e2e8f0',
  teksUtama: '#0f172a',
  teksSekunder: '#475569',
  teksMuted: '#94a3b8',
  primer: '#0284c7', // Sky Blue
  primerHover: '#0369a1',
  primerTeks: '#ffffff',
  sekunder: '#64748b',
  aksen: '#06b6d4',
  border: '#cbd5e1',
  borderFokus: '#0284c7',
  sukses: '#16a34a',
  peringatan: '#d97706',
  bahaya: '#dc2626',
  indikatorFokus: '#38bdf8',
};

export const SKEMA_TEMA_GELAP: SkemaWarnaGUI = {
  nama: 'gelap',
  latarBelakang: '#0f172a',
  latarKomponen: '#1e293b',
  latarKomponenHover: '#334155',
  latarKomponenAktif: '#475569',
  teksUtama: '#f8fafc',
  teksSekunder: '#cbd5e1',
  teksMuted: '#64748b',
  primer: '#38bdf8', // Lighter Sky Blue for dark background
  primerHover: '#0284c7',
  primerTeks: '#0f172a',
  sekunder: '#94a3b8',
  aksen: '#22d3ee',
  border: '#334155',
  borderFokus: '#38bdf8',
  sukses: '#22c55e',
  peringatan: '#f59e0b',
  bahaya: '#ef4444',
  indikatorFokus: '#38bdf8',
};

export const SKEMA_TEMA_KONTRAS_TINGGI: SkemaWarnaGUI = {
  nama: 'kontras_tinggi',
  latarBelakang: '#000000',
  latarKomponen: '#000000',
  latarKomponenHover: '#1a1a1a',
  latarKomponenAktif: '#333333',
  teksUtama: '#ffffff',
  teksSekunder: '#ffff00',
  teksMuted: '#00ffff',
  primer: '#ffff00', // Yellow
  primerHover: '#ffffff',
  primerTeks: '#000000',
  sekunder: '#ffffff',
  aksen: '#00ffff',
  border: '#ffffff',
  borderFokus: '#ffff00',
  sukses: '#00ff00',
  peringatan: '#ffaa00',
  bahaya: '#ff0000',
  indikatorFokus: '#ffff00',
};
