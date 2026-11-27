/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "user-syscall.h"
static nusantara_arm64_exception_handler_fn registered;
static void *registered_context;
static _Alignas(16) nusantara_arm64_exception_frame_t next_frame;
static int writes;
static int64_t legacy_exit(void *c,int status){(void)c;return status;}
static int64_t legacy_yield(void *c){(void)c;return 11;}
static int validate(void *c,uintptr_t p,size_t n){(void)c;(void)p;(void)n;return 1;}
static int64_t write_cb(void *c,uintptr_t p,size_t n){(void)c;(void)p;writes++;return (int64_t)n;}
static nusantara_arm64_exception_frame_t *yield_frame(void *c,nusantara_arm64_exception_frame_t *f){
 (void)c;assert(f->x[8]==NUSANTARA_ARM64_SYSCALL_YIELD);next_frame.x[0]=0x121;return &next_frame;
}
static nusantara_arm64_exception_frame_t *exit_frame(void *c,nusantara_arm64_exception_frame_t *f,int status){
 (void)c;assert(f->x[8]==NUSANTARA_ARM64_SYSCALL_EXIT);assert(status==23);next_frame.x[0]=0x222;return &next_frame;
}
int nusantara_arm64_exception_set_handler(nusantara_arm64_exception_handler_fn fn,void *ctx){
 registered=fn;registered_context=ctx;return fn!=0;
}
static void setup(nusantara_arm64_exception_frame_t *f,uint64_t n){
 memset(f,0,sizeof(*f));f->vector=8u;f->esr_el1=(UINT64_C(0x15)<<26);f->x[8]=n;
}
int main(void){
 _Alignas(16) nusantara_arm64_exception_frame_t current;
 nusantara_arm64_user_syscall_ops_t ops={0,validate,write_cb,legacy_exit,legacy_yield,exit_frame,yield_frame};
 assert(nusantara_arm64_user_syscall_init(&ops));assert(registered!=0);
 setup(&current,NUSANTARA_ARM64_SYSCALL_YIELD);
 assert(registered(registered_context,&current)==&next_frame);
 assert(current.x[0]==0u); /* switched frame is returned untouched */
 setup(&current,NUSANTARA_ARM64_SYSCALL_EXIT);current.x[0]=23;
 assert(registered(registered_context,&current)==&next_frame);
 setup(&current,NUSANTARA_ARM64_SYSCALL_WRITE);current.x[0]=0x4000;current.x[1]=5;
 assert(registered(registered_context,&current)==&current);
 assert((int64_t)current.x[0]==5&&writes==1);
 setup(&current,99u);
 assert(registered(registered_context,&current)==&current);
 assert((int64_t)current.x[0]==NUSANTARA_ARM64_SYSCALL_ENOSYS);
 puts("Phase 121 frame-returning syscall dispatch: PASS");return 0;
}
