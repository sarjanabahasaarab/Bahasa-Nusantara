/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_PROCESS_SCHEDULER_H
#define NUSANTARA_ARM64_PROCESS_SCHEDULER_H
#include <stdint.h>
#include "process-bootstrap.h"
#include "../../scheduler/scheduler.h"
typedef enum nusantara_arm64_process_scheduler_status {
 NUSANTARA_ARM64_PROCESS_SCHEDULER_OK=0,
 NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_ARGUMENT,
 NUSANTARA_ARM64_PROCESS_SCHEDULER_INVALID_STATE,
 NUSANTARA_ARM64_PROCESS_SCHEDULER_NO_RUNNABLE,
 NUSANTARA_ARM64_PROCESS_SCHEDULER_ADDRESS_SPACE_FAILURE
} nusantara_arm64_process_scheduler_status_t;
typedef struct nusantara_arm64_process_task {
 nusantara_arm64_process_bootstrap_t *process;
 int64_t exit_status;
 uint8_t attached;
 uint8_t exited;
} nusantara_arm64_process_task_t;
typedef struct nusantara_arm64_process_scheduler {
 nusantara_os_scheduler_t *scheduler;
 nusantara_arm64_address_space_manager_t *address_spaces;
 uint64_t kernel_root_physical;
 uint8_t initialized;
} nusantara_arm64_process_scheduler_t;
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_init(
 nusantara_arm64_process_scheduler_t *,nusantara_os_scheduler_t *,
 nusantara_arm64_address_space_manager_t *,uint64_t);
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_attach(
 nusantara_arm64_process_scheduler_t *,nusantara_os_task_t *,
 nusantara_arm64_process_task_t *,nusantara_arm64_process_bootstrap_t *);
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_save_frame(
 nusantara_arm64_process_scheduler_t *,nusantara_arm64_exception_frame_t *);
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_start(
 nusantara_arm64_process_scheduler_t *,nusantara_arm64_exception_frame_t **);
/* Activate a scheduler-selected task after an asynchronous timer tick. */
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_activate_task(
 nusantara_arm64_process_scheduler_t *,nusantara_os_task_t *,
 nusantara_arm64_exception_frame_t **);
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_yield(
 nusantara_arm64_process_scheduler_t *,nusantara_arm64_exception_frame_t *,
 nusantara_arm64_exception_frame_t **);
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_exit(
 nusantara_arm64_process_scheduler_t *,nusantara_arm64_exception_frame_t *,
 int64_t,nusantara_arm64_exception_frame_t **);
nusantara_arm64_process_scheduler_status_t nusantara_arm64_process_scheduler_reap(
 nusantara_arm64_process_scheduler_t *,uint64_t);
#endif
