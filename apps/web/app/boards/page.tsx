import { Suspense } from 'react';
import { BoardsScreen } from '../../src/ui/boards-screen';
export default function Boards() { return <Suspense fallback={<p>불러오는 중…</p>}><BoardsScreen /></Suspense>; }

