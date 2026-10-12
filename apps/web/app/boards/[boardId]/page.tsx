import { Suspense } from 'react';
import { BoardScreen } from '../../../src/ui/board-screen';
export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  return <Suspense fallback={<p role="status">보드를 불러오는 중…</p>}><BoardScreen boardId={boardId} /></Suspense>;
}
