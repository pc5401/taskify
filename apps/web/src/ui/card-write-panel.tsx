'use client';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BrowserApiError, createBrowserApi } from '../browser-api';
import type { Card, Column } from '../contract';
import { buttonClass, ErrorMessage, inputClass } from './shared';
const api = createBrowserApi();
export function CardWritePanel({ columns, cards, refresh, unauthenticated, forbidden }: { columns: Column[]; cards: Card[]; refresh: (message?: string) => void; unauthenticated: () => void; forbidden: () => void }) {
  const pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(''), [destination, setDestination] = useState(columns[0]?.id ?? '');
  useEffect(() => () => pending.current?.abort(), []);
  async function submit(event: FormEvent<HTMLFormElement>, kind: 'create' | 'move') {
    event.preventDefault(); if (pending.current) return;
    const form = event.currentTarget, values = new FormData(form), controller = new AbortController();
    pending.current = controller; setBusy(true); setError(null);
    try {
      let notice: string | undefined;
      if (kind === 'create') {
        const due = String(values.get('dueAt') ?? ''), description = String(values.get('description') ?? ''), predecessor = String(values.get('predecessorId') ?? ''), tags = String(values.get('tagNames') ?? '');
        await api.createCard(String(values.get('columnId')), { title: String(values.get('title') ?? ''), ...(description ? { description } : {}), ...(due ? { dueAt: new Date(due).toISOString() } : {}), ...(predecessor ? { predecessorId: predecessor } : {}), ...(tags ? { tagNames: tags.split('\n') } : {}) }, controller.signal);
      } else {
        const card = cards.find(card => card.id === String(values.get('cardId')));
        if (!card) throw new BrowserApiError(422, { code: 'INVALID_INPUT' });
        const result = await api.moveCard(card.id, { toColumnId: String(values.get('toColumnId')), beforeCardId: String(values.get('beforeCardId') ?? '') || null }, `"${card.version}"`, controller.signal);
        if (result.card.version === card.version) notice = '이미 같은 순서입니다. 변경 없이 확인했습니다.';
      }
      if (!controller.signal.aborted) { form.reset(); refresh(notice); }
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure instanceof BrowserApiError) {
        if (failure.status === 401) { unauthenticated(); return; }
        if (failure.status === 403) { forbidden(); return; }
        const code = failure.body?.code;
        const message = code === 'VERSION_CONFLICT' ? '다른 변경이 먼저 저장되었습니다. 최신 목록을 불러왔습니다. 다시 선택해 주세요.' : code === 'WIP_LIMIT_EXCEEDED' ? '목적지 컬럼의 작업 개수 제한을 초과합니다.' : failure.status === 428 ? '카드 버전을 확인하지 못했습니다. 최신 목록에서 다시 시도해 주세요.' : failure.status === 422 ? '입력이나 연결 대상을 확인해 주세요.' : '저장하지 못했습니다. 다시 시도해 주세요.'; setError(message);
        if (failure.status === 409 || failure.status === 428) refresh(message);
      } else setError('저장 결과를 확인하지 못했습니다. 목록을 다시 확인해 주세요.');
    } finally { if (!controller.signal.aborted) { pending.current = null; setBusy(false); } }
  }
  return <section className="my-6 rounded-xl border border-line bg-white p-5" aria-label="카드 생성과 이동"><ErrorMessage message={error} /><div className="grid gap-8 xl:grid-cols-2">
    <form onSubmit={event => void submit(event, 'create')}><fieldset disabled={busy || columns.length === 0} className="space-y-3 disabled:opacity-60"><legend className="mb-3 font-semibold">카드 만들기</legend>
      <label className="block text-sm">컬럼<select name="columnId" className={inputClass}>{columns.map(column => <option value={column.id} key={column.id}>{column.title}</option>)}</select></label>
      <label className="block text-sm">제목<input name="title" required minLength={1} maxLength={120} className={inputClass} /></label>
      <label className="block text-sm">설명<textarea name="description" maxLength={5000} className={inputClass} /></label>
      <label className="block text-sm">마감<input name="dueAt" type="datetime-local" className={inputClass} /></label>
      <label className="block text-sm">선행 카드<select name="predecessorId" className={inputClass}><option value="">없음</option>{cards.map(card => <option value={card.id} key={card.id}>{card.title}</option>)}</select></label>
      <label className="block text-sm">태그 (한 줄에 하나)<textarea name="tagNames" className={inputClass} /></label>
      <p className="text-xs text-muted">선택 목록은 현재 조회한 카드입니다. 담당자 지정은 아직 화면에서 지원하지 않습니다.</p><button className={buttonClass}>{busy ? '저장 중…' : '카드 만들기'}</button>
    </fieldset></form>
    <form onSubmit={event => void submit(event, 'move')}><fieldset disabled={busy || cards.length === 0} className="space-y-3 disabled:opacity-60"><legend className="mb-3 font-semibold">카드 이동</legend>
      <label className="block text-sm">카드<select name="cardId" required value={moving} onChange={event => setMoving(event.target.value)} className={inputClass}><option value="">카드 선택</option>{cards.map(card => <option value={card.id} key={card.id}>{card.title}</option>)}</select></label>
      <label className="block text-sm">목적지 컬럼<select name="toColumnId" value={destination} onChange={event => setDestination(event.target.value)} className={inputClass}>{columns.map(column => <option value={column.id} key={column.id}>{column.title}</option>)}</select></label>
      <label className="block text-sm">삽입 위치<select name="beforeCardId" className={inputClass} key={`${moving}:${destination}`}><option value="">맨 끝</option>{cards.filter(card => card.columnId === destination && card.id !== moving).map(card => <option value={card.id} key={card.id}>{card.title} 앞</option>)}</select></label>
      <p className="text-xs text-muted">같은 컬럼 재배치도 가능합니다. 순서가 같으면 변경 없이 성공합니다.</p><button className={buttonClass}>{busy ? '저장 중…' : '이동 적용'}</button>
    </fieldset></form>
  </div></section>;
}
