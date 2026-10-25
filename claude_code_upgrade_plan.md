# 현장비서 PRO (construction_assistant) — Claude Code 고도화 마스터 플랜

> **문서 목적**: 본 문서는 **Claude Code (CLI / IDE 에이전트)**가 `construction_assistant` 레포지토리를 읽고 **① Claude API + LLM-MCP(Model Context Protocol) 기반 지능형 에이전트 전환**, **② 로컬 스토리지 한계 해결(IndexedDB / Native Filesystem)**, **③ Capacitor 방식 A(Vercel Live URL 연동형) 안드로이드 하이브리드 앱 패키징**까지 자율적으로 수행할 수 있도록 작성된 실행 명세서입니다.  
> **프로젝트 루트 적용 방법**: 이 파일을 프로젝트 루트에 `CLAUDE_CODE_UPGRADE_PLAN.md`로 저장하거나 기존 `CLAUDE.md`에 병합한 뒤, Claude Code에 단계별 실행을 지시하세요.

---

## 1. 현재 코드베이스 상태 진단 (As-Is)

Claude Code는 작업 시작 전 아래 파일들의 현재 상태와 문제점을 정확히 인지해야 합니다.

| 파일 경로 | 현재 상태 및 역할 | 해결해야 할 핵심 문제 (Gap) |
| :--- | :--- | :--- |
| `package.json` | Next.js `16.3.4`, React `19.2.8`, Tailwind CSS v4, `@anthropic-ai/sdk` (`^0.124.0`), `zod` (`^4.5.4`), `lucide-react` | `@modelcontextprotocol/sdk`, Capacitor 코어 및 네이티브 플러그인(음성인식, TTS, 카메라, 파일시스템, 공유, Preferences), `idb-keyval`(IndexedDB) 미설치 |
| `app/page.tsx` (1,471 lines) | 공수·물량·사진·정산(일보) 4개 탭 UI와 상태가 단일 파일에 결합됨 | 1. `handleVoiceRouter`(198~374행)가 서버 API를 호출하지 않고 하드코딩된 정규식/`includes` 매칭으로만 동작함<br>2. 고해상도 스탬프 사진 Base64(`dataUrl`)를 `localStorage`(`father_photos_v13`)에 저장하여 10~15장 촬영 시 5MB 쿼터 초과 오류 발생<br>3. `window.webkitSpeechRecognition`만 사용하여 안드로이드 WebView에서 음성인식 권한/동작 불가 |
| `app/api/interpret/route.ts` | `claude-haiku-4-5` + `zodOutputFormat(IntentSchema)` + `cache_control: { type: 'ephemeral' }` 구현됨 | 프론트엔드와 미연결 상태이며, 단순 단일 JSON 파싱에 그쳐 복합 명령(예: "서초 래미안 오늘 오야지로 1공수 찍고 식대 만오천원, 그리고 거기 15평 상가 투피 물량도 계산해줘")이나 도구 연쇄 실행(MCP Tool Use)이 불가능함 |
| `constants/interpretIntent.ts` | 6개 단일 액션(`RECORD_SHIFT`, `MARK_PAID`, `SHARE_BILL`, `CALCULATE_MATERIAL`, `SHARE_MATERIAL`, `FILTER_PHOTOS`) 스키마 | 물량 계산의 `wallCount`(4면 vs 5면), `boardType`(`3x6` vs `4x8`), `hasJoin`(조인 보강), 공수 등록의 `discountAmount`(지인 할인), `client`(거래처/반장님), `date`(어제/특정일) 필드가 누락됨 |
| `constants/interiorContext.ts` | 30년 경력 목수 현장 은어 사전(`INTERIOR_SLANG_DICTIONARY`), 안전 수칙, 시스템 프롬프트 생성 함수 | MCP Resource 및 Tool Description으로 구조화되어 있지 않음 |
| `constants/interiorConfig.ts` | 지역 단가(서울 29만/광주 28만), 오야지(+0.5품), 시외(+1만), 지인할인, 석고/다루끼 산출 계수 | 자재 산출기와 MCP Tool이 공통으로 호출할 순수 계산 함수(Pure Function)가 분리되어 있지 않고 `app/page.tsx` 내부에 인라인 계산식으로 흩어져 있음 |

---

## 2. 목표 아키텍처 (To-Be)

### 2.1 Capacitor 방식 A (Vercel Live Server URL 연동형 하이브리드 앱)
* **온라인 우선(Online-First) 구조**: 안드로이드 앱(`.apk` / `.aab`)은 `capacitor.config.ts`의 `server.url`을 통해 Vercel에 배포된 Next.js 웹 앱을 로드합니다.
* **무중단 배포**: `next.config.ts`에서 정적 내보내기(`output: 'export'`)를 강제하지 않으므로 Next.js App Router의 서버 API(`app/api/mcp/route.ts`, `app/api/interpret/route.ts`)를 그대로 유지하며, Vercel에 `git push`만 하면 APK 재설치 없이 아버님 스마트폰 앱 화면과 AI 로직이 즉시 업데이트됩니다.
* **네이티브 브릿지(Native Bridge) 자동 전환**: `Capacitor.isNativePlatform()` 감지를 통해 안드로이드 앱 내부에서는 **안드로이드 순정 음성인식(`@capacitor-community/speech-recognition`), 네이티브 TTS(`@capacitor-community/text-to-speech`), 기기 파일시스템(`@capacitor/filesystem`), 네이티브 공유 시트(`@capacitor/share`), 영구 환경설정(`@capacitor/preferences`)**을 실행하고, 일반 모바일 웹 브라우저에서는 Web API로 폴백(Fallback)합니다.

### 2.2 Claude API + LLM-MCP (Model Context Protocol) 아키텍처
단순 텍스트 분류기(`IntentSchema`)를 넘어, **MCP 표준 규격(Resources, Tools, Prompts)**을 따르는 인테리어 목공 도메인 서버와 Claude Tool Use 오케스트레이터를 구축합니다.

1. **MCP Resources (도메인 지식 및 현장 컨텍스트 제공)**:
   * `interior://dictionary/slang`: 현장 은어 사전 (`가베`, `덴죠`, `시다지`, `다루끼`, `오야지`, `데마찌` 등)
   * `interior://rules/settlement-and-woodworking`: 지역별 단가, 오야지 가산율, 시외 수당, 석고/다루끼 산출 공식 및 안전 수칙
   * `interior://state/client-snapshot`: 클라이언트에서 전달받은 현재 탭, 선택 날짜, 등록된 현장 목록, 미수금 현장 목록
2. **MCP Tools (Claude가 호출하는 실행 도구 모음)**:
   * `record_shift`: 공수 및 식대·메모 등록 (날짜 상대어 '어제/오늘/그저께' 해석, 지인 할인, 거래처명, 시외·오야지 포함)
   * `mark_shift_paid`: 미입금 현장 입금 완료 처리 (현장명 매칭 및 확인)
   * `calculate_materials`: 평수·벽면수(4면/5면)·용도(가정집 1P/상가 2P)·상간격(300/450)·조인보강·석고규격(3x6/4x8) 기반 정밀 물량 계산 및 결과 반환
   * `prepare_kakao_bill`: 정산 기간(`currentMonth`, `prevMonth`, `allUnpaid`) 및 대상 현장 필터링 후 청구서 생성·공유 모달 호출
   * `prepare_material_order`: 계산된 자재 발주서 생성 및 공유 호출
   * `filter_site_photos`: 현장명 및 공간 태그(`거실`, `안방`, `주방`, `화장실`, `베란다`, `현관`, `천장`)로 사진첩 필터링
   * `ask_follow_up_question`: 필수 정보(현장명, 평수, 입금 대상 현장 등) 누락 시 아버님께 음성(TTS)과 모달로 되묻기 실행
3. **복합 발화(Multi-Action) 처리**:
   * 아버님이 한 번의 음성으로 *"용인 상가 어제 오야지로 한 공수 반 찍어주고 식대 만오천원 적어놔, 그리고 거기 20평 상가 투피로 석고 몇 장 드는지 봐줘"*라고 말씀하시면 Claude가 `record_shift`와 `calculate_materials` 두 개의 MCP Tool을 한 번의 턴에 병렬 호출하여 클라이언트에 액션 배열(`actions: ToolCallResult[]`)로 반환합니다.

---

## 3. 목표 디렉토리 구조

```text
construction_assistant/
├── .mcp.json                          # Claude Code 개발 환경용 MCP 설정
├── capacitor.config.ts                # Capacitor 방식 A (Vercel Live URL 연동) 설정
├── package.json
├── next.config.ts
├── constants/
│   ├── interiorConfig.ts              # 단가, 물량 계산 상수 및 설정
│   ├── interiorContext.ts             # 은어 사전, 목공 안전 수칙, 프롬프트 빌더
│   └── interpretIntent.ts             # Zod 스키마 (확장된 파라미터 및 하위 호환 유지)
├── lib/
│   ├── calculations.ts                # 공수 단가·목공 자재 산출·청구서 텍스트 생성 순수 함수
│   ├── storage/
│   │   ├── shiftStorage.ts            # @capacitor/preferences + localStorage 공수/계좌 영속화
│   │   └── photoStorage.ts            # @capacitor/filesystem + IndexedDB 대용량 사진 저장소
│   ├── native/
│   │   ├── voiceBridge.ts             # 안드로이드 네이티브 STT/TTS ↔ Web Speech API 브릿지
│   │   └── shareBridge.ts             # @capacitor/share 카카오톡 네이티브 공유 ↔ 클립보드 브릿지
│   └── mcp/
│       ├── interiorMcpServer.ts       # @modelcontextprotocol/sdk 기반 인테리어 도메인 MCP 서버/도구 정의
│       └── claudeOrchestrator.ts      # Anthropic SDK + MCP Tools 연동 및 Prompt Caching 실행기
├── hooks/
│   ├── useShifts.ts                   # 공수 장부 상태 및 CRUD 훅
│   ├── usePhotos.ts                   # 스탬프 카메라 촬영 및 비동기 사진 저장소 훅
│   └── useVoiceAssistant.ts           # 음성 인식 → /api/mcp 호출 → UI 상태 변경/되묻기 오케스트레이션 훅
├── components/
│   ├── Header.tsx                     # 상단 네오 브루탈리즘 헤더 & 전체 미수금 배지
│   ├── BottomNav.tsx                  # 하단 탭 네비게이션 & 중앙 마이크 FAB (분석 중 로딩 상태 포함)
│   ├── tabs/
│   │   ├── ShiftTab.tsx               # 탭 1: 공수 달력, 일자별 상세, 공수 등록 폼
│   │   ├── MaterialTab.tsx            # 탭 2: 목공 자재 산출기
│   │   ├── PhotoTab.tsx               # 탭 3: 스탬프 카메라 및 현장/공간 이중 필터
│   │   └── BillingTab.tsx             # 탭 4: 월말 정산 및 청구서 공유
│   └── modals/
│       ├── AskModal.tsx               # 되묻기(Follow-up) 음성 응답 모달
│       └── ConfirmModal.tsx           # 공수 등록 / 청구서 전송 최종 검수 모달
└── app/
    ├── layout.tsx
    ├── globals.css
    ├── manifest.ts                    # 모바일 설치 메타데이터
    ├── page.tsx                       # 모듈화된 컴포넌트와 훅을 조합하는 깔끔한 메인 컨테이너
    └── api/
        ├── interpret/route.ts         # 기존 단일 의도 API (하위 호환 유지 및 확장)
        └── mcp/route.ts               # 신규 Claude + MCP Tool Use 에이전트 엔드포인트
```

---

## 4. 단계별 세부 구현 계획 (Claude Code 실행 지시서)

Claude Code는 아래 **Phase 1부터 Phase 5까지** 순서대로 구현하고, 각 Phase 완료 시 명시된 검증 명령어를 실행하여 에러가 없음을 확인한 뒤 다음 단계로 넘어갑니다.

---

### Phase 1: 도메인 계산 로직 분리 및 MCP 서버/도구 레이어 구축

#### 1.1 패키지 설치
```bash
npm install @modelcontextprotocol/sdk idb-keyval
```

#### 1.2 순수 계산 함수 모듈 분리 (`lib/calculations.ts`)
기존 `app/page.tsx`에 인라인으로 작성되어 있던 계산 로직을 추출하여 프론트엔드 UI와 MCP 서버 도구가 동일한 공식을 공유하도록 만듭니다.
* `calculateShiftPay(params: { region: 'seoul' | 'gwangju'; isLeader: boolean; isOutOfTown: boolean; discountAmount: number; shift: number; expense: number })`: 기본 단가, 오야지 가산(+0.5품), 시외 수당(+10,000원), 지인 할인을 반영한 1공수당 단가(`payPerShift`), 인건비 총액, 식대 포함 최종 합산액을 반환합니다.
* `calculateWoodworkingMaterials(params: { pyeong: number; wallCount: 4 | 5; usageType: 'home1P' | 'store2P'; spacingType: '300' | '450'; hasJoin: boolean; boardType: '3x6' | '4x8' })`: 면적(`m²`), 벽면 계수(4면 `1.0`, 5면 `1.25`), 석고보드 필요 장수(`requiredBoards`), 다루끼 필요 단수(`requiredLumber`), 발주서 텍스트(`orderText`)를 계산해 반환합니다.
* `generateKakaoBillText(params: { shifts: ShiftRecord[]; periodLabel: string; bankAccount: string })`: 현장별 공수 합계, 금액, 선결제 식대 합계(주유비 제외 명시), 총 출역 공수, 총 청구 금액, 입금 계좌가 포맷팅된 카카오톡 청구서 문자열을 반환합니다.

#### 1.3 확장된 의도 및 도구 스키마 정의 (`constants/interpretIntent.ts` & `lib/mcp/interiorMcpServer.ts`)
기존 `constants/interpretIntent.ts`의 누락 필드를 보완하고, `@modelcontextprotocol/sdk` 및 Anthropic `Tool` 규격과 호환되는 도구 세트를 정의합니다.

| MCP Tool 이름 | 입력 스키마 (Zod) 핵심 필드 | 동작 설명 |
| :--- | :--- | :--- |
| `record_shift` | `site`(string, nullable), `date`(YYYY-MM-DD, nullable), `shift`(0.5\|1\|1.5\|2), `region`('seoul'\|'gwangju'), `isLeader`(boolean), `isOutOfTown`(boolean), `discountAmount`(0\|-10000\|-20000\|-30000), `mealExpense`(number), `client`(string, nullable), `memo`(string, nullable) | 공수 기록 초안을 생성하거나 현장명이 없으면 `ask_follow_up_question`(`ASK_SITE_NAME`)을 유도합니다. "어제", "그저께" 같은 상대 날짜는 컨텍스트의 `today`를 기준으로 `YYYY-MM-DD`로 변환합니다. |
| `mark_shift_paid` | `site`(string, nullable) | 미입금 현장 목록(`unpaidSites`)과 대조하여 일치하는 현장을 입금 완료 처리하거나, 불명확할 경우 `ASK_WHICH_SITE_PAID` 되묻기를 트리거합니다. |
| `calculate_materials` | `pyeong`(number, nullable), `wallCount`(4\|5), `usageType`('home1P'\|'store2P'), `spacingType`('300'\|'450'), `hasJoin`(boolean), `boardType`('3x6'\|'4x8') | `lib/calculations.ts`의 `calculateWoodworkingMaterials`를 실행해 계산된 석고 장수·다루끼 단수와 UI 상태 업데이트 페이로드를 반환합니다. 평수가 누락된 경우 `ASK_PYEONG` 되묻기를 트리거합니다. |
| `prepare_kakao_bill` | `period`('currentMonth'\|'prevMonth'\|'allUnpaid'), `targetSites`(string[], nullable) | 정산 탭으로 이동시키고 해당 기간 및 현장의 청구서 확인/공유 모달을 띄웁니다. |
| `prepare_material_order` | `site`(string, nullable) | 현재 산출된 자재 발주서를 즉시 카카오톡 공유 브릿지로 전달합니다. |
| `filter_site_photos` | `site`(string, nullable), `room`(string, nullable) | 사진 탭으로 이동시키고 현장명 및 공간 태그(`거실`, `안방`, `주방`, `화장실`, `베란다`, `현관`, `천장`) 필터를 적용합니다. |
| `ask_follow_up_question` | `questionType`('ASK_SITE_NAME'\|'ASK_PYEONG'\|'ASK_WHICH_SITE_PAID'), `ttsMessage`(string), `draftData`(object, nullable) | 아버님께 음성(TTS)으로 되묻고 화면에 되묻기 모달을 표시합니다. |

#### 1.4 Claude + MCP 오케스트레이터 구현 (`lib/mcp/claudeOrchestrator.ts` & `app/api/mcp/route.ts`)
* 모델은 빠른 응답 속도와 한국어 은어 해석 및 Tool Use 가성비가 뛰어난 `claude-haiku-4-5`를 기본값으로 사용하되, 환경변수(`ANTHROPIC_MODEL`)로 오버라이드 가능하게 작성합니다.
* `system` 프롬프트에는 `INTERIOR_SLANG_DICTIONARY`와 `WOODWORKING_FIELD_RULES`, `INTERIOR_CONFIG` 정산 룰을 포함하고 `cache_control: { type: 'ephemeral' }`을 설정하여 매 음성 호출 시 토큰 비용과 지연 시간(Latency)을 최소화합니다.
* 대화 맥락 유지: 클라이언트가 직전 `pendingQuestion` 상태(예: 앱이 "어느 현장에서 일하셨나요?"라고 물은 직후 아버님이 "방배동"이라고만 답한 상태)를 함께 보내면, 오케스트레이터가 이전 `draft`와 새 발화를 결합하여 완성된 `record_shift` 도구 호출을 생성합니다.
* **검증 명령어**: `npx tsc --noEmit` 실행 시 타입 오류가 0건이어야 합니다.

---

### Phase 2: 스토리지 고도화 (사진 5MB 한계 해결 및 장부 영속화)

#### 2.1 대용량 현장 사진 저장소 구현 (`lib/storage/photoStorage.ts`)
기존 `localStorage.setItem('father_photos_v13', ...)` 방식을 완전히 대체합니다.
1. **이미지 압축 및 스탬프 최적화**:
   * 카메라 촬영 원본 이미지가 4000px 이상일 경우, Canvas 렌더링 시 가로 최대 `1600px` 비율로 리사이징하고 JPEG 품질 `0.82`를 적용하여 장당 용량을 150~300KB 수준으로 최적화합니다(글자 스탬프 가독성은 선명하게 유지).
2. **하이브리드 영구 저장**:
   * **Capacitor 안드로이드 네이티브 환경**: `@capacitor/filesystem`을 사용해 앱 전용 데이터 폴더(`Directory.Data`)에 JPEG 파일을 저장하고, 메타데이터(`id`, `filePath`, `timestamp`, `site`, `room`)만 저장합니다.
   * **웹 브라우저 환경**: `idb-keyval` (IndexedDB)에 사진 배열을 저장하여 `localStorage`의 5MB 제한을 우회합니다.
3. **기존 데이터 자동 마이그레이션**:
   * 앱 최초 실행 시 `localStorage.getItem('father_photos_v13')`에 기존 사진 데이터가 남아 있다면 새 저장소(IndexedDB / Filesystem)로 자동 이전한 뒤 `localStorage` 키를 정리하여 기존 사진이 유실되지 않도록 보장합니다.

#### 2.2 공수 장부 및 계좌 정보 저장소 구현 (`lib/storage/shiftStorage.ts`)
* `@capacitor/preferences`와 `localStorage`를 동기화하여 안드로이드 시스템이 웹뷰 캐시를 정리하더라도 공수 장부(`father_shifts_v13`)와 입금 계좌 번호(`father_bank_account`)가 안전하게 보존되도록 구현합니다.
* **검증 명령어**: `npx tsc --noEmit` 통과 확인.

---

### Phase 3: 안드로이드 네이티브 브릿지 구현 (음성인식·TTS·카카오톡 공유)

#### 3.1 Capacitor 필수 패키지 설치
```bash
npm install @capacitor/core @capacitor/preferences @capacitor/filesystem @capacitor/share @capacitor/camera @capacitor-community/speech-recognition @capacitor-community/text-to-speech
npm install -D @capacitor/cli @capacitor/android
```

#### 3.2 하이브리드 음성인식 및 TTS 브릿지 (`lib/native/voiceBridge.ts`)
안드로이드 WebView에서 `webkitSpeechRecognition`이 동작하지 않는 문제를 해결하는 핵심 모듈입니다.
* `startSpeechRecognition(onResult: (transcript: string) => void, onError: (msg: string) => void, onStateChange: (listening: boolean) => void)`:
  * `Capacitor.isNativePlatform() === true`일 때:
    1. `SpeechRecognition.checkPermissions()`로 마이크 권한을 확인하고, 미허용 시 `SpeechRecognition.requestPermissions()`를 호출합니다.
    2. `SpeechRecognition.start({ language: 'ko-KR', maxResults: 1, prompt: '현장비서에게 말씀하세요', partialResults: false, popup: false })`를 실행해 안드로이드 기본 음성인식 엔진으로 텍스트를 추출합니다.
  * `Capacitor.isNativePlatform() === false`일 때:
    1. 기존 `window.SpeechRecognition || window.webkitSpeechRecognition`을 그대로 실행합니다.
* `speakText(text: string)`:
  * 네이티브 환경에서는 `@capacitor-community/text-to-speech`의 `TextToSpeech.speak({ text, lang: 'ko-KR', rate: 1.0 })`를 호출하고, 웹 환경에서는 `window.speechSynthesis`를 호출합니다.

#### 3.3 카카오톡 네이티브 공유 브릿지 (`lib/native/shareBridge.ts`)
* `shareTextContent(title: string, text: string)`:
  * 네이티브 환경(`Capacitor.isNativePlatform()`) 또는 모바일 웹(`navigator.canShare`)에서는 `Share.share({ title, text, dialogTitle: '카카오톡으로 전송하기' })`를 호출하여 아버님이 복사·붙여넣기할 필요 없이 바로 카카오톡 대화방을 선택해 발주서나 청구서를 보낼 수 있게 합니다.
  * 데스크톱 등 공유 시트를 지원하지 않는 환경에서는 기존처럼 `navigator.clipboard.writeText(text)`로 복사 후 토스트 알림을 띄웁니다.

---

### Phase 4: 프론트엔드 모듈화 및 AI 음성 에이전트 연동 (`app/page.tsx` 리팩토링)

1,471줄의 `app/page.tsx`를 역할별 커스텀 훅과 탭 컴포넌트로 분리하면서 기존 **네오 브루탈리즘(Neo-Brutalism) 디자인과 큰 글씨·높은 대비 UI는 100% 동일하게 유지**합니다.

#### 4.1 AI 음성 에이전트 훅 (`hooks/useVoiceAssistant.ts`)
1. 사용자가 하단 중앙 마이크 FAB 버튼을 누르면 `voiceBridge.ts`를 통해 음성을 텍스트(`transcript`)로 변환합니다.
2. 변환 즉시 상단 토스트에 `🤖 AI 비서가 분석 중입니다: "${transcript}"` 상태를 표시하고 `/api/mcp` 엔드포인트에 아래 페이로드를 POST 요청합니다:
   ```json
   {
     "transcript": "방배동 오늘 오야지로 한 공수 반 찍고 참값 만오천원",
     "context": {
       "today": "2026-10-25",
       "selectedDate": "2026-10-25",
       "activeTab": "공수",
       "knownSites": ["서초 래미안", "용인 상가"],
       "unpaidSites": ["용인 상가"],
       "pendingQuestion": null
     }
   }
   ```
3. 서버가 반환한 MCP Tool 실행 결과(`actions`)를 순회하며 UI 상태를 자동 업데이트합니다:
   * `record_shift`: 공수 탭으로 이동 → 폼 필드(`formSite`, `formShift`, `formRegion`, `isLeader`, `isOutOfTown`, `discountAmount`, `formExpense`, `formMemo`) 자동 입력 → 최종 검수 모달(`ConfirmModal`) 자동 오픈.
   * `mark_shift_paid`: 해당 현장 미입금 건을 입금 완료로 전환 + 완료 토스트 및 음성 안내.
   * `calculate_materials`: 물량 탭으로 이동 → 평수·벽면수·용도·상간격·조인보강·석고규격 자동 세팅 → 산출 결과 즉시 표시.
   * `prepare_kakao_bill`: 정산(일보) 탭으로 이동 → 기간 및 현장 체크 상태 세팅 → 청구서 검수/공유 모달 오픈.
   * `prepare_material_order`: 물량 탭으로 이동 → `shareBridge.ts`를 통해 자재 발주서 공유 시트 호출.
   * `filter_site_photos`: 사진 탭으로 이동 → 현장 및 공간 필터 자동 적용.
   * `ask_follow_up_question`: `speakText(ttsMessage)`로 음성 질문 출력 + 되묻기 모달(`AskModal`) 표시.
4. **오프라인/비상 폴백(Fallback)**: 만약 네트워크 순단이나 API 키 미설정 등으로 `/api/mcp` 응답이 실패할 경우에만 기존 로컬 정규식 라우터 로직이 백업으로 실행되어 현장에서 업무가 멈추지 않도록 보호합니다.

---

### Phase 5: Capacitor 방식 A (Vercel Live URL) 설정 및 안드로이드 프로젝트 생성

#### 5.1 `capacitor.config.ts` 작성
방식 A(Vercel 서버 연동형)에 맞춰 아래와 같이 프로젝트 루트에 `capacitor.config.ts`를 생성합니다.

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://construction-assistant.vercel.app';

const config: CapacitorConfig = {
  appId: 'kr.co.carpenter.assistant',
  appName: '현장비서 PRO',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['*.vercel.app'],
  },
  plugins: {
    SpeechRecognition: {
      language: 'ko-KR',
    },
  },
};

export default config;
```
*(주의: 로컬 개발 테스트 시에는 `.env.local`에 `CAPACITOR_SERVER_URL=http://10.0.2.2:3000` 또는 로컬 IP를 지정하고, 실제 아버님 스마트폰 설치용 APK 빌드 시에는 배포된 Vercel 도메인 주소를 넣습니다.)*

#### 5.2 안드로이드 플랫폼 초기화 및 권한 설정 (`AndroidManifest.xml`)
1. `npx cap add android`를 실행하여 `android/` 네이티브 프로젝트를 생성합니다.
2. `android/app/src/main/AndroidManifest.xml`의 `<manifest>` 태그 하단에 아래 필수 권한과 음성인식 서비스 쿼리를 추가합니다(안드로이드 11 이상에서 음성인식 엔진 호출 시 `<queries>` 태그가 없으면 음성인식이 실패하므로 필수입니다):
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />

   <queries>
     <intent>
       <action android:name="android.speech.RecognitionService" />
     </intent>
   </queries>
   ```
3. `package.json`의 `scripts`에 안드로이드 빌드 단축 명령어를 추가합니다:
   ```json
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
     "lint": "eslint",
     "cap:sync": "npx cap sync android",
     "cap:open": "npx cap open android"
   }
   ```

---

## 5. Claude Code 개발 환경용 `.mcp.json` 설정 (선택 사항)

Claude Code CLI/IDE 자체가 이 프로젝트를 수정하고 테스트할 때 활용할 수 있도록 프로젝트 루트에 `.mcp.json`을 구성할 수 있습니다.

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    }
  }
}
```

---

## 6. 완료 기준 (Definition of Done) 및 검증 체크리스트

Claude Code는 모든 구현을 마친 뒤 아래 체크리스트를 순서대로 검증하고 결과를 보고해야 합니다.

- [ ] **타입 및 빌드 검증**: `npx tsc --noEmit` 및 `npm run build` 실행 시 에러 없이 빌드 성공
- [ ] **MCP 에이전트 API 검증**: `/api/mcp` 엔드포인트가 현장 은어(`가베`, `덴죠`, `시다지`, `오야지`, `투피`, `다루끼` 등)가 섞인 발화를 받아 정확한 MCP Tool 호출 결과(`record_shift`, `calculate_materials`, `mark_shift_paid`, `prepare_kakao_bill`, `filter_site_photos`, `ask_follow_up_question`)를 반환하는지 확인
- [ ] **되묻기(Multi-turn) 컨텍스트 검증**: 현장명 없이 *"오늘 오야지로 1공수 추가해줘"* 발화 시 `ASK_SITE_NAME` 되묻기가 동작하고, 이어서 *"서초 래미안"*이라고만 답했을 때 이전 초안 데이터(오야지, 1공수)가 유실되지 않고 합쳐져 검수 모달이 뜨는지 확인
- [ ] **사진 저장소 용량 검증**: `localStorage` 대신 IndexedDB / Capacitor Filesystem으로 사진이 저장되며, 기존 `father_photos_v13` 데이터가 자동 마이그레이션되는지 확인
- [ ] **Capacitor 안드로이드 동기화 검증**: `npm run cap:sync` 실행 시 플러그인(`speech-recognition`, `text-to-speech`, `filesystem`, `share`, `preferences`, `camera`)이 `android/` 프로젝트에 정상 등록되는지 확인

---

## 7. Claude Code 실행용 프롬프트 가이드

프로젝트 루트에 이 파일을 두고 Claude Code 터미널에서 아래 명령어를 순서대로 입력하면 단계별로 안전하게 고도화를 진행할 수 있습니다:

* **전체 일괄 진행 시**:
  > `@CLAUDE_CODE_UPGRADE_PLAN.md 문서를 읽고 Phase 1부터 Phase 5까지 순서대로 구현해줘. 각 Phase가 끝날 때마다 npx tsc --noEmit으로 타입 에러를 검증하고 다음 Phase로 넘어가줘.`
* **단계별 검수하며 진행 시**:
  > `@CLAUDE_CODE_UPGRADE_PLAN.md의 Phase 1(도메인 계산 로직 분리 및 Claude API + MCP Tool 레이어 구축)만 먼저 구현하고 빌드 테스트 결과를 알려줘.`
