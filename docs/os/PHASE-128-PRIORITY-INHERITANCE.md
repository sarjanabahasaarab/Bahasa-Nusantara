# Phase 128 — Scheduler Priorities and Priority Inheritance

## Scope
- Each task has a base priority and an effective priority (larger values mean higher priority).
- The scheduler chooses the highest effective-priority runnable task; equal priorities retain round-robin order.
- The priority manager tracks up to 64 mutexes and recomputes effective priorities from every registered mutex.
- Fixed-point propagation supports chained dependencies and multiple mutexes held by one owner.
- Unlock performs FIFO ownership handoff through the existing mutex implementation, then recomputes all effective priorities.

## Correctness model
Recomputation first restores every task's effective priority to its base priority. It then repeatedly propagates each waiter's effective priority to the mutex owner until no value changes. This avoids prematurely dropping a boost when a task still owns another contended mutex and propagates transitive inheritance through chains. The bounded iteration count is the scheduler's maximum task count.

All mutexes participating in priority inheritance must be registered with one manager. Use the manager wrappers for lock/unlock and the manager setter for base-priority changes. Do not mix raw mutex operations with managed operations for registered mutexes.

## Concurrency contract
The manager is deliberately policy-only: callers must protect scheduler, mutex and manager state with the same suitable critical section while performing lock/unlock and recomputation. This phase does not implement priority-ceiling protocol, deadlock detection, robust owner-death recovery, priority inheritance for semaphores, or interrupt-safe locking.

## Validation
The dedicated GitHub Actions workflow compiles with strict C11 warnings-as-errors and exercises multiple-mutex retention, chained inheritance, boost removal, and priority-aware scheduling.
