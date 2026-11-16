/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLI Entrypoint untuk Validasi Strict 18 Sentinel QEMU (Phase 23.10)
 */

import * as fs from 'fs';
import * as path from 'path';
import { QEMUSentinelValidator } from '../src/runtime/os/tools/qemu-sentinel-validator';

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

const serialPath = parseArg('--serial') || 'artifacts/phase50/serial.log';
const debugPath = parseArg('--debug-log') || 'artifacts/phase50/qemu-debug.log';
const artifactsDir = parseArg('--artifacts-dir') || path.dirname(serialPath);
const jsonOut = parseArg('--json-out') || path.join(artifactsDir, 'qemu-sentinel-report.json');
const exitCodeRaw = parseArg('--exit-code');
const parsedExit = exitCodeRaw !== undefined ? Number(exitCodeRaw) : null;

const serialLog = fs.existsSync(serialPath) ? fs.readFileSync(serialPath, 'utf-8') : '';
const debugLog = fs.existsSync(debugPath) ? fs.readFileSync(debugPath, 'utf-8') : undefined;

const report = QEMUSentinelValidator.validate({
  serialLog,
  debugLog,
  exitCode: Number.isFinite(parsedExit) ? parsedExit : null,
  expectedExitCodes: [1],
  artifactsDir,
  requiredArtifacts: ['kernel.elf', 'user-test.elf', 'user-fault-test.elf', 'serial.log'],
});

fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2) + '\n', 'utf-8');

console.log(QEMUSentinelValidator.formatHumanSummary(report));
console.log(`Laporan JSON ditulis ke: ${jsonOut}`);

if (report.overallStatus !== 'PASS') {
  process.exit(1);
}
process.exit(0);
