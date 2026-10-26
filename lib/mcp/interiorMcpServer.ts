// lib/mcp/interiorMcpServer.ts
// 인테리어 목공 도메인 MCP 서버.
// - Resources: 은어 사전 / 정산·목공 룰 / 클라이언트 상태 스냅샷
// - Tools: Claude 가 호출하는 7개 도구. 실행기는 interiorTools.ts 의 순수 함수.
// 요청마다 클라이언트 스냅샷이 다르므로 createInteriorMcpServer(snapshot) 로 요청 단위 인스턴스를 만든다.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { buildSettlementRulesText, buildSlangDictionaryText } from '@/constants/interiorContext';
import {
  AskFollowUpQuestionInput,
  CalculateMaterialsInput,
  FilterSitePhotosInput,
  MarkShiftPaidInput,
  PrepareKakaoBillInput,
  PrepareMaterialOrderInput,
  RecordShiftInput,
} from '@/constants/interpretIntent';
import {
  runAskFollowUpQuestion,
  runCalculateMaterials,
  runFilterSitePhotos,
  runMarkShiftPaid,
  runPrepareKakaoBill,
  runPrepareMaterialOrder,
  runRecordShift,
  type ClientSnapshot,
  type ToolCallResult,
} from './interiorTools';

export * from './interiorTools';

function toCallToolResult(result: ToolCallResult): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}

// -------------------------------------------------------------
// MCP 서버
// -------------------------------------------------------------
export function createInteriorMcpServer(snapshot: ClientSnapshot): McpServer {
  const server = new McpServer({ name: 'interior-woodworking', version: '1.0.0' });

  // --- Resources ---
  server.registerResource(
    'slang-dictionary',
    'interior://dictionary/slang',
    { title: '현장 은어 사전', description: '가베·덴죠·시다지·다루끼·오야지·데마찌 등 목공 현장 은어', mimeType: 'text/plain' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/plain', text: buildSlangDictionaryText() }] }),
  );
  server.registerResource(
    'settlement-and-woodworking-rules',
    'interior://rules/settlement-and-woodworking',
    { title: '정산·목공 산출 룰', description: '지역 단가, 오야지 가산, 시외 수당, 석고/다루끼 산출 공식, 안전 수칙', mimeType: 'text/plain' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/plain', text: buildSettlementRulesText() }] }),
  );
  server.registerResource(
    'client-snapshot',
    'interior://state/client-snapshot',
    { title: '클라이언트 상태', description: '현재 탭, 선택 날짜, 등록 현장, 미수금 현장, 직전 되묻기', mimeType: 'application/json' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(snapshot) }] }),
  );

  // --- Tools --- (등록 순서 = listTools 순서. 프롬프트 캐시를 위해 순서를 바꾸지 말 것)
  server.registerTool(
    'record_shift',
    {
      title: '공수 등록',
      description: '공수(품)와 식대·메모를 장부에 등록할 초안을 만든다. 현장명이 없으면 ask_follow_up_question(ASK_SITE_NAME)을 대신 호출할 것.',
      inputSchema: RecordShiftInput,
    },
    async (args) => toCallToolResult(runRecordShift(args, snapshot)),
  );
  server.registerTool(
    'mark_shift_paid',
    {
      title: '입금 완료 처리',
      description: '미입금 현장의 공수를 입금 완료로 처리한다. 어느 현장인지 불명확하면 ask_follow_up_question(ASK_WHICH_SITE_PAID).',
      inputSchema: MarkShiftPaidInput,
    },
    async (args) => toCallToolResult(runMarkShiftPaid(args, snapshot)),
  );
  server.registerTool(
    'calculate_materials',
    {
      title: '목공 물량 계산',
      description: '평수·벽면수·용도·상간격·조인보강·석고규격으로 석고보드 장수와 다루끼 단수를 계산하고 물량 탭에 반영한다. 평수가 없으면 ask_follow_up_question(ASK_PYEONG).',
      inputSchema: CalculateMaterialsInput,
    },
    async (args) => toCallToolResult(runCalculateMaterials(args)),
  );
  server.registerTool(
    'prepare_kakao_bill',
    {
      title: '카톡 청구서 준비',
      description: '정산 탭으로 이동해 기간·대상 현장의 청구서 확인/공유 모달을 띄운다.',
      inputSchema: PrepareKakaoBillInput,
    },
    async (args) => toCallToolResult(runPrepareKakaoBill(args)),
  );
  server.registerTool(
    'prepare_material_order',
    {
      title: '자재 발주서 공유',
      description: '현재 산출된 자재 발주서를 카카오톡 공유로 보낸다.',
      inputSchema: PrepareMaterialOrderInput,
    },
    async (args) => toCallToolResult(runPrepareMaterialOrder(args)),
  );
  server.registerTool(
    'filter_site_photos',
    {
      title: '현장 사진 필터',
      description: '사진 탭으로 이동해 현장명과 공간 태그(거실/안방/주방/화장실/베란다/현관/천장)로 사진을 거른다.',
      inputSchema: FilterSitePhotosInput,
    },
    async (args) => toCallToolResult(runFilterSitePhotos(args, snapshot)),
  );
  server.registerTool(
    'ask_follow_up_question',
    {
      title: '되묻기',
      description: '필수 정보(현장명·평수·입금 현장)가 빠졌을 때 아버지께 음성과 모달로 되묻는다.',
      inputSchema: AskFollowUpQuestionInput,
    },
    async (args) => toCallToolResult(runAskFollowUpQuestion(args)),
  );

  return server;
}
