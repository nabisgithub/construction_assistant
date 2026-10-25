// lib/native/voiceBridge.ts
// 음성인식(STT) · 음성안내(TTS) 브릿지.
// 안드로이드 앱에서는 순정 음성인식/TTS 엔진을, 웹에서는 Web Speech API를 사용한다.
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const LANG = 'ko-KR';

// TS 기본 lib.dom에 없는 Web Speech API 최소 타입.
interface WebSpeechRecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface WebSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}
type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

let webRecognition: WebSpeechRecognition | null = null;

// -------------------------------------------------------------
// [1] 음성인식
// -------------------------------------------------------------
export async function startSpeechRecognition(
  onResult: (transcript: string) => void,
  onError: (msg: string) => void,
  onStateChange: (listening: boolean) => void,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await startNativeRecognition(onResult, onError, onStateChange);
  } else {
    startWebRecognition(onResult, onError, onStateChange);
  }
}

async function startNativeRecognition(
  onResult: (transcript: string) => void,
  onError: (msg: string) => void,
  onStateChange: (listening: boolean) => void,
): Promise<void> {
  try {
    const { available } = await SpeechRecognition.available();
    if (!available) {
      onError('이 기기에서는 음성인식을 사용할 수 없습니다.');
      return;
    }

    let { speechRecognition } = await SpeechRecognition.checkPermissions();
    if (speechRecognition !== 'granted') {
      ({ speechRecognition } = await SpeechRecognition.requestPermissions());
    }
    if (speechRecognition !== 'granted') {
      onError('마이크 권한이 필요합니다. 설정에서 허용해 주세요.');
      return;
    }

    onStateChange(true);
    const { matches } = await SpeechRecognition.start({
      language: LANG,
      maxResults: 1,
      prompt: '현장비서에게 말씀하세요',
      partialResults: false,
      popup: false,
    });
    const transcript = matches?.[0]?.trim();
    if (transcript) onResult(transcript);
    else onError('말씀을 알아듣지 못했습니다. 다시 말씀해 주세요.');
  } catch (err) {
    onError(err instanceof Error ? err.message : '음성인식 중 오류가 발생했습니다.');
  } finally {
    onStateChange(false);
  }
}

function startWebRecognition(
  onResult: (transcript: string) => void,
  onError: (msg: string) => void,
  onStateChange: (listening: boolean) => void,
): void {
  const w = window as unknown as {
    SpeechRecognition?: WebSpeechRecognitionCtor;
    webkitSpeechRecognition?: WebSpeechRecognitionCtor;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    onError('이 브라우저는 음성인식을 지원하지 않습니다. 크롬을 이용해 주세요.');
    return;
  }

  webRecognition?.stop();
  const recognition = new Ctor();
  recognition.lang = LANG;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;
  recognition.onstart = () => onStateChange(true);
  recognition.onend = () => {
    if (webRecognition === recognition) webRecognition = null;
    onStateChange(false);
  };
  recognition.onerror = (event) => {
    if (event.error === 'not-allowed') onError('마이크 권한이 필요합니다. 설정에서 허용해 주세요.');
    else if (event.error === 'no-speech') onError('말씀을 듣지 못했습니다. 다시 말씀해 주세요.');
    else if (event.error !== 'aborted') onError(`음성인식 오류: ${event.error}`);
  };
  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim();
    if (transcript) onResult(transcript);
  };

  webRecognition = recognition;
  recognition.start();
}

export async function stopSpeechRecognition(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await SpeechRecognition.stop().catch(() => {});
  } else {
    webRecognition?.stop();
  }
}

// -------------------------------------------------------------
// [2] 음성안내 (TTS)
// -------------------------------------------------------------
export async function speakText(text: string): Promise<void> {
  if (!text) return;
  if (Capacitor.isNativePlatform()) {
    await TextToSpeech.stop().catch(() => {});
    await TextToSpeech.speak({ text, lang: LANG, rate: 1.0 });
    return;
  }

  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG;
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}
