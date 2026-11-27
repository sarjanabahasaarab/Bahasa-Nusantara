/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_OS_SYNC_H
#define NUSANTARA_OS_SYNC_H
#include <stdint.h>
#include "wait-queue.h"
typedef enum nusantara_os_sync_status {
 NUSANTARA_OS_SYNC_OK=0, NUSANTARA_OS_SYNC_INVALID_ARGUMENT,
 NUSANTARA_OS_SYNC_WOULD_BLOCK, NUSANTARA_OS_SYNC_NOT_OWNER,
 NUSANTARA_OS_SYNC_OVERFLOW, NUSANTARA_OS_SYNC_INVALID_STATE
} nusantara_os_sync_status_t;
typedef struct nusantara_os_mutex {
 uint64_t owner;
 nusantara_os_wait_queue_t waiters;
} nusantara_os_mutex_t;
typedef struct nusantara_os_semaphore {
 uint32_t value;
 uint32_t maximum;
 nusantara_os_wait_queue_t waiters;
} nusantara_os_semaphore_t;
void nusantara_os_mutex_init(nusantara_os_mutex_t *,uintptr_t);
nusantara_os_sync_status_t nusantara_os_mutex_lock(nusantara_os_mutex_t *,nusantara_os_scheduler_t *,uint64_t);
nusantara_os_sync_status_t nusantara_os_mutex_try_lock(nusantara_os_mutex_t *,uint64_t);
nusantara_os_sync_status_t nusantara_os_mutex_unlock(nusantara_os_mutex_t *,nusantara_os_scheduler_t *,uint64_t);
void nusantara_os_semaphore_init(nusantara_os_semaphore_t *,uintptr_t,uint32_t,uint32_t);
nusantara_os_sync_status_t nusantara_os_semaphore_wait(nusantara_os_semaphore_t *,nusantara_os_scheduler_t *,uint64_t);
nusantara_os_sync_status_t nusantara_os_semaphore_try_wait(nusantara_os_semaphore_t *);
nusantara_os_sync_status_t nusantara_os_semaphore_post(nusantara_os_semaphore_t *,nusantara_os_scheduler_t *);
#endif
