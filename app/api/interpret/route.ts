import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { generateInteriorSystemPrompt } from '@/constants/interiorContext';
import { IntentSchema, INTENT_SYSTEM_SUFFIX } from '@/constants/interpretIntent';

// Anthropic SDK 는 Node 런타임 필요 (Edge 아님).
export const runtime = 'nodejs';

// 짧은 한국어 발화 → 의도 JSON. 발화마다 호출되므로 빠르고 저렴한 모델 사용.
const MODEL = 'claude-haiku-4-5';

// 은어 사전 + 정산 룰이 포함된 대형 시스템 프롬프트. 고정 문자열이라 1회만 생성하고
// 요청마다 cache_control 로 프롬프트 캐시에 태운다.
const SYSTEM_PROMPT = generateInteriorSystemPrompt() + INTENT_SYSTEM_SUFFIX;

/** 클라이언트가 함께 보내는, 지시어 해석용 현재 상태 */
interface InterpretContext {
  knownSites?: string[];
  unpaidSites?: string[];
  activeTab?: string;
  selectedDate?: string;
  today?: string;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
    client = new Anthropic({ apiKey });
  }
  return client;
}

function buildUserContent(transcript: string, ctx: InterpretContext): string {
  return [
    '[현재 상황]',
    `- 오늘: ${ctx.today ?? '-'}`,
    `- 선택된 날짜: ${ctx.selectedDate ?? '-'}`,
    `- 현재 탭: ${ctx.activeTab ?? '-'}`,
    `- 등록된 현장: ${ctx.knownSites?.length ? ctx.knownSites.join(', ') : '없음'}`,
    `- 미입금 현장: ${ctx.unpaidSites?.length ? ctx.unpaidSites.join(', ') : '없음'}`,
    '',
    '[아버지 음성 원문]',
    `"${transcript}"`,
  ].join('\n');
}

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
  const context: InterpretContext =
    body.context && typeof body.context === 'object' ? (body.context as InterpretContext) : {};

  try {
    const message = await getClient().messages.parse({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: buildUserContent(transcript, context) }],
      output_config: { format: zodOutputFormat(IntentSchema) },
    });

    const intent = message.parsed_output;
    if (!intent) {
      return Response.json(
        { ok: false, error: '모델이 유효한 의도 JSON을 반환하지 않았습니다.' },
        { status: 502 },
      );
    }
    return Response.json({ ok: true, intent });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error('[interpret] Anthropic APIError', err.status, err.message);
      return Response.json({ ok: false, error: `LLM 오류 (${err.status ?? 'network'})` }, { status: 502 });
    }
    console.error('[interpret] unexpected error', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
