'use client';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserApi, BrowserApiError } from '../browser-api';
import type { User } from '../browser-api';
import type { BoardPage } from '../contract';
import { inputClass, buttonClass, ErrorMessage } from './shared';
const api = createBrowserApi();
const roles = { OWNER: 'Owner', EDITOR: 'Editor', VIEWER: 'Viewer' };
export function BoardsScreen() {
  const router = useRouter(), params = useSearchParams(), cursor = params.get('cursor');
  const [user, setUser] = useState<User | null>(null), [page, setPage] = useState<BoardPage | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false), [creating, setCreating] = useState(false), [createError, setCreateError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false), [reload, setReload] = useState(0);
  const mutation = useRef<AbortController | null>(null);
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null); setPage(null);
    void (async () => {
      try {
        const currentUser = await api.me(controller.signal);
        const boards = await api.boards(cursor, controller.signal);
        if (!controller.signal.aborted) { setUser(currentUser); setPage(boards); }
      } catch (failure) {
        if (controller.signal.aborted) return;
        if (failure instanceof BrowserApiError && failure.status === 401) router.replace('/login');
        else setError(failure instanceof BrowserApiError && failure.body?.code === 'INVALID_INPUT' ? '페이지 책갈피가 올바르지 않습니다. 첫 페이지에서 다시 확인해 주세요.' : '보드를 불러오지 못했습니다. 다시 시도해 주세요.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [cursor, reload, router]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (mutation.current) return;
    const form = new FormData(event.currentTarget), controller = new AbortController(); mutation.current = controller;
    setCreating(true); setCreateError(null);
    const description = String(form.get('description') ?? ''), color = String(form.get('color') ?? '');
    try {
      await api.createBoard({ title: String(form.get('title') ?? ''), ...(description ? { description } : {}), ...(color ? { color } : {}) }, controller.signal);
      if (!controller.signal.aborted) { setCreateOpen(false); router.replace('/boards'); setReload(v => v + 1); }
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure instanceof BrowserApiError && failure.status === 401) router.replace('/login');
      else setCreateError('보드를 만들지 못했습니다. 입력을 확인하고 다시 시도해 주세요.');
    } finally { if (!controller.signal.aborted) { mutation.current = null; setCreating(false); } }
  }
  async function logout() {
    if (mutation.current) return;
    const controller = new AbortController(); mutation.current = controller; setLoggingOut(true); setError(null);
    try { await api.logout(controller.signal); setUser(null); setPage(null); router.replace('/login'); }
    catch (failure) {
      if (controller.signal.aborted) return;
      if (failure instanceof BrowserApiError && failure.status === 401) { setUser(null); setPage(null); router.replace('/login'); }
      else if (failure instanceof BrowserApiError && failure.status === 502 && failure.body?.message?.includes('Local logout completed')) {
        setUser(null); setPage(null); router.replace('/login?logout=unconfirmed');
      } else setError('로그아웃을 확인하지 못했습니다. 다시 시도해 주세요.');
    } finally { if (!controller.signal.aborted) { mutation.current = null; setLoggingOut(false); } }
  }
  return <div className="min-h-screen lg:grid lg:grid-cols-[230px_1fr]">
    <aside className="flex border-b border-line bg-white px-6 py-5 lg:min-h-screen lg:flex-col lg:border-r lg:border-b-0 lg:py-7" aria-label="워크스페이스">
      <p className="text-3xl font-bold text-brand">◆ taskify</p>
      <div className="mt-12 hidden lg:block"><p className="text-xs font-semibold tracking-widest text-muted">WORKSPACE</p><nav className="mt-7" aria-label="메인 메뉴"><a href="/boards" aria-current="page" className="block rounded-lg bg-brand-light px-4 py-3 font-semibold text-brand">▦ 내 보드</a></nav><div className="space-y-7 px-4 pt-7 text-sm text-muted"><p>✉ 받은 초대함 <span className="text-xs">준비 중</span></p><p>⌕ 검색 <span className="text-xs">준비 중</span></p><p>◉ 마이페이지 <span className="text-xs">준비 중</span></p></div></div>
      <div className="ml-auto flex items-center gap-4 lg:mt-auto lg:ml-0 lg:block"><p className="hidden truncate text-sm lg:block">◉ {user?.nickname ?? '내 계정'}</p><button onClick={logout} disabled={loggingOut || creating} className="text-sm text-muted hover:text-brand disabled:opacity-50 lg:mt-4">{loggingOut ? '로그아웃 중…' : '로그아웃'}</button></div>
    </aside>
    <div className="min-w-0"><header className="flex h-[72px] items-center justify-between border-b border-line bg-white px-6 text-sm lg:px-10"><p className="text-muted">Workspace / <span className="text-ink">내 보드</span></p><span className="rounded-full bg-brand-light px-3 py-2 font-semibold text-brand" aria-label="현재 사용자">{user?.nickname.slice(0, 2) ?? '…'}</span></header>
      <main className="px-6 py-8 lg:px-[46px] lg:py-10"><div className="flex flex-wrap items-center justify-between gap-5"><div><h1 className="text-3xl font-bold">내 보드</h1><p className="mt-3 text-sm text-muted">내가 만든 보드와 초대받은 보드를 확인합니다.</p></div><button className={buttonClass} onClick={() => { setCreateOpen(v => !v); setCreateError(null); }} aria-expanded={createOpen} aria-controls="new-board" disabled={creating || loggingOut}>+ 새 보드</button></div>
      {createOpen && <section id="new-board" className="mt-8 max-w-2xl rounded-xl border border-line bg-white p-6" aria-labelledby="new-board-title"><h2 id="new-board-title" className="text-xl font-bold">새 보드 만들기</h2><form onSubmit={create} className="mt-5 space-y-4" aria-busy={creating}><label className="block text-sm font-medium">보드 이름<input name="title" required minLength={1} maxLength={80} className={inputClass} disabled={creating} autoFocus /></label><label className="block text-sm font-medium">설명 <span className="text-muted">(선택)</span><textarea name="description" maxLength={500} rows={3} className={inputClass} disabled={creating} /></label><label className="block text-sm font-medium">색상 <span className="text-muted">(선택)</span><input name="color" placeholder="선택하지 않으면 보라색" className={inputClass} disabled={creating} /></label><ErrorMessage message={createError} /><div className="flex gap-3"><button className={buttonClass} disabled={creating}>{creating ? '만드는 중…' : '만들기'}</button><button type="button" onClick={() => setCreateOpen(false)} disabled={creating} className="rounded-lg border border-line px-5 py-2 text-sm">취소</button></div></form></section>}
      <div className="mt-8"><ErrorMessage message={error} />{error && <div className="mt-4 flex gap-4"><button className="text-sm font-semibold text-brand" onClick={() => setReload(v => v + 1)}>다시 시도</button>{cursor !== null && <a href="/boards" className="text-sm font-semibold text-brand">첫 페이지로</a>}</div>}</div>
      {loading && <p role="status" className="py-12 text-muted">보드를 불러오는 중…</p>}
      {!loading && page?.items.length === 0 && <section className="mt-8 rounded-xl border border-dashed border-line bg-white p-12 text-center"><h2 className="font-semibold">아직 참여한 보드가 없어요</h2><p className="mt-3 text-sm text-muted">새 보드를 만들어 팀의 일을 정리해 보세요.</p></section>}
      {!loading && page && <><ul className="mt-7 grid max-w-[913px] gap-[30px] md:grid-cols-2" aria-label="내 보드 목록">{page.items.map(board => <li key={board.id} className="relative min-h-[206px] overflow-hidden rounded-xl border border-line bg-white p-[22px] pt-10"><div className="absolute inset-x-0 top-0 h-[9px]" style={{ backgroundColor: board.color }} aria-hidden="true" /><div className="flex items-start justify-between gap-3"><h2 className="break-words text-xl font-semibold">{board.title}</h2><span className="shrink-0 rounded-md bg-brand-light px-3 py-1 text-xs font-semibold text-brand">{roles[board.myRole]}</span></div><p className="mt-7 line-clamp-2 text-sm text-muted">{board.description || '설명이 없습니다.'}</p><p className="mt-6 text-xs text-muted">보드 상세 화면 준비 중</p></li>)}</ul><div className="mt-8 flex items-center gap-5">{cursor !== null && <a className="text-sm font-semibold text-brand" href="/boards">첫 페이지로</a>}<button className="rounded-lg border border-line bg-white px-5 py-2.5 text-sm disabled:cursor-default disabled:text-muted disabled:opacity-50" onClick={() => { if (page.nextCursor !== null) router.push(`/boards?${new URLSearchParams({ cursor: page.nextCursor })}`); }} disabled={page.nextCursor === null || loading || loggingOut}>다음 페이지</button><span className="text-xs text-muted">{page.nextCursor === null ? '마지막 페이지입니다.' : '최근 참여한 순서로 표시합니다.'}</span></div></>}
      </main>
    </div>
  </div>;
}
