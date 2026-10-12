'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrowserApiError, CardPaginationError, createBrowserApi } from '../browser-api';
import type { CardFilters } from '../browser-api';
import type { Board, Card, Column } from '../contract';
import { buttonClass, ErrorMessage, inputClass } from './shared';
const api = createBrowserApi();
type LoadedBoard = { board: Board; columns: Column[]; cards: Card[]; requestKey: string };
export function BoardScreen({ boardId }: { boardId: string }) {
  const router = useRouter(), params = useSearchParams(), search = params.toString();
  const [loaded, setData] = useState<LoadedBoard | null>(null), [loading, setLoading] = useState(true);
  const data = loaded?.requestKey === `${boardId}?${search}` ? loaded : null;
  const [error, setError] = useState<string | null>(null), [denied, setDenied] = useState(false), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setData(null); setError(null); setDenied(false);
    void (async () => {
      try {
        const query = new URLSearchParams(search), filters: CardFilters = {};
        for (const name of ['columnId', 'assigneeId', 'tag', 'limit'] as const) {
          if (query.getAll(name).length > 1) throw new BrowserApiError(422, { code: 'INVALID_INPUT' });
          const value = query.get(name);
          if (value !== null) { if (name === 'limit') filters.limit = Number(value); else filters[name] = value; }
        }
        // Fetch the board first so a denied board never renders a partial title/column/card set.
        const board = await api.board(boardId, controller.signal);
        const columns = await api.columns(boardId, controller.signal);
        const cards = await api.allCards(boardId, filters, controller.signal);
        if (!controller.signal.aborted) setData({ board, columns: columns.items, cards, requestKey: `${boardId}?${search}` });
      } catch (failure) {
        if (controller.signal.aborted) return;
        if (failure instanceof BrowserApiError && failure.status === 401) router.replace('/login');
        else if (failure instanceof BrowserApiError && failure.status === 403) { setDenied(true); setError('이 보드에 접근할 권한이 없습니다.'); }
        else if (failure instanceof BrowserApiError && failure.status === 422) setError('조회 조건이 올바르지 않습니다. 필터를 확인해 주세요.');
        else if (failure instanceof CardPaginationError) setError('카드 목록을 끝까지 확인하지 못했습니다. 다시 불러와 주세요.');
        else setError('보드를 불러오지 못했습니다. 다시 시도해 주세요.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [boardId, search, reload, router]);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget), query = new URLSearchParams();
    for (const name of ['columnId']) { const value = String(values.get(name) ?? ''); if (value) query.set(name, value); }
    if (values.has('tagEnabled')) query.set('tag', String(values.get('tag') ?? ''));
    router.push(`/boards/${encodeURIComponent(boardId)}${query.size ? `?${query}` : ''}`);
  }
  return <div className="min-h-screen lg:grid lg:grid-cols-[230px_1fr]">
    <aside className="border-b border-line bg-white px-6 py-7 lg:border-r lg:border-b-0"><Link href="/boards" className="text-3xl font-bold text-brand">◆ taskify</Link><p className="mt-12 hidden text-xs font-semibold tracking-widest text-muted lg:block">WORKSPACE</p><nav className="mt-6" aria-label="메인 메뉴"><Link href="/boards" className="block rounded-lg bg-brand-light px-4 py-3 font-semibold text-brand">▦ 내 보드</Link></nav></aside>
    <div className="min-w-0"><header className="flex h-[72px] items-center border-b border-line bg-white px-6 text-sm lg:px-10"><Link href="/boards" className="text-muted hover:text-brand">Workspace / 내 보드</Link>{data && <span className="ml-2 truncate">/ {data.board.title}</span>}</header>
    <main className="px-6 py-8 lg:px-[46px] lg:py-10">
      {loading && <p role="status" className="py-8 text-muted">보드와 카드 목록을 불러오는 중…</p>}
      <ErrorMessage message={error} />
      {error && <div className="mt-4 flex gap-5"><Link href="/boards" className="text-sm font-semibold text-brand">내 보드로</Link>{!denied && <button onClick={() => setReload(v => v + 1)} className="text-sm font-semibold text-brand">다시 시도</button>}<Link href={`/boards/${encodeURIComponent(boardId)}`} className="text-sm font-semibold text-brand">필터 초기화</Link></div>}
      {!loading && data && <><h1 className="break-words text-3xl font-bold">{data.board.title}</h1><p className="mt-3 text-sm text-muted">{data.board.description || '컬럼과 카드로 팀의 작업 진행 상황을 확인합니다.'}</p>
        <form onSubmit={filter} className="my-8 flex flex-wrap items-end gap-4" aria-label="카드 필터" key={search}>
          <label className="text-sm">컬럼<select name="columnId" className={inputClass} defaultValue={params.get('columnId') ?? ''}><option value="">전체 컬럼</option>{data.columns.map(column => <option value={column.id} key={column.id}>{column.title}</option>)}</select></label>
          
          <label className="text-sm"><span className="flex items-center gap-2"><input name="tagEnabled" type="checkbox" defaultChecked={params.has('tag')} />태그 이름 정확 일치</span><input name="tag" className={inputClass} defaultValue={params.get('tag') ?? ''} placeholder="태그 이름" /></label>
          <button className={buttonClass}>필터 적용</button><Link href={`/boards/${encodeURIComponent(boardId)}`} className="py-3 text-sm font-semibold text-brand">초기화</Link>
        </form>
        {data.columns.length === 0 ? <p className="rounded-xl border border-dashed border-line bg-white p-10 text-muted">표시할 컬럼이 없습니다.</p> : <div className="flex gap-4 overflow-x-auto pb-6" aria-label="읽기 칸반">
          {data.columns.map(column => { const cards = data.cards.filter(card => card.columnId === column.id); return <section key={column.id} className="w-[316px] shrink-0 rounded-xl border border-line bg-white p-4" aria-label={`${column.title} 컬럼`}><header className="mb-5 flex items-center gap-2"><span className="h-5 w-1.5 rounded bg-brand" aria-hidden="true" /><h2 className="font-semibold">{column.title}</h2><span className="ml-auto rounded-md bg-brand-light px-2 py-1 text-xs text-brand">{cards.length}</span></header>{cards.length === 0 ? <p className="py-8 text-center text-sm text-muted">표시할 카드가 없습니다.</p> : <ul className="space-y-4">{cards.map(card => <li key={card.id} className="rounded-xl border border-line p-4"><div className="mb-3 flex flex-wrap gap-2">{card.tagNames?.map(tag => <span key={tag} className="rounded-md bg-brand-light px-2 py-1 text-xs text-brand">{tag}</span>)}</div><h3 className="break-words text-sm font-semibold">{card.title}</h3>{card.blocked && <p className="mt-3 text-xs text-muted">선행 작업 대기</p>}{card.warnings.includes('BLOCKED_BY_PREDECESSOR') && <p className="mt-2 text-xs text-amber-800">완료 컬럼의 카드에 미완료 선행 작업이 있습니다.</p>}<div className="mt-5 space-y-1 text-xs text-muted">{card.dueAt && <p>마감 {new Date(card.dueAt).toLocaleDateString('ko-KR')}</p>}{card.assigneeId && <p>담당자 지정됨</p>}</div></li>)}</ul>}</section>; })}
        </div>}
      </>}
    </main></div>
  </div>;
}

