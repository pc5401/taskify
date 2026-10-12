import { route } from '../../../../src/server/runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) { return route(request, '/auth/register'); }

