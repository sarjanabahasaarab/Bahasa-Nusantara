/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_FREESTANDING_STRING_H
#define NUSANTARA_FREESTANDING_STRING_H
#include <stddef.h>
void *memset(void *destination, int value, size_t length);
void *memcpy(void *destination, const void *source, size_t length);
#endif
