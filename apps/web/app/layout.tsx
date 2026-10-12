import type { ReactNode } from 'react';
import './globals.css';
export const metadata = { title: 'Taskify', description: '팀의 일이 명확해지는 공간' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body className="m-0 min-h-screen">{children}</body></html>;
}
