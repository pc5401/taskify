import { route } from '../../../../../src/server/runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await context.params;
  return route(request, `/boards/${boardId}/members`);
}
