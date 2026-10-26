import type { CapacitorConfig } from '@capacitor/cli';

// 방식 A: 앱은 Vercel 에 배포된 Next.js 를 그대로 로드한다(서버 API 유지, git push 만으로 앱 갱신).
// 로컬 테스트 시 .env.local 등에 CAPACITOR_SERVER_URL=http://10.0.2.2:3000 (에뮬레이터) 또는 PC 의 로컬 IP 지정.
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://construction-assistant-ecru.vercel.app';

const config: CapacitorConfig = {
  appId: 'kr.co.carpenter.assistant',
  appName: '현장비서 PRO',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
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
