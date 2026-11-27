/* SPDX-License-Identifier: Apache-2.0 */
#include "elf64-loader.h"

#define ELF_HEADER_SIZE 64u
#define ELF_PROGRAM_HEADER_SIZE 56u
#define ELF_CLASS_64 2u
#define ELF_DATA_LSB 1u
#define ELF_VERSION_CURRENT 1u
#define ELF_ET_EXEC 2u
#define ELF_EM_AARCH64 183u
#define ELF_PT_LOAD 1u
#define ELF_PT_DYNAMIC 2u
#define ELF_PT_INTERP 3u
#define ELF_PF_X 1u
#define ELF_PF_W 2u
#define ELF_PF_R 4u
#define ELF_KNOWN_FLAGS (ELF_PF_R | ELF_PF_W | ELF_PF_X)

static uint16_t read_u16(const uint8_t *p)
{
    return (uint16_t)((uint16_t)p[0] | ((uint16_t)p[1] << 8));
}

static uint32_t read_u32(const uint8_t *p)
{
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) |
           ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static uint64_t read_u64(const uint8_t *p)
{
    return (uint64_t)read_u32(p) | ((uint64_t)read_u32(p + 4) << 32);
}

static int range_inside(uint64_t offset, uint64_t size, size_t length)
{
    return offset <= (uint64_t)length &&
           size <= (uint64_t)length - offset;
}

static int power_of_two(uint64_t value)
{
    return value != 0u && (value & (value - 1u)) == 0u;
}

static int ranges_overlap(uint64_t a_start, uint64_t a_size,
                          uint64_t b_start, uint64_t b_size)
{
    return a_start < b_start + b_size && b_start < a_start + a_size;
}

nusantara_arm64_elf64_status_t nusantara_arm64_elf64_validate(
    const uint8_t *bytes, size_t length, nusantara_arm64_elf64_image_t *image)
{
    uint64_t entry, phoff;
    uint16_t ehsize, phentsize, phnum;
    size_t i, j;
    int entry_is_executable = 0;

    if (bytes == 0 || image == 0)
        return NUSANTARA_ARM64_ELF64_INVALID_ARGUMENT;
    image->entry_point = 0u;
    image->total_memory_size = 0u;
    image->segment_count = 0u;

    if (length < ELF_HEADER_SIZE)
        return NUSANTARA_ARM64_ELF64_TRUNCATED;
    if (bytes[0] != 0x7fu || bytes[1] != 'E' ||
        bytes[2] != 'L' || bytes[3] != 'F')
        return NUSANTARA_ARM64_ELF64_BAD_HEADER;
    if (bytes[4] != ELF_CLASS_64 || bytes[5] != ELF_DATA_LSB ||
        bytes[6] != ELF_VERSION_CURRENT)
        return NUSANTARA_ARM64_ELF64_UNSUPPORTED_FORMAT;
    if (read_u16(bytes + 16) != ELF_ET_EXEC ||
        read_u16(bytes + 18) != ELF_EM_AARCH64 ||
        read_u32(bytes + 20) != ELF_VERSION_CURRENT)
        return NUSANTARA_ARM64_ELF64_UNSUPPORTED_FORMAT;

    ehsize = read_u16(bytes + 52);
    phentsize = read_u16(bytes + 54);
    phnum = read_u16(bytes + 56);
    phoff = read_u64(bytes + 32);
    entry = read_u64(bytes + 24);
    if (ehsize != ELF_HEADER_SIZE || phentsize != ELF_PROGRAM_HEADER_SIZE ||
        phnum == 0u)
        return NUSANTARA_ARM64_ELF64_BAD_HEADER;
    if (!range_inside(phoff, (uint64_t)phnum * phentsize, length))
        return NUSANTARA_ARM64_ELF64_TRUNCATED;

    for (i = 0u; i < phnum; ++i) {
        const uint8_t *ph = bytes + (size_t)phoff + i * phentsize;
        uint32_t type = read_u32(ph);
        uint32_t flags = read_u32(ph + 4);
        uint64_t offset = read_u64(ph + 8);
        uint64_t vaddr = read_u64(ph + 16);
        uint64_t filesz = read_u64(ph + 32);
        uint64_t memsz = read_u64(ph + 40);
        uint64_t align = read_u64(ph + 48);
        uint64_t end;

        if (type == ELF_PT_DYNAMIC || type == ELF_PT_INTERP)
            return NUSANTARA_ARM64_ELF64_UNSUPPORTED_DYNAMIC;
        if (type != ELF_PT_LOAD)
            continue;
        if (image->segment_count >= NUSANTARA_ARM64_ELF64_MAX_SEGMENTS)
            return NUSANTARA_ARM64_ELF64_TOO_MANY_SEGMENTS;
        if (memsz == 0u || filesz > memsz ||
            !range_inside(offset, filesz, length) ||
            (flags & ~ELF_KNOWN_FLAGS) != 0u ||
            ((flags & ELF_PF_W) != 0u && (flags & ELF_PF_X) != 0u))
            return NUSANTARA_ARM64_ELF64_INVALID_SEGMENT;
        if (vaddr < NUSANTARA_ARM64_ELF64_USER_MIN ||
            vaddr >= NUSANTARA_ARM64_ELF64_USER_MAX ||
            memsz > NUSANTARA_ARM64_ELF64_USER_MAX - vaddr)
            return NUSANTARA_ARM64_ELF64_INVALID_SEGMENT;
        end = vaddr + memsz;
        if (align > 1u && (!power_of_two(align) ||
            (vaddr & (align - 1u)) != (offset & (align - 1u))))
            return NUSANTARA_ARM64_ELF64_INVALID_SEGMENT;

        for (j = 0u; j < image->segment_count; ++j) {
            const nusantara_arm64_elf64_segment_t *prior = &image->segments[j];
            if (ranges_overlap(vaddr, memsz, prior->virtual_address,
                               prior->memory_size))
                return NUSANTARA_ARM64_ELF64_OVERLAP;
        }

        image->segments[image->segment_count].file_offset = offset;
        image->segments[image->segment_count].virtual_address = vaddr;
        image->segments[image->segment_count].file_size = filesz;
        image->segments[image->segment_count].memory_size = memsz;
        image->segments[image->segment_count].alignment = align;
        image->segments[image->segment_count].flags = flags;
        ++image->segment_count;

        if (memsz > UINT64_MAX - image->total_memory_size)
            return NUSANTARA_ARM64_ELF64_INVALID_SEGMENT;
        image->total_memory_size += memsz;
        if ((flags & ELF_PF_X) != 0u && entry >= vaddr && entry < end)
            entry_is_executable = 1;
    }

    if (image->segment_count == 0u)
        return NUSANTARA_ARM64_ELF64_INVALID_SEGMENT;
    if (!entry_is_executable)
        return NUSANTARA_ARM64_ELF64_ENTRY_NOT_EXECUTABLE;
    image->entry_point = entry;
    return NUSANTARA_ARM64_ELF64_OK;
}
