'use client';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserApi, BrowserApiError } from '../browser-api';
import { buttonClass, inputClass, ErrorMessage } from './shared';
const api = createBrowserApi();
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter(), params = useSearchParams(), register = mode === 'register';
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => () => inFlight.current?.abort(), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (inFlight.current) return;
    const data = new FormData(event.currentTarget), controller = new AbortController();
    inFlight.current = controller; setPending(true); setError(null);
    // Exact form strings: email identity policy explicitly forbids trimming/lowercasing.
    const input = { email: String(data.get('email') ?? ''), password: String(data.get('password') ?? '') };
    try {
      if (register) await api.register({ ...input, nickname: String(data.get('nickname') ?? '') }, controller.signal);
      else await api.login(input, controller.signal);
      router.replace('/boards');
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(failure instanceof BrowserApiError && failure.body?.code === 'INVALID_CREDENTIALS' ? '이메일 또는 비밀번호를 확인해 주세요.' : failure instanceof BrowserApiError && failure.body?.code === 'EMAIL_TAKEN' ? '이미 가입된 이메일입니다.' : '요청을 처리하지 못했습니다. 입력을 확인하고 다시 시도해 주세요.');
    } finally { if (!controller.signal.aborted) { inFlight.current = null; setPending(false); } }
  }
  return <main className="grid min-h-screen lg:grid-cols-[45.5%_54.5%]">
    <section className="hidden bg-brand px-[8.4%] py-12 text-white lg:block" aria-label="Taskify 소개">
      <p className="text-3xl font-bold">◆ taskify</p>
      <div className="mt-48"><h1 className="text-3xl font-bold leading-relaxed">팀의 일이 명확해지는 공간</h1><p className="mt-8 leading-7 text-white/80">보드와 카드로 업무를 정리하고<br />누가 무엇을 막고 있는지 확인하세요.</p></div>
      <div className="mt-24 rounded-xl border border-white/25 bg-white/10 p-7"><p className="font-semibold">서비스 리뉴얼 <span className="float-right" aria-hidden="true">●●●</span></p><div className="mt-8 flex gap-3"><span className="rounded-md bg-white/20 px-3 py-1 text-xs">하는 중</span><span className="rounded-md bg-white/20 px-3 py-1 text-xs">차단됨</span></div></div>
    </section>
    <section className="flex items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-[420px]"><p className="mb-12 text-2xl font-bold text-brand lg:hidden">◆ taskify</p>
        <h1 className="text-3xl font-bold">{register ? 'Taskify에 오신 것을 환영해요' : '다시 만나 반가워요'}</h1>
        <p className="mt-4 text-sm text-muted">{register ? '함께 일할 계정을 만들어 보세요.' : 'Taskify 계정으로 로그인하세요.'}</p>
        {params.get('logout') === 'unconfirmed' && <p role="status" className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">이 브라우저의 로그인을 종료했습니다. 서버의 로그아웃 처리는 확인되지 않았습니다.</p>}
        <form onSubmit={submit} className="mt-10 space-y-5" aria-busy={pending}>
          <label className="block text-sm font-medium">이메일<input name="email" type="text" inputMode="email" autoComplete="email" required placeholder="name@example.com" className={inputClass} disabled={pending} /></label>
          {register && <label className="block text-sm font-medium">닉네임<input name="nickname" autoComplete="nickname" required minLength={1} maxLength={30} className={inputClass} disabled={pending} /></label>}
          <label className="block text-sm font-medium">비밀번호<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 8 : undefined} placeholder={register ? '8자 이상 입력해 주세요' : '비밀번호를 입력해 주세요'} className={inputClass} disabled={pending} /></label>
          <ErrorMessage message={error} /><button className={`${buttonClass} mt-3 w-full`} disabled={pending}>{pending ? '처리 중…' : register ? '회원가입' : '로그인'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">{register ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? '}<Link href={register ? '/login' : '/register'} className="font-semibold text-brand underline-offset-4 hover:underline">{register ? '로그인' : '회원가입'}</Link></p>
      </div>
    </section>
  </main>;
}
