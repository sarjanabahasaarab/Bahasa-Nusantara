/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "process-syscall-adapter.h"

static nusantara_arm64_exception_handler_fn registered_handler;
static void *registered_context;
static uint64_t active_root;
static unsigned writes;

nusantara_arm64_address_space_status_t nusantara_arm64_process_bootstrap_destroy(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_process_bootstrap_t *process)
{
    (void)manager;
    process->initialized = 0u;
    process->address_space.initialized = 0u;
    return NUSANTARA_ARM64_AS_OK;
}

int nusantara_arm64_exception_set_handler(
    nusantara_arm64_exception_handler_fn handler, void *context)
{
    registered_handler = handler;
    registered_context = context;
    return handler != 0;
}

static int install_root(void *context, uint64_t root)
{
    (void)context;
    active_root = root;
    return 1;
}
static int allocate_page(void *context, uint64_t *physical, uint64_t **alias)
{
    (void)context; (void)physical; (void)alias;
    return 0;
}
static int resolve_page(void *context, uint64_t physical, uint64_t **alias)
{
    (void)context; (void)physical; (void)alias;
    return 0;
}
static void release_page(void *context, uint64_t physical)
{
    (void)context; (void)physical;
}
static int validate(void *context, uintptr_t address, size_t length)
{
    (void)context;
    return address == (uintptr_t)0x4000u && length == 4u;
}
static int64_t write_user(void *context, uintptr_t address, size_t length)
{
    (void)context; (void)address;
    ++writes;
    return (int64_t)length;
}
static void setup_svc(
    nusantara_arm64_exception_frame_t *frame, uint64_t syscall_number)
{
    memset(frame, 0, sizeof(*frame));
    frame->vector = 8u;
    frame->esr_el1 = UINT64_C(0x15) << 26;
    frame->x[8] = syscall_number;
}

int main(void)
{
    nusantara_os_scheduler_t task_scheduler;
    nusantara_arm64_address_space_manager_t spaces;
    nusantara_arm64_address_space_ops_t page_ops = {
        allocate_page, resolve_page, release_page, install_root
    };
    nusantara_arm64_process_scheduler_t process_scheduler = {0};
    nusantara_arm64_process_task_t binding_a = {0}, binding_b = {0};
    nusantara_arm64_process_bootstrap_t process_a = {0}, process_b = {0};
    nusantara_arm64_process_syscall_adapter_t adapter = {0};
    nusantara_arm64_user_syscall_ops_t syscall_ops = {
        0, validate, write_user, 0, 0, 0, 0
    };
    _Alignas(16) nusantara_arm64_exception_frame_t frame_a, frame_b, idle;
    nusantara_arm64_exception_frame_t *selected;
    nusantara_os_task_t *task_a = 0, *task_b = 0;
    uint64_t id_a = 0, id_b = 0;
    size_t i;

    memset(&idle, 0, sizeof(idle));
    idle.elr_el1 = (uint64_t)0x80000u;
    idle.spsr_el1 = NUSANTARA_ARM64_SPSR_EL1H_MASKED;

    nusantara_os_scheduler_init(&task_scheduler);
    assert(nusantara_arm64_address_space_manager_init(&spaces, &page_ops, 0));
    process_a.address_space.manager = &spaces;
    process_a.address_space.id = 1u;
    process_a.address_space.root_physical = 0x1000u;
    process_a.address_space.initialized = 1u;
    process_a.initial_frame = &frame_a;
    process_a.initialized = 1u;
    process_b.address_space.manager = &spaces;
    process_b.address_space.id = 2u;
    process_b.address_space.root_physical = 0x2000u;
    process_b.address_space.initialized = 1u;
    process_b.initial_frame = &frame_b;
    process_b.initialized = 1u;
    spaces.spaces[0] = &process_a.address_space;
    spaces.spaces[1] = &process_b.address_space;
    spaces.count = 2u;

    assert(nusantara_os_scheduler_add(
        &task_scheduler, (uintptr_t)&frame_a, 0, 1u, &id_a) ==
        NUSANTARA_OS_SCHEDULER_OK);
    assert(nusantara_os_scheduler_add(
        &task_scheduler, (uintptr_t)&frame_b, 0, 1u, &id_b) ==
        NUSANTARA_OS_SCHEDULER_OK);
    for (i = 0u; i < NUSANTARA_OS_SCHEDULER_MAX_TASKS; ++i) {
        if (task_scheduler.tasks[i].id == id_a) task_a = &task_scheduler.tasks[i];
        if (task_scheduler.tasks[i].id == id_b) task_b = &task_scheduler.tasks[i];
    }
    assert(task_a != 0 && task_b != 0);
    assert(nusantara_arm64_process_scheduler_init(
        &process_scheduler, &task_scheduler, &spaces, 0x3000u) ==
        NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
    assert(nusantara_arm64_process_scheduler_attach(
        &process_scheduler, task_a, &binding_a, &process_a) ==
        NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
    assert(nusantara_arm64_process_scheduler_attach(
        &process_scheduler, task_b, &binding_b, &process_b) ==
        NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
    assert(nusantara_arm64_process_scheduler_start(
        &process_scheduler, &selected) ==
        NUSANTARA_ARM64_PROCESS_SCHEDULER_OK);
    assert(selected == &frame_a && active_root == 0x1000u);

    assert(nusantara_arm64_process_syscall_adapter_init(
        &adapter, &process_scheduler, &syscall_ops, &idle));
    assert(nusantara_arm64_user_syscall_init(&syscall_ops));
    assert(registered_handler != 0);

    setup_svc(&frame_a, NUSANTARA_ARM64_SYSCALL_WRITE);
    frame_a.x[0] = 0x4000u;
    frame_a.x[1] = 4u;
    assert(registered_handler(registered_context, &frame_a) == &frame_a);
    assert((int64_t)frame_a.x[0] == 4 && writes == 1u);

    setup_svc(&frame_a, NUSANTARA_ARM64_SYSCALL_YIELD);
    assert(registered_handler(registered_context, &frame_a) == &frame_b);
    assert(active_root == 0x2000u);

    setup_svc(&frame_b, NUSANTARA_ARM64_SYSCALL_EXIT);
    frame_b.x[0] = 7u;
    assert(registered_handler(registered_context, &frame_b) == &frame_a);
    assert(active_root == 0x1000u);
    assert(binding_b.exited && binding_b.exit_status == 7);

    setup_svc(&frame_a, NUSANTARA_ARM64_SYSCALL_EXIT);
    frame_a.x[0] = 0u;
    assert(registered_handler(registered_context, &frame_a) == &idle);
    assert(active_root == 0x3000u);
    assert(binding_a.exited && binding_a.exit_status == 0);

    puts("Phase 122 ARM64 scheduler/syscall integration contract: PASS");
    return 0;
}
