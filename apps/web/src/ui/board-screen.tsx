'use client';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrowserApiError, CardPaginationError, createBrowserApi } from '../browser-api';
import { parseBoardFilters } from '../board-filters';
import type { Board, Card, Column, Member } from '../contract';
import { buttonClass, ErrorMessage, inputClass } from './shared';
import { CardWritePanel } from './card-write-panel';
import type { Role } from '../contract';
const api = createBrowserApi();
type LoadedBoard = { board: Board; columns: Column[]; cards: Card[]; members: Member[]; role: Role | null; requestKey: string };
export function BoardScreen({ boardId }: { boardId: string }) {
  const router = useRouter(), params = useSearchParams(), search = params.toString();
  const [loaded, setData] = useState<LoadedBoard | null>(null), [loading, setLoading] = useState(true);
  const data = loaded?.requestKey === `${boardId}?${search}` ? loaded : null;
  const writeDialog = useRef<HTMLDialogElement | null>(null);
  const [writeColumn, setWriteColumn] = useState<string | undefined>();
  const [userName, setUserName] = useState('내 계정');
  const [writeError, setWriteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null), [denied, setDenied] = useState(false), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setData(null); setError(null); setDenied(false);
    void (async () => {
      try {
        const filters = parseBoardFilters(new URLSearchParams(search));
        if (!filters) throw new BrowserApiError(422, { code: 'INVALID_INPUT' });
        // Fetch the board first so a denied board never renders a partial title/column/card set.
        const user = await api.me(controller.signal);
        if (!controller.signal.aborted) setUserName(user.nickname);
        const board = await api.board(boardId, controller.signal);
        const columns = await api.columns(boardId, controller.signal);
        const cards = await api.allCards(boardId, filters, controller.signal);
        const members = await api.members(boardId, controller.signal);
        const role = await api.boardRole(boardId, controller.signal);
        if (!controller.signal.aborted) setData({ board, columns: columns.items, cards, members: members.items, role, requestKey: `${boardId}?${search}` });
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
    for (const name of ['columnId', 'assigneeId']) { const value = String(values.get(name) ?? ''); if (value) query.set(name, value); }
    if (values.has('tagEnabled')) query.set('tag', String(values.get('tag') ?? ''));
    router.push(`/boards/${encodeURIComponent(boardId)}${query.size ? `?${query}` : ''}`);
  }
  return <div className="board-design min-h-screen lg:grid lg:grid-cols-[230px_1fr]">
    <aside className="board-sidebar flex flex-col border-b px-[26px] py-[29px] lg:min-h-screen"><Link href="/boards" className="text-[25px] font-semibold text-white">◆ taskify</Link><p className="mt-[46px] hidden text-[11px] font-semibold text-[#a3afca] lg:block">WORKSPACE</p><nav className="mt-6" aria-label="메인 메뉴"><Link href="/boards" className="-mx-3 block rounded-lg bg-[#293453] px-[15px] py-3 text-[14px] font-semibold text-white">▦ 내 보드</Link></nav><div className="mt-7 space-y-7 text-[14px] text-[#abb9d3]"><button disabled title="준비 중" className="block">✉ 받은 초대함 · 준비 중</button><button disabled title="준비 중" className="block">⌕ 검색 · 준비 중</button><button disabled title="준비 중" className="block">◉ 마이페이지 · 준비 중</button></div><p className="mt-12 text-sm text-white lg:mt-auto">◉ {userName}</p></aside>
    <div className="min-w-0"><header className="flex h-[72px] items-center justify-between border-b border-line bg-white px-6 text-sm lg:px-10"><Link href="/boards" className="text-muted hover:text-brand">Workspace / 내 보드</Link>{data && <span className="ml-2 mr-auto truncate">/ {data.board.title}</span>}</header>
    <main className="relative px-6 py-8 lg:px-[46px] lg:py-10">
      {loading && <p role="status" className="py-8 text-muted">보드와 카드 목록을 불러오는 중…</p>}
      <ErrorMessage message={error} />{writeError && <p role="status" className="rounded-lg border border-line bg-white p-3 text-sm">{writeError}</p>}
      {error && <div className="mt-4 flex gap-5"><Link href="/boards" className="text-sm font-semibold text-brand">내 보드로</Link>{!denied && <button onClick={() => setReload(v => v + 1)} className="text-sm font-semibold text-brand">다시 시도</button>}<Link href={`/boards/${encodeURIComponent(boardId)}`} className="text-sm font-semibold text-brand">필터 초기화</Link></div>}
      {!loading && data && <><h1 className="break-words text-[27px] font-semibold">{data.board.title}</h1><p className="mt-2 text-[13px] text-muted">{data.board.description || '컬럼과 카드로 팀의 작업 진행 상황을 확인합니다.'}</p>
        <form onSubmit={filter} className="board-filters my-6 flex flex-wrap items-end gap-4" aria-label="카드 필터" key={search}>
          <label className="text-sm">컬럼<select name="columnId" className={inputClass} defaultValue={params.get('columnId') ?? ''}><option value="">전체 컬럼</option>{data.columns.map(column => <option value={column.id} key={column.id}>{column.title}</option>)}</select></label>
          <label className="text-sm">담당자<select name="assigneeId" className={inputClass} defaultValue={params.get('assigneeId') ?? ''}><option value="">전체 담당자</option>{data.members.map((member, index) => <option value={member.userId} key={member.userId}>{member.nickname ?? `이름 없는 멤버 ${index + 1}`}</option>)}</select></label>
          <label className="text-sm"><span className="flex items-center gap-2"><input name="tagEnabled" type="checkbox" defaultChecked={params.has('tag')} />태그 이름 정확 일치</span><input name="tag" className={inputClass} defaultValue={params.get('tag') ?? ''} placeholder="태그 이름" /></label>
          <button className={buttonClass}>필터 적용</button><Link href={`/boards/${encodeURIComponent(boardId)}`} className="py-3 text-sm font-semibold text-brand">초기화</Link>
        </form>
        {(data.role === 'OWNER' || data.role === 'EDITOR') && <><button className={`${buttonClass} board-actions`} onClick={() => { setWriteColumn(undefined); writeDialog.current?.showModal(); }}>카드 만들기 / 이동</button><dialog ref={writeDialog} className="board-write-dialog board-design rounded-xl p-6"><div className="flex justify-between"><h2 className="font-semibold">카드 만들기 / 이동</h2><button type="button" onClick={() => writeDialog.current?.close()} aria-label="닫기">✕</button></div><CardWritePanel initialColumn={writeColumn} columns={data.columns} cards={data.cards} members={data.members} refresh={message => { writeDialog.current?.close(); setWriteError(message ?? null); setReload(v => v + 1); }} unauthenticated={() => router.replace('/login')} forbidden={() => { setData(null); setDenied(true); setError('카드를 변경할 권한이 없습니다.'); }} /></dialog></>}
        {data.columns.length === 0 ? <p className="rounded-xl border border-dashed border-line bg-white p-10 text-muted">표시할 컬럼이 없습니다.</p> : <div className="flex gap-[14px] overflow-x-auto pb-6" aria-label="읽기 칸반">
          {data.columns.map((column, index) => { const cards = data.cards.filter(card => card.columnId === column.id); return <section key={column.id} className="min-h-[580px] w-[316px] shrink-0 rounded-xl bg-[#eef1f7] px-[14px] py-[14px]" aria-label={`${column.title} 컬럼`}><header className="mb-[18px] flex items-center gap-2"><span className="h-5 w-[7px] rounded" style={{ background: column.isDone ? '#12836d' : index === 0 ? '#69768c' : '#6958e8' }} aria-hidden="true" /><h2 className="font-semibold">{column.title}</h2><span className="ml-auto min-w-[38px] rounded-full bg-[#e0e5ee] px-2 py-1 text-center text-[11px] text-muted">{cards.length}</span></header>{cards.length === 0 ? <p className="py-8 text-center text-sm text-muted">표시할 카드가 없습니다.</p> : <ul className="space-y-[14px]">{cards.map(card => <li key={card.id} className="min-h-[130px] rounded-[10px] border border-line bg-white p-[13px]"><div className="mb-3 flex flex-wrap gap-2">{card.tagNames?.map(tag => <span key={tag} className="rounded-full bg-brand-light px-[11px] py-[5px] text-[11px] font-semibold text-brand">{tag}</span>)}</div><h3 className="break-words text-sm font-semibold">{card.title}</h3>{card.blocked && <p className="mt-3 text-xs text-muted">선행 작업 대기</p>}{card.warnings.includes('BLOCKED_BY_PREDECESSOR') && <p className="mt-2 text-xs text-amber-800">완료 컬럼의 카드에 미완료 선행 작업이 있습니다.</p>}<div className="mt-5 space-y-1 text-xs text-muted">{card.dueAt && <p>마감 {new Date(card.dueAt).toLocaleDateString('ko-KR')}</p>}{card.assigneeId && <p>◉ {data.members.find(member => member.userId.toLowerCase() === card.assigneeId?.toLowerCase())?.nickname ?? '이름 없는 멤버'}</p>}</div></li>)}</ul>}{(data.role === 'OWNER' || data.role === 'EDITOR') && <button className="mt-12 text-[13px] text-muted" onClick={() => { setWriteColumn(column.id); writeDialog.current?.showModal(); }}>+ 카드 추가</button>}</section>; })}
        </div>}
      </>}
    </main></div>
  </div>;
}
