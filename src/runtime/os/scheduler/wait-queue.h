/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_OS_WAIT_QUEUE_H
#define NUSANTARA_OS_WAIT_QUEUE_H
#include <stddef.h>
#include <stdint.h>
#include "scheduler.h"
#define NUSANTARA_OS_WAIT_QUEUE_MAX_WAITERS 32u
typedef enum nusantara_os_wait_queue_status {
 NUSANTARA_OS_WAIT_QUEUE_OK=0, NUSANTARA_OS_WAIT_QUEUE_INVALID_ARGUMENT,
 NUSANTARA_OS_WAIT_QUEUE_FULL, NUSANTARA_OS_WAIT_QUEUE_NOT_FOUND,
 NUSANTARA_OS_WAIT_QUEUE_INVALID_STATE
} nusantara_os_wait_queue_status_t;
typedef struct nusantara_os_wait_queue {
 uintptr_t channel;
 uint64_t waiters[NUSANTARA_OS_WAIT_QUEUE_MAX_WAITERS];
 size_t count;
} nusantara_os_wait_queue_t;
void nusantara_os_wait_queue_init(nusantara_os_wait_queue_t *,uintptr_t);
nusantara_os_wait_queue_status_t nusantara_os_wait_queue_sleep(nusantara_os_wait_queue_t *,nusantara_os_scheduler_t *,uint64_t);
nusantara_os_wait_queue_status_t nusantara_os_wait_queue_wake_one(nusantara_os_wait_queue_t *,nusantara_os_scheduler_t *,uint64_t *);
nusantara_os_wait_queue_status_t nusantara_os_wait_queue_wake_all(nusantara_os_wait_queue_t *,nusantara_os_scheduler_t *,uint64_t *,size_t,size_t *);
#endif
