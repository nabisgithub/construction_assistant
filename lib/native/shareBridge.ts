// lib/native/shareBridge.ts
// 카카오톡 공유 브릿지. 네이티브 앱/모바일 웹에서는 공유 시트를 띄우고,
// 공유 시트가 없는 데스크톱 등에서는 클립보드로 복사한다.
// 토스트는 UI 몫이므로 결과(message)를 반환해 호출부에서 띄운다.
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export type ShareOutcome =
  | { method: 'share'; ok: true; message: string }
  | { method: 'share'; ok: false; cancelled: true; message: string }
  | { method: 'clipboard'; ok: boolean; message: string };

function canUseWebShare(title: string, text: string): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  return typeof navigator.canShare === 'function' ? navigator.canShare({ title, text }) : true;
}

const isCancel = (err: unknown) =>
  (err instanceof Error && (err.name === 'AbortError' || /cancel/i.test(err.message))) ||
  (typeof err === 'object' && err !== null && 'name' in err && (err as { name: string }).name === 'AbortError');

export async function shareTextContent(title: string, text: string): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform() || canUseWebShare(title, text)) {
    try {
      await Share.share({ title, text, dialogTitle: '카카오톡으로 전송하기' });
      return { method: 'share', ok: true, message: '공유 창을 열었습니다.' };
    } catch (err) {
      if (isCancel(err)) return { method: 'share', ok: false, cancelled: true, message: '공유를 취소했습니다.' };
      // 공유 시트 실패 시 클립보드로 폴백한다.
    }
  }
  return copyToClipboard(text);
}

async function copyToClipboard(text: string): Promise<ShareOutcome> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      legacyCopy(text);
    }
    return { method: 'clipboard', ok: true, message: '📋 복사되었습니다! 카카오톡에 붙여넣기 하세요.' };
  } catch {
    try {
      legacyCopy(text);
      return { method: 'clipboard', ok: true, message: '📋 복사되었습니다! 카카오톡에 붙여넣기 하세요.' };
    } catch {
      return { method: 'clipboard', ok: false, message: '복사에 실패했습니다. 직접 선택해서 복사해 주세요.' };
    }
  }
}

// HTTP(비보안) 컨텍스트 등 Clipboard API가 없는 환경용.
function legacyCopy(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!ok) throw new Error('execCommand copy failed');
}
