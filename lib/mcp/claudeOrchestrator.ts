// lib/mcp/claudeOrchestrator.ts
// 음성 발화 → Claude Tool Use → MCP 도구 실행 → 클라이언트 액션 배열.
// MCP 서버는 요청마다 인메모리 트랜스포트로 붙인다: 도구 목록과 실행 모두 MCP 클라이언트를 거친다.
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { generateInteriorAgentSystemPrompt } from '@/constants/interiorContext';
import { CalculateMaterialsInput, MarkShiftPaidInput, RecordShiftInput } from '@/constants/interpretIntent';
import { formatArea, parseAreaText } from '@/lib/region';
import {
  createInteriorMcpServer,
  type ClientSnapshot,
  type PendingQuestion,
  type ToolCallResult,
} from './interiorMcpServer';

// 발화마다 호출되므로 빠르고 저렴한 모델이 기본값. ANTHROPIC_MODEL 로 덮어쓸 수 있다.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

// 은어 사전 + 정산 룰이 포함된 고정 시스템 프롬프트. 1회만 생성해 프롬프트 캐시에 태운다.
const SYSTEM_PROMPT = generateInteriorAgentSystemPrompt();

export interface OrchestratorResult {
  actions: ToolCallResult[];
  message: string | null; // 아버지께 들려드릴 짧은 확인 멘트
  stopReason: Anthropic.Message['stop_reason'];
}

let anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

function buildUserContent(transcript: string, snap: ClientSnapshot): string {
  const lines = [
    '[현재 상황]',
    `- 오늘: ${snap.today ?? '-'}`,
    `- 선택된 날짜: ${snap.selectedDate ?? '-'}`,
    `- 현재 탭: ${snap.activeTab ?? '-'}`,
    `- 등록된 현장: ${snap.knownSites?.length ? snap.knownSites.join(', ') : '없음'}`,
    `- 미입금 현장: ${snap.unpaidSites?.length ? snap.unpaidSites.join(', ') : '없음'}`,
    `- 거주지(시외 기준): ${snap.homeArea ? formatArea(snap.homeArea) : '미설정'}`,
    `- 현장 지역: ${
      snap.siteAreas && Object.keys(snap.siteAreas).length
        ? Object.entries(snap.siteAreas).map(([site, area]) => `${site}=${formatArea(area)}`).join(', ')
        : '없음'
    }`,
  ];
  const pending = snap.pendingQuestion;
  if (pending) {
    lines.push(
      '',
      '[직전 되묻기]',
      `- 유형: ${pending.questionType}`,
      `- 질문: ${pending.ttsMessage ?? '-'}`,
      `- 초안(draftData): ${JSON.stringify(pending.draftData ?? null)}`,
    );
  }
  lines.push('', '[아버지 음성 원문]', `"${transcript}"`);
  return lines.join('\n');
}

/** 도구 입력 스키마의 모든 필드를 null 로 채운 뒤 args 를 덮는다 (nullable 필드도 키는 필수). */
function withNulls(shape: object, args: Record<string, unknown>): Record<string, unknown> {
  return { ...Object.fromEntries(Object.keys(shape).map((k) => [k, null])), ...args };
}

/** 모델이 되묻기 답변을 도구 호출로 잇지 못했을 때, 초안 + 답변으로 원래 도구를 직접 완성한다. */
function fallbackFromPending(
  pending: PendingQuestion,
  transcript: string,
  snap: ClientSnapshot,
): { name: string; args: Record<string, unknown> } | null {
  const draft = pending.draftData ?? {};
  const answer = transcript.replace(/[.,?!]/g, '').trim();
  if (!answer) return null;
  switch (pending.questionType) {
    case 'ASK_SITE_NAME':
      return { name: 'record_shift', args: withNulls(RecordShiftInput, { ...draft, site: answer }) };
    case 'ASK_SITE_AREA': {
      const siteArea = parseAreaText(answer, snap.homeArea ?? null);
      return siteArea ? { name: 'record_shift', args: withNulls(RecordShiftInput, { ...draft, siteArea }) } : null;
    }
    case 'ASK_WHICH_SITE_PAID':
      return { name: 'mark_shift_paid', args: withNulls(MarkShiftPaidInput, { ...draft, site: answer }) };
    case 'ASK_PYEONG': {
      const num = answer.match(/\d+(\.\d+)?/);
      return num
        ? { name: 'calculate_materials', args: withNulls(CalculateMaterialsInput, { ...draft, pyeong: parseFloat(num[0]) }) }
        : null;
    }
  }
}

async function callMcpTool(mcp: Client, name: string, args: Record<string, unknown>): Promise<ToolCallResult | null> {
  const res = await mcp.callTool({ name, arguments: args });
  if (res.isError || !res.structuredContent) {
    console.warn('[mcp] tool error', name, JSON.stringify(res.content));
    return null;
  }
  return res.structuredContent as unknown as ToolCallResult;
}

export async function orchestrate(transcript: string, snapshot: ClientSnapshot): Promise<OrchestratorResult> {
  const server = createInteriorMcpServer(snapshot);
  const mcp = new Client({ name: 'interior-orchestrator', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), mcp.connect(clientTransport)]);

  try {
    const { tools } = await mcp.listTools();
    const anthropicTools: Anthropic.Tool[] = tools.map((t) => {
      const { $schema: _ignored, ...inputSchema } = t.inputSchema as Record<string, unknown>;
      return {
        name: t.name,
        description: t.description ?? t.title ?? t.name,
        input_schema: inputSchema as Anthropic.Tool.InputSchema,
      };
    });

    // 렌더 순서는 tools → system → messages. tools 와 system 은 요청마다 동일하므로
    // system 끝에 캐시 지점을 두면 두 부분 모두 캐시된다. 가변 상황 정보는 user 메시지에만 넣는다.
    const message = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: anthropicTools,
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: buildUserContent(transcript, snapshot) }],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text.trim())
      .filter(Boolean)
      .join(' ');

    if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
      return { actions: [], message: text || null, stopReason: message.stop_reason };
    }

    // 병렬 호출된 도구들을 MCP 로 실행. 결과는 다음 턴으로 돌려보내지 않고 클라이언트 액션으로 반환한다.
    const toolUses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const results = await Promise.all(
      toolUses.map((b) => callMcpTool(mcp, b.name, (b.input ?? {}) as Record<string, unknown>)),
    );
    let actions = results.filter((r): r is ToolCallResult => r !== null);

    if (actions.length === 0 && snapshot.pendingQuestion) {
      const fb = fallbackFromPending(snapshot.pendingQuestion, transcript, snapshot);
      const r = fb ? await callMcpTool(mcp, fb.name, fb.args) : null;
      if (r) actions = [r];
    }

    return { actions, message: text || null, stopReason: message.stop_reason };
  } finally {
    await mcp.close();
    await server.close();
  }
}
