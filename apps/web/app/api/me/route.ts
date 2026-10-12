import { route } from '../../../src/server/runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return route(request, '/me'); }
export async function PATCH(request: Request) { return route(request, '/me'); }

