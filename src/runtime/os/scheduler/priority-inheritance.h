/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_OS_PRIORITY_INHERITANCE_H
#define NUSANTARA_OS_PRIORITY_INHERITANCE_H
#include <stddef.h>
#include <stdint.h>
#include "sync.h"
#define NUSANTARA_OS_PI_MAX_MUTEXES 64u
typedef enum nusantara_os_pi_status {
 NUSANTARA_OS_PI_OK=0, NUSANTARA_OS_PI_INVALID_ARGUMENT,
 NUSANTARA_OS_PI_FULL, NUSANTARA_OS_PI_NOT_FOUND,
 NUSANTARA_OS_PI_INVALID_STATE, NUSANTARA_OS_PI_SCHEDULER_ERROR,
 NUSANTARA_OS_PI_SYNC_ERROR
} nusantara_os_pi_status_t;
typedef struct nusantara_os_priority_manager {
 nusantara_os_scheduler_t *scheduler;
 nusantara_os_mutex_t *mutexes[NUSANTARA_OS_PI_MAX_MUTEXES];
 size_t count;
} nusantara_os_priority_manager_t;
/* Caller must serialize manager, scheduler and mutex operations in one critical section. */
void nusantara_os_priority_manager_init(nusantara_os_priority_manager_t *,nusantara_os_scheduler_t *);
nusantara_os_pi_status_t nusantara_os_priority_manager_register(nusantara_os_priority_manager_t *,nusantara_os_mutex_t *);
nusantara_os_pi_status_t nusantara_os_priority_manager_unregister(nusantara_os_priority_manager_t *,nusantara_os_mutex_t *);
nusantara_os_pi_status_t nusantara_os_priority_manager_recompute(nusantara_os_priority_manager_t *);
nusantara_os_pi_status_t nusantara_os_priority_manager_set_base_priority(nusantara_os_priority_manager_t *,uint64_t,uint32_t);
nusantara_os_pi_status_t nusantara_os_priority_mutex_lock(nusantara_os_priority_manager_t *,nusantara_os_mutex_t *,uint64_t);
nusantara_os_pi_status_t nusantara_os_priority_mutex_unlock(nusantara_os_priority_manager_t *,nusantara_os_mutex_t *,uint64_t);
#endif
