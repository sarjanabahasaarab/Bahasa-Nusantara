/* SPDX-License-Identifier: Apache-2.0
 * Phase 91 assembler smoke object only. Phase 92 supplies the real Image header,
 * exception-level transition, stack setup, UART output and QEMU boot proof.
 */
.section .text.boot, "ax"
.align  2
.global nusantara_arm64_boot_smoke
.type nusantara_arm64_boot_smoke, %function
nusantara_arm64_boot_smoke:
1:
    wfe
    b       1b
.size nusantara_arm64_boot_smoke, . - nusantara_arm64_boot_smoke
