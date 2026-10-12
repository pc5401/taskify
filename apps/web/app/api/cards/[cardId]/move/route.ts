import { route } from '../../../../../src/server/runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await context.params;
  return route(request, `/cards/${cardId}/move`);
}
