import { route } from '../../../../../src/server/runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ columnId: string }> }) {
  const { columnId } = await context.params;
  return route(request, `/columns/${columnId}/cards`);
}
