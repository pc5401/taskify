import { Suspense } from 'react';
import { AuthForm } from '../../src/ui/auth-form';
export default function Register() { return <Suspense fallback={<p>불러오는 중…</p>}><AuthForm mode="register" /></Suspense>; }

