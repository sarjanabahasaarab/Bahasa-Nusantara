/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "../../src/runtime/os/arch/arm64/elf64-loader.h"

#define IMAGE_SIZE 0x3000u
#define PHOFF 64u
#define PH_SIZE 56u
#define PT_LOAD 1u
#define PT_DYNAMIC 2u
#define PF_X 1u
#define PF_W 2u
#define PF_R 4u

static uint8_t fixture[IMAGE_SIZE];
static unsigned case_number;

static void put16(size_t o, uint16_t v) { fixture[o]=(uint8_t)v; fixture[o+1]=(uint8_t)(v>>8); }
static void put32(size_t o, uint32_t v) {
    fixture[o]=(uint8_t)v; fixture[o+1]=(uint8_t)(v>>8);
    fixture[o+2]=(uint8_t)(v>>16); fixture[o+3]=(uint8_t)(v>>24);
}
static void put64(size_t o, uint64_t v) { put32(o,(uint32_t)v); put32(o+4,(uint32_t)(v>>32)); }
static size_t ph(size_t index) { return PHOFF + index * PH_SIZE; }
static void set_ph(size_t i,uint32_t type,uint32_t flags,uint64_t off,uint64_t va,
                   uint64_t filesz,uint64_t memsz,uint64_t align) {
    size_t p=ph(i); put32(p,type); put32(p+4,flags); put64(p+8,off);
    put64(p+16,va); put64(p+24,va); put64(p+32,filesz);
    put64(p+40,memsz); put64(p+48,align);
}
static void valid_fixture(void) {
    memset(fixture,0,sizeof(fixture));
    fixture[0]=0x7f; fixture[1]='E'; fixture[2]='L'; fixture[3]='F';
    fixture[4]=2; fixture[5]=1; fixture[6]=1;
    put16(16,2); put16(18,183); put32(20,1);
    put64(24,UINT64_C(0x400100)); put64(32,PHOFF);
    put16(52,64); put16(54,PH_SIZE); put16(56,2);
    set_ph(0,PT_LOAD,PF_R|PF_X,0x1000,0x400000,0x100,0x1000,0x1000);
    set_ph(1,PT_LOAD,PF_R|PF_W,0x2000,0x402000,0x80,0x1000,0x1000);
}
static void expect(nusantara_arm64_elf64_status_t wanted) {
    nusantara_arm64_elf64_image_t image;
    nusantara_arm64_elf64_status_t actual =
        nusantara_arm64_elf64_validate(fixture,sizeof(fixture),&image);
    ++case_number;
    if (actual != wanted) {
        fprintf(stderr,"Phase114 case %u: expected status %u, got %u\n",
                case_number,(unsigned)wanted,(unsigned)actual);
        assert(actual == wanted);
    }
}
int main(void) {
    nusantara_arm64_elf64_image_t image;
    valid_fixture();
    assert(nusantara_arm64_elf64_validate(fixture,sizeof(fixture),&image)==NUSANTARA_ARM64_ELF64_OK);
    assert(image.segment_count==2u && image.entry_point==UINT64_C(0x400100));
    assert(image.total_memory_size==0x2000u);
    puts("PASS: valid static AArch64 ELF64 and load plan");

    expect(NUSANTARA_ARM64_ELF64_OK);
    fixture[4]=1; expect(NUSANTARA_ARM64_ELF64_UNSUPPORTED_FORMAT);
    valid_fixture(); put16(18,62); expect(NUSANTARA_ARM64_ELF64_UNSUPPORTED_FORMAT);
    valid_fixture(); put64(ph(0)+32,UINT64_C(0xffffffffffffffff)); expect(NUSANTARA_ARM64_ELF64_INVALID_SEGMENT);
    valid_fixture(); put64(ph(0)+40,UINT64_C(0xffffffffffffffff)); expect(NUSANTARA_ARM64_ELF64_INVALID_SEGMENT);
    valid_fixture(); put32(ph(0)+4,PF_R|PF_W|PF_X); expect(NUSANTARA_ARM64_ELF64_INVALID_SEGMENT);
    valid_fixture(); put64(ph(0)+48,3); expect(NUSANTARA_ARM64_ELF64_INVALID_SEGMENT);
    valid_fixture(); put64(ph(1)+16,0x400800); expect(NUSANTARA_ARM64_ELF64_OVERLAP);
    valid_fixture(); put64(24,0x402100); expect(NUSANTARA_ARM64_ELF64_ENTRY_NOT_EXECUTABLE);
    valid_fixture(); put64(ph(0)+8,IMAGE_SIZE-8); put64(ph(0)+32,0x100); expect(NUSANTARA_ARM64_ELF64_INVALID_SEGMENT);
    valid_fixture(); set_ph(0,PT_DYNAMIC,PF_R,0x1000,0x400000,0x10,0x10,1); expect(NUSANTARA_ARM64_ELF64_UNSUPPORTED_DYNAMIC);
    valid_fixture(); put16(56,0xffff); expect(NUSANTARA_ARM64_ELF64_TRUNCATED);
    assert(nusantara_arm64_elf64_validate(fixture,32,&image)==NUSANTARA_ARM64_ELF64_TRUNCATED);
    assert(nusantara_arm64_elf64_validate(NULL,sizeof(fixture),&image)==NUSANTARA_ARM64_ELF64_INVALID_ARGUMENT);
    puts("PASS: malformed header, bounds, W^X, alignment, overlap, entry, dynamic and truncation cases");
    puts("NUSANTARA_PHASE114_ELF64_VALIDATION_PASS");
    return 0;
}
