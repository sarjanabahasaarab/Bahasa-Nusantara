/* SPDX-License-Identifier: Apache-2.0 */
#include "string.h"

void *memset(void *destination, int value, size_t length)
{
    unsigned char *out=(unsigned char *)destination;
    size_t i;
    for(i=0u;i<length;i++) out[i]=(unsigned char)value;
    return destination;
}

void *memcpy(void *destination, const void *source, size_t length)
{
    unsigned char *out=(unsigned char *)destination;
    const unsigned char *in=(const unsigned char *)source;
    size_t i;
    for(i=0u;i<length;i++) out[i]=in[i];
    return destination;
}
