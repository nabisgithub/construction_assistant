'use client';
// hooks/useVoiceAssistant.ts
// 음성 인식 → /api/mcp(Claude + MCP Tool Use) → 액션 배열을 UI 에 반영 / 되묻기 오케스트레이션.
// /api/mcp 가 실패(네트워크 순단, API 키 미설정 등)할 때만 로컬 정규식 라우터로 폴백한다.
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { routeLocally } from '@/lib/localVoiceRouter';
import type { ClientSnapshot, PendingQuestion, ToolCallResult } from '@/lib/mcp/interiorTools';
import { speakText, startSpeechRecognition, stopSpeechRecognition } from '@/lib/native/voiceBridge';

const API_TIMEOUT_MS = 20000;

interface McpResponse {
  ok: boolean;
  actions?: ToolCallResult[];
  message?: string | null;
  error?: string;
}

export interface VoiceAssistantOptions {
  /** 요청 시점의 화면 상태 (되묻기 상태는 훅이 붙인다) */
  getContext: () => Omit<ClientSnapshot, 'pendingQuestion'>;
  /** 되묻기를 제외한 도구 결과를 UI 에 반영 */
  onAction: (action: ToolCallResult) => void | Promise<void>;
  notify: (message: string) => void;
}

async function requestAgent(transcript: string, context: ClientSnapshot) {
  const res = await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, context }),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({ ok: false }))) as McpResponse;
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return { actions: data.actions ?? [], message: data.message ?? null };
}

// 모바일 브라우저는 사용자 제스처 안에서 한 번 말을 시켜야 이후 비동기 TTS 가 재생된다.
function unlockWebSpeech() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.resume();
  const dummy = new SpeechSynthesisUtterance('');
  dummy.volume = 0;
  window.speechSynthesis.speak(dummy);
}

export function useVoiceAssistant(options: VoiceAssistantOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingQuestion, setPendingQuestionState] = useState<PendingQuestion | null>(null);

  // 음성 콜백은 비동기로 늦게 도착하므로 항상 최신 옵션·상태를 ref 로 읽는다.
  const optionsRef = useRef(options);
  const pendingRef = useRef<PendingQuestion | null>(null);
  const listeningRef = useRef(false);
  const analyzingRef = useRef(false);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const setPendingQuestion = useCallback((q: PendingQuestion | null) => {
    pendingRef.current = q;
    setPendingQuestionState(q);
  }, []);

  const setListening = useCallback((v: boolean) => {
    listeningRef.current = v;
    setIsListening(v);
  }, []);

  const handleTranscript = useCallback(
    async (transcript: string) => {
      const { getContext, notify } = optionsRef.current;
      notify(`🤖 AI 비서가 분석 중입니다: "${transcript}"`);
      analyzingRef.current = true;
      setIsAnalyzing(true);

      const context: ClientSnapshot = { ...getContext(), pendingQuestion: pendingRef.current };
      let actions: ToolCallResult[];
      let message: string | null;
      try {
        ({ actions, message } = await requestAgent(transcript, context));
      } catch (err) {
        console.warn('[voice] /api/mcp 실패 → 로컬 라우터 폴백', err);
        ({ actions, message } = routeLocally(transcript, context));
      } finally {
        analyzingRef.current = false;
        setIsAnalyzing(false);
      }

      setPendingQuestion(null);
      if (actions.length === 0) {
        const msg = message || '말씀을 이해하지 못했습니다. 다시 말씀해 주세요.';
        notify(msg);
        speakText(msg).catch(console.error);
        return;
      }

      for (const action of actions) {
        if (action.tool === 'ask_follow_up_question') {
          setPendingQuestion({
            questionType: action.questionType,
            ttsMessage: action.ttsMessage,
            draftData: action.draftData,
          });
          speakText(action.ttsMessage).catch(console.error);
          continue;
        }
        try {
          await optionsRef.current.onAction(action);
        } catch (err) {
          console.error('[voice] 액션 반영 실패', action.tool, err);
        }
      }
    },
    [setPendingQuestion],
  );

  /** 마이크 FAB: 듣는 중이면 멈추고, 아니면 음성 인식을 시작한다. */
  const toggleListening = useCallback(async () => {
    if (listeningRef.current) {
      await stopSpeechRecognition();
      setListening(false);
      return;
    }
    if (analyzingRef.current) return;

    unlockWebSpeech();
    await startSpeechRecognition(
      (transcript) => void handleTranscript(transcript),
      (msg) => optionsRef.current.notify(msg),
      setListening,
    );
  }, [handleTranscript, setListening]);

  const cancelQuestion = useCallback(() => setPendingQuestion(null), [setPendingQuestion]);

  return { isListening, isAnalyzing, pendingQuestion, toggleListening, cancelQuestion };
}
