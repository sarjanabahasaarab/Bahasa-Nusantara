/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_OS_SCHEDULER_H
#define NUSANTARA_OS_SCHEDULER_H
#include <stddef.h>
#include <stdint.h>
#define NUSANTARA_OS_SCHEDULER_MAX_TASKS 64u
#define NUSANTARA_OS_SCHEDULER_DEFAULT_QUANTUM 5u
typedef enum nusantara_os_task_state { NUSANTARA_OS_TASK_UNUSED=0, NUSANTARA_OS_TASK_READY, NUSANTARA_OS_TASK_RUNNING, NUSANTARA_OS_TASK_BLOCKED, NUSANTARA_OS_TASK_TERMINATED } nusantara_os_task_state_t;
typedef enum nusantara_os_scheduler_status { NUSANTARA_OS_SCHEDULER_OK=0, NUSANTARA_OS_SCHEDULER_INVALID_ARGUMENT, NUSANTARA_OS_SCHEDULER_FULL, NUSANTARA_OS_SCHEDULER_NOT_FOUND, NUSANTARA_OS_SCHEDULER_INVALID_STATE, NUSANTARA_OS_SCHEDULER_NO_RUNNABLE_TASK } nusantara_os_scheduler_status_t;
typedef struct nusantara_os_task {
 uint64_t id;
 uintptr_t saved_stack_pointer;
 void *architecture_context;
 uint32_t quantum;
 uint32_t remaining;
 uint32_t base_priority;
 uint32_t effective_priority;
 nusantara_os_task_state_t state;
 uint64_t cpu_ticks;
 uint64_t dispatches;
 uint64_t preemptions;
 uint64_t ready_wait_ticks;
 uint64_t max_ready_wait_ticks;
 uint64_t ready_wait_events;
} nusantara_os_task_t;
typedef struct nusantara_os_scheduler {
 nusantara_os_task_t tasks[NUSANTARA_OS_SCHEDULER_MAX_TASKS];
 size_t count;
 size_t current;
 uint64_t next_id;
 uint8_t has_current;
 uint64_t total_ticks;
 uint64_t context_switches;
 uint64_t total_preemptions;
} nusantara_os_scheduler_t;
void nusantara_os_scheduler_init(nusantara_os_scheduler_t *);
nusantara_os_scheduler_status_t nusantara_os_scheduler_add(nusantara_os_scheduler_t *,uintptr_t,void *,uint32_t,uint64_t *);
nusantara_os_scheduler_status_t nusantara_os_scheduler_schedule(nusantara_os_scheduler_t *,nusantara_os_task_t **);
nusantara_os_scheduler_status_t nusantara_os_scheduler_tick(nusantara_os_scheduler_t *,nusantara_os_task_t **);
nusantara_os_scheduler_status_t nusantara_os_scheduler_block(nusantara_os_scheduler_t *,uint64_t);
nusantara_os_scheduler_status_t nusantara_os_scheduler_unblock(nusantara_os_scheduler_t *,uint64_t);
nusantara_os_scheduler_status_t nusantara_os_scheduler_terminate(nusantara_os_scheduler_t *,uint64_t);
nusantara_os_scheduler_status_t nusantara_os_scheduler_set_priority(nusantara_os_scheduler_t *,uint64_t,uint32_t);
nusantara_os_scheduler_status_t nusantara_os_scheduler_set_effective_priority(nusantara_os_scheduler_t *,uint64_t,uint32_t);
nusantara_os_scheduler_status_t nusantara_os_scheduler_reset_effective_priorities(nusantara_os_scheduler_t *);
const nusantara_os_task_t *nusantara_os_scheduler_find(const nusantara_os_scheduler_t *,uint64_t);
#endif
