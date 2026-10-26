// components/modals/AskModal.tsx
// 되묻기(Follow-up) 음성 응답 모달
import { Mic } from 'lucide-react';
import type { FollowUpQuestionType } from '@/constants/interpretIntent';
import type { PendingQuestion } from '@/lib/mcp/interiorTools';

const DEFAULT_QUESTIONS: Record<FollowUpQuestionType, string> = {
  ASK_SITE_NAME: '어느 현장에서 일하셨나요?',
  ASK_PYEONG: '시공할 공간이 몇 평인가요?',
  ASK_WHICH_SITE_PAID: '어느 현장 돈이 들어왔나요?',
};

interface AskModalProps {
  question: PendingQuestion;
  isListening: boolean;
  isAnalyzing: boolean;
  onAnswer: () => void;
  onCancel: () => void;
}

export default function AskModal({ question, isListening, isAnalyzing, onAnswer, onCancel }: AskModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#e0f2e9]/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-xl p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center animate-in zoom-in duration-200">
        <div className="w-20 h-20 bg-[#FACC15] border-4 border-black rounded-full flex items-center justify-center mx-auto mb-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Mic className="w-10 h-10 animate-pulse text-black" strokeWidth={3} />
        </div>
        <h3 className="text-2xl font-black mb-3">
          {question.ttsMessage || DEFAULT_QUESTIONS[question.questionType]}
        </h3>
        <p className="text-base font-bold text-gray-500 mb-6">마이크를 누르고 짧게 대답해 주세요.</p>
        <button
          onClick={onAnswer}
          disabled={isAnalyzing}
          className={`w-full py-5 rounded-xl text-xl font-black border-4 border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-4 ${
            isListening ? 'bg-rose-500 text-white' : 'bg-[#3c887e] text-white'
          }`}
        >
          {isListening ? '듣고 있습니다...' : isAnalyzing ? '분석 중입니다...' : '대답하기'}
        </button>
        <button
          onClick={onCancel}
          className="w-full py-4 bg-white border-4 border-black font-black text-lg rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          취소
        </button>
      </div>
    </div>
  );
}
