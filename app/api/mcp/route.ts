import Anthropic from '@anthropic-ai/sdk';
import { orchestrate } from '@/lib/mcp/claudeOrchestrator';
import type { ClientSnapshot } from '@/lib/mcp/interiorMcpServer';

// Anthropic SDK · MCP SDK 는 Node 런타임 필요 (Edge 아님).
export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { transcript?: unknown; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON 본문을 파싱할 수 없습니다.' }, { status: 400 });
  }

  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
  if (!transcript) {
    return Response.json({ ok: false, error: 'transcript 가 필요합니다.' }, { status: 400 });
  }
  const context: ClientSnapshot =
    body.context && typeof body.context === 'object' ? (body.context as ClientSnapshot) : {};

  try {
    const result = await orchestrate(transcript, context);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error('[mcp] Anthropic APIError', err.status, err.message);
      return Response.json({ ok: false, error: `LLM 오류 (${err.status ?? 'network'})` }, { status: 502 });
    }
    console.error('[mcp] unexpected error', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
