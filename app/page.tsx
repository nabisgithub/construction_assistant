'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, Calculator, FileText, Camera, Plus, Trash2, 
  Share2, CheckCircle2, Download, Check, X, ChevronLeft, ChevronRight, Mic, 
  AlertCircle, ShieldCheck, MapPin, Coffee, Filter, CheckSquare
} from 'lucide-react';
import { INTERIOR_CONFIG } from '@/constants/interiorConfig';

interface ShiftRecord {
  id: string;
  date: string;
  site: string;
  client: string;
  shift: number;
  payPerShift: number;
  expense: number;
  isOutOfTown: boolean;
  isPaid: boolean;
  memo?: string; // ⭐ 메모 필드 추가
}

interface SitePhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
  site: string;
  room: string;
}

type PendingQuestion = 
  | { type: 'ASK_SITE_NAME'; draft: Partial<ShiftRecord> }
  | { type: 'ASK_PYEONG'; draft: { usage: 'home1P' | 'store2P'; spacing: '300' | '450' } }
  | { type: 'ASK_WHICH_SITE_PAID' }
  | null;

export default function ConstructionApp() {
  const [tab, setTab] = useState<'공수' | '물량' | '사진' | '일보'>('공수');
  const [isListening, setIsListening] = useState(false);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion>(null);
  const recognitionRef = useRef<any>(null);

  // -------------------------------------------------------------
  // 1. 공수 관리 데이터 & 상태
  // -------------------------------------------------------------
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [siteFilter, setSiteFilter] = useState<string>('전체');

  const todayObj = new Date();
  const [currentYear, setCurrentYear] = useState<number>(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayObj.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(todayObj.toISOString().split('T')[0]);

  const [formDate, setFormDate] = useState<string>('');
  const [formSite, setFormSite] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formShift, setFormShift] = useState<number>(1.0);
  const [formRegion, setFormRegion] = useState<'seoul' | 'gwangju'>('seoul');
  const [isLeader, setIsLeader] = useState(false);
  const [isOutOfTown, setIsOutOfTown] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [formExpense, setFormExpense] = useState<string>('');
  const [formMemo, setFormMemo] = useState<string>(''); // ⭐ 메모 상태 추가

  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    items: { label: string; value: string }[];
    onConfirm: () => void;
  } | null>(null);

  const basePay = INTERIOR_CONFIG.rates.regions[formRegion].pay;
  const calculatedPay = 
    basePay + 
    (isLeader ? basePay * INTERIOR_CONFIG.rates.leaderBonusMultiplier : 0) + 
    (isOutOfTown ? INTERIOR_CONFIG.rates.outOfTownSurcharge : 0) + 
    discountAmount;

  // -------------------------------------------------------------
  // 2. 목공 물량 계산 & 사진 상태
  // -------------------------------------------------------------
  const [areaPyeong, setAreaPyeong] = useState<string>('15');
  const [wallCount, setWallCount] = useState<4 | 5>(4);
  const [usageType, setUsageType] = useState<'home1P' | 'store2P'>('home1P');
  const [spacingType, setSpacingType] = useState<'300' | '450'>('300');
  const [hasJoin, setHasJoin] = useState(false);
  const [boardType, setBoardType] = useState<'3x6' | '4x8'>('3x6');
  const [orderCopied, setOrderCopied] = useState(false);

  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [photoSiteName, setPhotoSiteName] = useState('');
  const [photoRoomTag, setPhotoRoomTag] = useState('거실');
  
  const [selectedPhotoSiteFilter, setSelectedPhotoSiteFilter] = useState('전체');
  const [selectedPhotoRoomFilter, setSelectedPhotoRoomFilter] = useState('전체');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // -------------------------------------------------------------
  // 3. 정산 (일보) 관련 상태
  // -------------------------------------------------------------
  const [bankAccount, setBankAccount] = useState<string>('국민 123-456-78901 홍길동');
  const [billingPeriod, setBillingPeriod] = useState<'currentMonth' | 'prevMonth' | 'allUnpaid'>('currentMonth');
  const [uncheckedBillingSites, setUncheckedBillingSites] = useState<string[]>([]);

  useEffect(() => {
    setUncheckedBillingSites([]);
  }, [billingPeriod]);

  useEffect(() => {
    setFormDate(new Date().toISOString().split('T')[0]);

    const savedShifts = localStorage.getItem('father_shifts_v13');
    if (savedShifts) {
      try { setShifts(JSON.parse(savedShifts)); } catch (e) { console.error(e); }
    } else {
      const y = todayObj.getFullYear();
      const m = String(todayObj.getMonth() + 1).padStart(2, '0');
      setShifts([
        { id: '1', date: `${y}-${m}-01`, site: '서초 래미안', client: '김반장', shift: 1.0, payPerShift: 290000, expense: 12000, isOutOfTown: false, isPaid: true, memo: '거실 천장 다루끼 상 작업' },
        { id: '2', date: `${y}-${m}-02`, site: '용인 상가', client: '아버지(오야지)', shift: 0.5, payPerShift: 445000, expense: 15000, isOutOfTown: true, isPaid: false },
      ]);
    }

    const savedPhotos = localStorage.getItem('father_photos_v13');
    if (savedPhotos) {
      try { setPhotos(JSON.parse(savedPhotos)); } catch (e) { console.error(e); }
    }
  }, []);

  const saveShifts = (newShifts: ShiftRecord[]) => {
    setShifts(newShifts);
    localStorage.setItem('father_shifts_v13', JSON.stringify(newShifts));
  };

  const showToast = (msg: string) => {
    setVoiceToast(msg);
    setTimeout(() => setVoiceToast(null), 3500);
  };

  // -------------------------------------------------------------
  // ⭐ 음성 인식 및 지능형 라우터 ⭐
  // -------------------------------------------------------------
  const handleVoiceFAB = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
      const dummy = new SpeechSynthesisUtterance('');
      dummy.volume = 0;
      window.speechSynthesis.speak(dummy);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('음성 인식을 지원하지 않는 브라우저입니다.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error !== 'no-speech') {
        showToast('음성을 다시 말씀해 주세요.');
      }
    };

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      showToast(`인식: "${transcript}"`);
      handleVoiceRouter(transcript);
    };

    recognition.start();
  };

  const askQuestionUI = (questionText: string, type: PendingQuestion) => {
    setPendingQuestion(type);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(questionText);
      utterance.lang = 'ko-KR';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceRouter = (text: string) => {
    if (pendingQuestion) {
      if (pendingQuestion.type === 'ASK_SITE_NAME') {
        const siteClean = text.replace(/현장|이야|입니다|에서|으로/g, '').trim();
        const site = siteClean ? siteClean + ' 현장' : text;
        const draft = pendingQuestion.draft;

        setFormSite(site);
        if (draft.shift) setFormShift(draft.shift);
        if (draft.isOutOfTown) setIsOutOfTown(draft.isOutOfTown);
        if (draft.expense) setFormExpense(draft.expense.toString());
        if (draft.memo) setFormMemo(draft.memo); // 메모 넘겨받기
        setPendingQuestion(null);

        showToast(`📍 [${site}] 현장으로 인식했습니다.`);
        setTimeout(() => triggerSaveConfirm(), 500);
        return;
      }
      
      // (물량, 입금 등 다른 질문에 대한 처리는 생략 없이 그대로 유지)
      if (pendingQuestion.type === 'ASK_PYEONG') {
        const match = text.match(/(\d+)/);
        if (match) {
          setAreaPyeong(match[1]);
          setUsageType(pendingQuestion.draft.usage);
          setSpacingType(pendingQuestion.draft.spacing);
          setTab('물량');
          setPendingQuestion(null);
          showToast(`📐 ${match[1]}평 기준으로 목공 물량을 산출했습니다.`);
        } else {
          showToast('숫자(평수)를 인식하지 못했습니다.');
        }
        return;
      }

      if (pendingQuestion.type === 'ASK_WHICH_SITE_PAID') {
        const matched = shifts.find(s => !s.isPaid && text.includes(s.site.replace(' 현장', '')));
        if (matched) {
          saveShifts(shifts.map(s => s.id === matched.id ? { ...s, isPaid: true } : s));
          setPendingQuestion(null);
          showToast(`✅ [${matched.site}] 입금 처리되었습니다!`);
        } else {
          showToast('일치하는 현장을 찾지 못했습니다.');
          setPendingQuestion(null);
        }
        return;
      }
    }

    if (text.includes('입금') || text.includes('돈 들어') || text.includes('결제됐') || text.includes('수금')) {
      setTab('공수');
      const unpaidList = shifts.filter(s => !s.isPaid);

      if (unpaidList.length === 0) {
        showToast('현재 미입금 현장이 없습니다.');
        return;
      }

      const matched = unpaidList.find(s => text.includes(s.site.replace(' 현장', '')));
      if (matched) {
        saveShifts(shifts.map(s => s.id === matched.id ? { ...s, isPaid: true } : s));
        showToast(`✅ [${matched.site}] 입금 완료 처리되었습니다!`);
      } else {
        askQuestionUI('어느 현장 돈이 들어왔나요?', { type: 'ASK_WHICH_SITE_PAID' });
      }
      return;
    }

    if (text.includes('청구서') || text.includes('정산') || text.includes('월말') || text.includes('미수금')) {
      setTab('일보');
      
      let detectedPeriod: 'currentMonth' | 'prevMonth' | 'allUnpaid' = 'currentMonth';
      if (text.includes('전체') || text.includes('미수금')) detectedPeriod = 'allUnpaid';
      else if (text.includes('저번') || text.includes('지난')) detectedPeriod = 'prevMonth';
      
      setBillingPeriod(detectedPeriod);
      setTimeout(() => triggerBillConfirm(detectedPeriod), 300);
      return;
    }

    if (text.includes('석고') || text.includes('다루끼') || text.includes('자재') || text.includes('물량') || text.includes('몇 장')) {
      const pyeongMatch = text.match(/(\d+)\s*평/);
      const isStore = text.includes('뻬인트') || text.includes('빼인트') || text.includes('페인트') || text.includes('상가') || text.includes('투피');
      const isHome = text.includes('가정집') || text.includes('도배') || text.includes('원피');

      const resolvedUsage = isStore ? 'store2P' : (isHome ? 'home1P' : usageType);
      const resolvedSpacing = isStore ? '450' : (isHome ? '300' : spacingType);

      if (!pyeongMatch) {
        askQuestionUI('시공할 공간이 몇 평인가요?', { 
          type: 'ASK_PYEONG', draft: { usage: resolvedUsage, spacing: resolvedSpacing } 
        });
        return;
      }

      setTab('물량');
      setAreaPyeong(pyeongMatch[1]);
      setUsageType(resolvedUsage);
      setSpacingType(resolvedSpacing);
      if (text.includes('조인')) setHasJoin(true);
      showToast(`📐 ${pyeongMatch[1]}평 물량 계산 완료.`);
      return;
    }

    if (text.includes('발주서') || text.includes('자재 보내')) {
      setTab('물량');
      copyMaterialOrder();
      return;
    }

    if (text.includes('사진') && (text.includes('보여') || text.includes('필터'))) {
      setTab('사진');
      const foundRoom = INTERIOR_CONFIG.roomTags.find(r => r !== '전체' && text.includes(r));
      if (foundRoom) {
        setSelectedPhotoRoomFilter(foundRoom);
        showToast(`📷 [${foundRoom}] 사진 필터링`);
      } else {
        setSelectedPhotoRoomFilter('전체');
        showToast('📷 전체 사진 목록입니다.');
      }
      return;
    }

    setTab('공수');

    let detectedShift = 1.0;
    if (text.includes('반공수') || text.includes('0.5')) detectedShift = 0.5;
    else if (text.includes('야간') || text.includes('1.5')) detectedShift = 1.5;
    else if (text.includes('이공') || text.includes('2공') || text.includes('이틀')) detectedShift = 2.0;

    let detectedOutOfTown = false;
    if (text.includes('시외') || text.includes('용인') || text.includes('이천') || text.includes('평택')) {
      detectedOutOfTown = true;
      setIsOutOfTown(true);
    }

    if (text.includes('오야지') || text.includes('내가 팀장') || text.includes('내가 반장')) {
      setIsLeader(true);
      setFormClient('아버지(오야지)');
    }

    let detectedExpense = 0;
    if (text.includes('식대') || text.includes('밥값') || text.includes('참값')) {
      const numMatch = text.match(/(\d+)\s*만/);
      if (numMatch) detectedExpense = parseInt(numMatch[1], 10) * 10000;
      else if (text.includes('만오천')) detectedExpense = 15000;
      else if (text.includes('만원')) detectedExpense = 10000;
      setFormExpense(detectedExpense.toString());
    }

    // ⭐ 음성에서 남은 텍스트를 메모로 추출하는 로직
    const siteMatch = text.match(/([가-힣A-Za-z0-9]+)\s*(에서|현장|아파트|빌라|상가|오피스텔)/);
    
    let parsedMemo = text;
    if (siteMatch) parsedMemo = parsedMemo.replace(siteMatch[0], '');
    
    // 식별된 명령어 단어들 싹 지우기
    parsedMemo = parsedMemo.replace(/(반공수|0\.5공수?|0\.5|야간|1\.5공수?|1\.5|이공|2공|이틀|1공수?|일공|시외|용인|이천|평택|오야지|내가 팀장|내가 반장)/g, '');
    parsedMemo = parsedMemo.replace(/(\d+)\s*만\s*(식대|밥값|참값)?|(만오천|만원)|(식대|밥값|참값)/g, '');
    parsedMemo = parsedMemo.replace(/공수|현장|추가|적어|등록/g, '').trim();
    parsedMemo = parsedMemo.replace(/\s{2,}/g, ' '); // 다중 공백 하나로

    const finalMemo = parsedMemo.length > 1 ? parsedMemo : '';

    if (siteMatch) {
      const site = siteMatch[1] + ' ' + (siteMatch[2] === '에서' ? '현장' : siteMatch[2]);
      setFormSite(site);
      setFormShift(detectedShift);
      setFormMemo(finalMemo);
      showToast(`📝 [${site}] 공수 폼이 채워졌습니다.`);
    } else {
      askQuestionUI('어느 현장에서 일하셨나요?', {
        type: 'ASK_SITE_NAME',
        draft: { shift: detectedShift, isOutOfTown: detectedOutOfTown, expense: detectedExpense, memo: finalMemo }
      });
    }
  };

  const triggerSaveConfirm = () => {
    if (!formSite.trim()) {
      alert('현장 이름을 입력해주세요.');
      return;
    }

    setConfirmModalData({
      title: '공수 등록 전 확인',
      items: [
        { label: '작업 일자', value: formDate || selectedDate },
        { label: '현장명', value: formSite },
        { label: '적용 공수', value: `${formShift}공수` },
        { label: '인건비 산출', value: `${(calculatedPay * formShift).toLocaleString()}원` },
        { label: '작업 메모', value: formMemo ? formMemo : '없음' }, // ⭐ 메모 확인 추가
        { label: '최종 합산액', value: `${(formShift * calculatedPay + (Number(formExpense) || 0)).toLocaleString()}원` },
      ],
      onConfirm: () => {
        const newRecord: ShiftRecord = {
          id: Date.now().toString(),
          date: formDate || selectedDate,
          site: formSite.trim(),
          client: isLeader ? '아버지(오야지)' : (formClient.trim() || '미지정'),
          shift: formShift,
          payPerShift: calculatedPay,
          expense: parseInt(formExpense, 10) || 0,
          isOutOfTown,
          isPaid: false,
          memo: formMemo.trim(), // ⭐ 메모 저장
        };
        saveShifts([newRecord, ...shifts]);
        setSelectedDate(formDate || selectedDate);
        setFormSite('');
        setFormExpense('');
        setFormMemo(''); // ⭐ 메모 초기화
        setIsLeader(false);
        setIsOutOfTown(false);
        setDiscountAmount(0);
        setConfirmModalData(null);
        showToast('장부에 등록되었습니다.');
      },
    });
  };

  const handleTogglePaid = (id: string) => {
    saveShifts(shifts.map(s => s.id === id ? { ...s, isPaid: !s.isPaid } : s));
  };

  const handleDeleteShift = (id: string) => {
    if (confirm('이 기록을 삭제하시겠습니까?')) {
      saveShifts(shifts.filter(s => s.id !== id));
    }
  };

  // -------------------------------------------------------------
  // 달력 및 통계
  // -------------------------------------------------------------
  const allSites = ['전체', ...Array.from(new Set(shifts.map(s => s.site)))];
  const filteredShifts = siteFilter === '전체' ? shifts : shifts.filter(s => s.site === siteFilter);
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const currentMonthShifts = filteredShifts.filter(s => s.date.startsWith(monthPrefix));

  const totalMonthShifts = currentMonthShifts.reduce((acc, cur) => acc + cur.shift, 0);
  const totalMonthWages = currentMonthShifts.reduce((acc, cur) => acc + cur.shift * cur.payPerShift, 0);
  const totalMonthExpenses = currentMonthShifts.reduce((acc, cur) => acc + cur.expense, 0);
  const grandMonthTotal = totalMonthWages + totalMonthExpenses;

  const unpaidTotal = shifts
    .filter(s => !s.isPaid)
    .reduce((acc, cur) => acc + cur.shift * cur.payPerShift + cur.expense, 0);

  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentYear(currentYear - 1); setCurrentMonth(12); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentYear(currentYear + 1); setCurrentMonth(1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  };

  const getDayInfo = (day: number) => {
    const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayShifts = filteredShifts.filter(s => s.date === dateKey);
    const dayTotalShift = dayShifts.reduce((acc, cur) => acc + cur.shift, 0);
    const hasUnpaid = dayShifts.some(s => !s.isPaid);
    const hasMemo = dayShifts.some(s => s.memo && s.memo.trim() !== ''); // ⭐ 메모 여부 확인
    return { dateKey, dayShifts, dayTotalShift, hasUnpaid, hasMemo };
  };

  const selectedDateShifts = filteredShifts.filter(s => s.date === selectedDate);

  // -------------------------------------------------------------
  // 목공 물량 계산 산출
  // -------------------------------------------------------------
  const pyeong = parseFloat(areaPyeong) || 0;
  const areaSqm = pyeong * 3.3058;
  const boardSqm = INTERIOR_CONFIG.woodworking.gypsum[boardType].areaSqm;
  const currentUsage = INTERIOR_CONFIG.woodworking.usageTypes[usageType];
  const currentSpacing = INTERIOR_CONFIG.woodworking.spacing[spacingType];

  const wallFactor = wallCount === 5 ? 1.25 : 1.0;
  const requiredBoards = pyeong > 0
    ? Math.ceil(((areaSqm * wallFactor) / boardSqm) * currentUsage.layerMultiplier * (1 + currentUsage.lossRate))
    : 0;

  const joinMultiplier = hasJoin ? (1 + INTERIOR_CONFIG.woodworking.joinExtraRate) : 1.0;
  const requiredLumber = pyeong > 0
    ? Math.ceil(pyeong * currentSpacing.bundlePerPyeong * joinMultiplier)
    : 0;

  const generateMaterialOrderText = () => {
    const usageLabel = usageType === 'home1P' ? '가정집 (도배 마감 - 1P 원피)' : '상가 (페인트 도장 - 2P 투피)';
    const spacingLabel = spacingType === '300' ? '300상 (원피)' : '450상 (투피)';
    
    return `[목공 자재 발주서]
• 시공 현장: ${formSite || '현장 미기재'} (${pyeong}평, ${wallCount}면)
• 마감 방식: ${usageLabel}
• 다루끼 간격: ${spacingLabel} ${hasJoin ? '(조인보강 포함)' : ''}
---------------------------
1. ${boardType === '3x6' ? '석고 3×6' : '석고 4×8'}: ${requiredBoards}장
2. 다루끼 (1단=12개): 약 ${requiredLumber}단
3. 권장 타카핀: 콘크리트 타카핀 / DT날 / 실타카 1짝
4. 천장 트랜스 보강용: 5T 합판 확인 요망`;
  };

  const copyMaterialOrder = () => {
    navigator.clipboard.writeText(generateMaterialOrderText());
    setOrderCopied(true);
    setTimeout(() => setOrderCopied(false), 2500);
    showToast('자재 발주서가 카톡용으로 복사되었습니다.');
  };

  // -------------------------------------------------------------
  // 월말 정산: 현장 및 기간 선택 청구서
  // -------------------------------------------------------------
  const getBillingTargetShifts = (periodToUse = billingPeriod) => {
    if (periodToUse === 'currentMonth') {
      const prefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      return shifts.filter(s => s.date.startsWith(prefix));
    } else if (periodToUse === 'prevMonth') {
      const pMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const pYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prefix = `${pYear}-${String(pMonth).padStart(2, '0')}`;
      return shifts.filter(s => s.date.startsWith(prefix));
    } else {
      return shifts.filter(s => !s.isPaid);
    }
  };

  const baseBillingShifts = getBillingTargetShifts();
  const uniqueBillingSites = Array.from(new Set(baseBillingShifts.map(s => s.site)));

  const billingShifts = baseBillingShifts.filter(s => !uncheckedBillingSites.includes(s.site));
  const billingTotalShifts = billingShifts.reduce((acc, cur) => acc + cur.shift, 0);
  const billingTotalWages = billingShifts.reduce((acc, cur) => acc + cur.shift * cur.payPerShift, 0);
  const billingTotalExpenses = billingShifts.reduce((acc, cur) => acc + cur.expense, 0);
  const billingGrandTotal = billingTotalWages + billingTotalExpenses;

  const handleToggleBillingSite = (site: string, isChecked: boolean) => {
    if (isChecked) {
      setUncheckedBillingSites(prev => prev.filter(s => s !== site));
    } else {
      setUncheckedBillingSites(prev => [...prev, site]);
    }
  };

  const generateKakaoBill = (periodToUse = billingPeriod) => {
    const siteMap: { [site: string]: { shifts: number; total: number } } = {};
    let totalMealExpense = 0;

    billingShifts.forEach((s) => {
      if (!siteMap[s.site]) siteMap[s.site] = { shifts: 0, total: 0 };
      siteMap[s.site].shifts += s.shift;
      siteMap[s.site].total += s.shift * s.payPerShift;
      totalMealExpense += s.expense;
    });

    let periodText = '';
    if (periodToUse === 'currentMonth') periodText = `${currentMonth}월`;
    else if (periodToUse === 'prevMonth') periodText = `${currentMonth === 1 ? 12 : currentMonth - 1}월`;
    else periodText = '전체 미입금건';

    let text = `[${periodText} 공수 및 식대 청구서]\n---------------------------\n`;
    Object.keys(siteMap).forEach((siteName) => {
      const data = siteMap[siteName];
      text += `• ${siteName}: ${data.shifts}공수 (${data.total.toLocaleString()}원)\n`;
    });
    if (totalMealExpense > 0) {
      text += `• 선결제 식대/참값: ${totalMealExpense.toLocaleString()}원 (주유비 제외)\n`;
    }
    text += `---------------------------\n`;
    text += `총 출역: ${billingTotalShifts}공수\n`;
    text += `총 청구금액: ${billingGrandTotal.toLocaleString()}원\n\n`;
    text += `입금계좌: ${bankAccount}`;
    return text;
  };

  const triggerBillConfirm = (periodToUse = billingPeriod) => {
    const shiftsToCheck = getBillingTargetShifts(periodToUse).filter(s => !uncheckedBillingSites.includes(s.site));
    if (shiftsToCheck.length === 0) {
      alert('청구할 내역이 없거나 현장을 선택하지 않았습니다.');
      return;
    }

    const uniqueBillingSitesCount = Object.keys(shiftsToCheck.reduce((acc, cur) => ({...acc, [cur.site]: true}), {})).length;
    
    let periodTitle = '';
    if (periodToUse === 'currentMonth') periodTitle = `${currentMonth}월`;
    else if (periodToUse === 'prevMonth') periodTitle = `${currentMonth === 1 ? 12 : currentMonth - 1}월`;
    else periodTitle = '전체 미수금';

    setConfirmModalData({
      title: '청구서 카톡 전송 확인',
      items: [
        { label: '청구 기간', value: periodTitle },
        { label: '청구 현장 수', value: `${uniqueBillingSitesCount}곳` },
        { label: '총 출역 공수', value: `${billingTotalShifts}공수` },
        { label: '최종 청구 금액', value: `${billingGrandTotal.toLocaleString()}원` },
      ],
      onConfirm: () => {
        navigator.clipboard.writeText(generateKakaoBill(periodToUse));
        setConfirmModalData(null);
        showToast('카카오톡 청구서가 복사되었습니다.');
      },
    });
  };

  // -------------------------------------------------------------
  // 사진 카메라 스탬프 및 이중 필터
  // -------------------------------------------------------------
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const barHeight = Math.max(img.height * 0.08, 70);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, img.height - barHeight, img.width, barHeight);

        const now = new Date();
        const dateStr = now.toLocaleDateString('ko-KR') + ' ' + now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        const siteLabel = photoSiteName.trim() ? `[${photoSiteName.trim()}] ` : '';
        const stampText = `${siteLabel}${photoRoomTag} · ${dateStr}`;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `800 ${Math.max(barHeight * 0.42, 26)}px "Pretendard", sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(stampText, 30, img.height - barHeight / 2);

        const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const newPhoto: SitePhoto = {
          id: Date.now().toString(),
          dataUrl: stampedDataUrl,
          timestamp: dateStr,
          site: photoSiteName || '현장 미기재',
          room: photoRoomTag,
        };
        const updated = [newPhoto, ...photos];
        setPhotos(updated);
        localStorage.setItem('father_photos_v13', JSON.stringify(updated));
        showToast(`[${photoRoomTag}] 사진이 저장되었습니다.`);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uniquePhotoSites = ['전체', ...Array.from(new Set(photos.map(p => p.site)))];
  
  const displayedPhotos = photos.filter(p => {
    const siteMatch = selectedPhotoSiteFilter === '전체' || p.site === selectedPhotoSiteFilter;
    const roomMatch = selectedPhotoRoomFilter === '전체' || p.room === selectedPhotoRoomFilter;
    return siteMatch && roomMatch;
  });

  return (
    <>
      <div className="min-h-screen pb-32 select-none antialiased bg-[#e0f2e9] text-[#000]">
        
        {/* 1. 상단 브루탈리즘 헤더 */}
        <header className="bg-[#ceb5a7] px-5 pt-6 pb-5 sticky top-0 z-30 border-b-4 border-black">
          <div className="max-w-md mx-auto flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-black mb-1">
                <span className="w-3 h-3 rounded-full bg-black animate-pulse border-2 border-white" />
                현장비서 PRO
              </div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-1 uppercase">
                {currentYear}.{String(currentMonth).padStart(2, '0')}
              </h1>
            </div>

            {unpaidTotal > 0 && (
              <div className="bg-rose-500 text-white px-4 py-2 rounded-xl text-right border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
                <div className="text-sm font-bold tracking-tight">전체 미수금</div>
                <div className="text-2xl font-black tracking-tight">{unpaidTotal.toLocaleString()}원</div>
              </div>
            )}
          </div>
        </header>

        {/* 대화 피드백 & 토스트 */}
        {voiceToast && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-[#3c887e] text-white text-base font-bold px-6 py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 max-w-[90%] text-center">
            <span className="w-3 h-3 rounded-full bg-[#FACC15] animate-ping flex-shrink-0 border-2 border-black" />
            <span>{voiceToast}</span>
          </div>
        )}

        {/* 2. 메인 뷰 */}
        <main className="max-w-md mx-auto p-4 space-y-6">

          {/* ======================= TAB 1: 공수수첩 ======================= */}
          {tab === '공수' && (
            <>
              {/* 요약 카드 */}
              <div className="bg-[#3c887e] text-white p-6 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center text-base font-bold mb-3">
                  <span>이달의 출역 합계</span>
                  <span className="bg-[#FACC15] text-black px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold">
                    {currentMonthShifts.length}일 근무
                  </span>
                </div>
                <div className="flex justify-between items-baseline mt-2">
                  <div>
                    <span className="text-5xl font-black tracking-tight">
                      {totalMonthShifts.toFixed(1)}
                    </span>
                    <span className="text-2xl font-bold ml-1.5">공수</span>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black bg-white text-black px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md inline-block">
                      {grandMonthTotal.toLocaleString()}원
                    </div>
                  </div>
                </div>

                {allSites.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pt-5 mt-5 border-t-4 border-black no-scrollbar">
                    {allSites.map((site) => (
                      <button
                        key={site}
                        onClick={() => setSiteFilter(site)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border-2 border-black transition-all ${
                          siteFilter === site 
                            ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-y-0' 
                            : 'bg-white text-black hover:bg-[#ceb5a7] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        }`}
                      >
                        {site}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 브루탈리즘 달력 */}
              <div className="bg-white p-5 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center px-2 py-1 mb-4">
                  <button onClick={prevMonth} className="p-3 bg-[#ceb5a7] rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="text-2xl font-black tracking-tight">
                    {currentYear}.{String(currentMonth).padStart(2, '0')}
                  </div>
                  <button onClick={nextMonth} className="p-3 bg-[#ceb5a7] rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-7 text-center text-sm font-bold border-b-4 border-black pb-3 mb-3">
                  <div className="text-rose-600">SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div className="text-blue-600">SAT</div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays().map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} className="h-16" />;

                    const { dateKey, dayTotalShift, hasUnpaid, hasMemo } = getDayInfo(day);
                    const isSelected = selectedDate === dateKey;

                    return (
                      <button
                        key={dateKey}
                        onClick={() => { setSelectedDate(dateKey); setFormDate(dateKey); }}
                        className={`relative h-16 p-1 flex flex-col justify-between items-center border-2 border-transparent transition-all ${
                          isSelected
                            ? 'bg-[#a17c6b] text-white border-black shadow-[inset_0_0_0_2px_rgba(0,0,0,1)] rounded-xl'
                            : 'hover:bg-[#e0f2e9] hover:border-black rounded-xl'
                        }`}
                      >
                        {/* ⭐ 메모 표시 (노란색 점) */}
                        {hasMemo && (
                          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FACC15] border border-black rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] z-10 animate-pulse"></div>
                        )}

                        <span className={`text-base font-bold ${isSelected ? 'text-white' : idx % 7 === 0 ? 'text-rose-600' : idx % 7 === 6 ? 'text-blue-600' : 'text-black'}`}>
                          {day}
                        </span>

                        {dayTotalShift > 0 && (
                          <div className={`w-full py-0.5 rounded border border-black text-xs font-bold tracking-tight ${
                            isSelected
                              ? 'bg-white text-black'
                              : hasUnpaid
                              ? 'bg-rose-500 text-white'
                              : 'bg-[#5b7b7a] text-white'
                          }`}>
                            {dayTotalShift}공
                          </div>
                        )}
                        {dayTotalShift === 0 && <div className="h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 선택 날짜 상세 */}
              <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5">
                <div className="text-2xl font-black border-b-4 border-black pb-4">
                  📍 {selectedDate}
                </div>

                {selectedDateShifts.length > 0 ? (
                  <div className="space-y-4">
                    {selectedDateShifts.map((item) => (
                      <div
                        key={item.id}
                        className={`p-5 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                          item.isPaid ? 'bg-white' : 'bg-[#ceb5a7]'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="w-full">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm font-bold px-3 py-1 rounded bg-[#5b7b7a] text-white border-2 border-black">
                                {item.client}
                              </span>
                              {item.isOutOfTown && (
                                <span className="text-sm font-bold px-3 py-1 rounded bg-[#FACC15] text-black border-2 border-black">
                                  시외+1만
                                </span>
                              )}
                            </div>
                            
                            <div className="flex justify-between items-center w-full">
                              <div>
                                <div className="text-xl font-bold">{item.site}</div>
                                <div className="text-base font-semibold mt-1">
                                  {item.shift}공수 · {(item.shift * item.payPerShift).toLocaleString()}원
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  onClick={() => handleTogglePaid(item.id)}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                                    item.isPaid ? 'bg-emerald-400 text-black' : 'bg-rose-500 text-white'
                                  }`}
                                >
                                  {item.isPaid ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                  {item.isPaid ? '입금완료' : '미입금'}
                                </button>
                                <button
                                  onClick={() => handleDeleteShift(item.id)}
                                  className="text-black hover:bg-rose-500 hover:text-white p-2 border-2 border-transparent hover:border-black rounded-xl transition-all"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            {/* ⭐ 메모 노출 영역 (포스트잇 느낌) */}
                            {item.memo && (
                              <div className="mt-4 p-3 bg-[#FACC15] border-2 border-black rounded-lg text-sm font-bold shadow-[inset_0px_2px_0px_rgba(255,255,255,0.3)]">
                                📝 {item.memo}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-5 text-center font-bold text-lg text-[#5b7b7a]">
                    기록된 공수가 없습니다.
                  </div>
                )}

                {/* 공수 등록 폼 */}
                <div className="pt-6 border-t-4 border-black space-y-5">
                  <div className="text-xl font-black flex items-center gap-2">
                    <Plus className="w-7 h-7 text-[#5b7b7a]" /> 공수 추가
                  </div>

                  <input
                    type="text"
                    placeholder="현장 이름 (예: 서초 래미안 302호)"
                    value={formSite}
                    onChange={(e) => setFormSite(e.target.value)}
                    className="w-full text-lg font-bold p-4 bg-white border-4 border-black rounded-xl outline-none focus:bg-[#e0f2e9] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)] transition-colors"
                  />

                  <div>
                    <label className="block text-base font-bold mb-2">기준 지역</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormRegion('seoul')}
                        className={`py-3.5 rounded-xl font-bold text-base border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                          formRegion === 'seoul' ? 'bg-[#5b7b7a] text-white' : 'bg-white'
                        }`}
                      >
                        서울 (29만)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormRegion('gwangju')}
                        className={`py-3.5 rounded-xl font-bold text-base border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                          formRegion === 'gwangju' ? 'bg-[#5b7b7a] text-white' : 'bg-white'
                        }`}
                      >
                        광주 (28만)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsLeader(!isLeader)}
                      className={`py-3.5 rounded-xl font-bold text-base border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 ${
                        isLeader ? 'bg-[#FACC15] text-black' : 'bg-white'
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5" /> 오야지 (+0.5품)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOutOfTown(!isOutOfTown)}
                      className={`py-3.5 rounded-xl font-bold text-base border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 ${
                        isOutOfTown ? 'bg-[#a17c6b] text-white' : 'bg-white'
                      }`}
                    >
                      <MapPin className="w-5 h-5" /> 시외 (+1만)
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between text-base font-bold mb-2">
                      <span>가변 할인</span>
                      <span className="text-rose-600 bg-rose-100 px-2 py-0.5 rounded border-2 border-black">
                        단가: {(calculatedPay * formShift).toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {INTERIOR_CONFIG.rates.discountOptions.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDiscountAmount(amt)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                            discountAmount === amt ? 'bg-black text-white' : 'bg-white'
                          }`}
                        >
                          {amt === 0 ? '정상' : `${amt / 10000}만`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 공수 선택 */}
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    {[0.5, 1.0, 1.5, 2.0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormShift(val)}
                        className={`py-4 rounded-xl text-base font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                          formShift === val ? 'bg-[#3c887e] text-white' : 'bg-white'
                        }`}
                      >
                        {val}공
                      </button>
                    ))}
                  </div>

                  {/* ⭐ 작업 메모 포스트잇 양식 추가 */}
                  <div className="pt-3">
                    <label className="block text-base font-bold mb-2 flex items-center gap-2">
                      📝 작업 메모 <span className="text-sm font-normal text-gray-500">(선택)</span>
                    </label>
                    <textarea
                      placeholder="오늘 어떤 작업을 하셨나요? (마이크로 말하면 자동으로 채워집니다)"
                      value={formMemo}
                      onChange={(e) => setFormMemo(e.target.value)}
                      rows={2}
                      className="w-full text-base font-bold p-4 bg-[#FACC15] border-4 border-black rounded-xl outline-none focus:bg-[#fde047] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)] transition-colors resize-none placeholder-black/50"
                    />
                  </div>

                  <div className="pt-1">
                    <label className="block text-base font-bold mb-2 flex items-center gap-2">
                      <Coffee className="w-5 h-5" /> 선결제 식대 청구
                    </label>
                    <input
                      type="number"
                      placeholder="사비 지출 밥값 (원)"
                      value={formExpense}
                      onChange={(e) => setFormExpense(e.target.value)}
                      className="w-full text-lg font-bold p-4 bg-white border-4 border-black rounded-xl outline-none focus:bg-[#e0f2e9] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)] transition-colors"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={triggerSaveConfirm}
                    className="w-full py-5 bg-[#FACC15] text-black font-black text-xl rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mt-5"
                  >
                    장부 저장하기
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ======================= TAB 2: 목공 자재계산 ======================= */}
          {tab === '물량' && (
            <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
              <div className="border-b-4 border-black pb-4">
                <h2 className="text-3xl font-black">자재 산출기</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold mb-2">평수</label>
                  <input
                    type="number"
                    value={areaPyeong}
                    onChange={(e) => setAreaPyeong(e.target.value)}
                    className="w-full text-2xl font-bold p-4 bg-white border-4 border-black rounded-xl outline-none focus:bg-[#e0f2e9] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)]"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold mb-2">시공 벽면 수</label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setWallCount(4)}
                      className={`py-3 rounded-xl text-base font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                        wallCount === 4 ? 'bg-[#5b7b7a] text-white' : 'bg-white'
                      }`}
                    >
                      벽 4면
                    </button>
                    <button
                      onClick={() => setWallCount(5)}
                      className={`py-3 rounded-xl text-base font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                        wallCount === 5 ? 'bg-[#5b7b7a] text-white' : 'bg-white'
                      }`}
                    >
                      천장포함 (5면)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-base font-bold mb-2">마감 용도 (석고 겹수)</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { setUsageType('home1P'); setSpacingType('300'); }}
                    className={`p-5 rounded-xl text-left border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                      usageType === 'home1P' ? 'bg-[#a17c6b] text-white' : 'bg-white'
                    }`}
                  >
                    <div className="text-xl font-bold">가정집</div>
                    <div className="text-base font-semibold mt-1">원피 (1P)</div>
                  </button>
                  <button
                    onClick={() => { setUsageType('store2P'); setSpacingType('450'); }}
                    className={`p-5 rounded-xl text-left border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                      usageType === 'store2P' ? 'bg-[#a17c6b] text-white' : 'bg-white'
                    }`}
                  >
                    <div className="text-xl font-bold">상가</div>
                    <div className="text-base font-semibold mt-1">투피 (2P)</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold mb-2">상 간격</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSpacingType('300')}
                      className={`py-3 rounded-xl text-base font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                        spacingType === '300' ? 'bg-[#3c887e] text-white' : 'bg-white'
                      }`}
                    >
                      300상
                    </button>
                    <button
                      onClick={() => setSpacingType('450')}
                      className={`py-3 rounded-xl text-base font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                        spacingType === '450' ? 'bg-[#3c887e] text-white' : 'bg-white'
                      }`}
                    >
                      450상
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-base font-bold mb-2">조인 보강</label>
                  <button
                    onClick={() => setHasJoin(!hasJoin)}
                    className={`w-full py-3 rounded-xl text-base font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                      hasJoin ? 'bg-[#FACC15] text-black' : 'bg-white'
                    }`}
                  >
                    {hasJoin ? '보강 (+15%)' : '기본 간격'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setBoardType('3x6')}
                  className={`py-4 rounded-xl text-base font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                    boardType === '3x6' ? 'bg-black text-white' : 'bg-white'
                  }`}
                >
                  석고 3×6
                </button>
                <button
                  onClick={() => setBoardType('4x8')}
                  className={`py-4 rounded-xl text-base font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                    boardType === '4x8' ? 'bg-black text-white' : 'bg-white'
                  }`}
                >
                  석고 4×8
                </button>
              </div>

              <div className="p-6 bg-[#e0f2e9] rounded-xl border-4 border-black shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">석고보드 ({boardType}):</span>
                  <span className="text-2xl font-black bg-white px-4 py-1.5 border-2 border-black rounded-lg">{requiredBoards}장</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">다루끼 (1단=12개):</span>
                  <span className="text-2xl font-black bg-white px-4 py-1.5 border-2 border-black rounded-lg">{requiredLumber}단</span>
                </div>
              </div>

              <button
                onClick={copyMaterialOrder}
                className="w-full py-5 bg-[#3c887e] text-white font-black text-xl rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex justify-center items-center gap-3"
              >
                <Share2 className="w-6 h-6" /> 발주서 복사
              </button>
            </div>
          )}

          {/* ======================= TAB 3: 현장카메라 ======================= */}
          {tab === '사진' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5">
                <h2 className="text-3xl font-black border-b-4 border-black pb-4">스탬프 카메라</h2>

                <input
                  type="text"
                  placeholder="현장명 (예: 서초 302호)"
                  value={photoSiteName}
                  onChange={(e) => setPhotoSiteName(e.target.value)}
                  className="w-full text-lg font-bold p-4 bg-white border-4 border-black rounded-xl outline-none focus:bg-[#e0f2e9] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)]"
                />

                <div>
                  <label className="block text-base font-bold mb-2">공간 선택</label>
                  <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
                    {INTERIOR_CONFIG.roomTags.filter(r => r !== '전체').map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPhotoRoomTag(tag)}
                        className={`px-5 py-2.5 rounded-xl text-base font-bold whitespace-nowrap border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                          photoRoomTag === tag ? 'bg-[#3c887e] text-white' : 'bg-white text-black'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-5 bg-[#FACC15] text-black rounded-xl text-xl font-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3"
                >
                  <Camera className="w-7 h-7" /> 촬영하기
                </button>
              </div>

              {/* 필터 */}
              <div className="flex flex-col gap-4 px-1">
                <div className="flex items-center gap-3">
                  <MapPin className="w-7 h-7 text-black" />
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                    {uniquePhotoSites.map((site) => (
                      <button
                        key={site}
                        onClick={() => setSelectedPhotoSiteFilter(site)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border-2 border-black transition-all ${
                          selectedPhotoSiteFilter === site ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'
                        }`}
                      >
                        {site}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Filter className="w-7 h-7 text-black" />
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                    {INTERIOR_CONFIG.roomTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedPhotoRoomFilter(tag)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border-2 border-black transition-all ${
                          selectedPhotoRoomFilter === tag ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {displayedPhotos.length === 0 ? (
                  <div className="p-10 text-center bg-white rounded-xl font-bold text-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    사진이 없습니다.
                  </div>
                ) : (
                  displayedPhotos.map((p) => (
                    <div key={p.id} className="bg-white rounded-xl border-4 border-black overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                      <img src={p.dataUrl} alt="현장사진" className="w-full h-auto object-cover max-h-72 border-b-4 border-black" />
                      <div className="p-5 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold px-3 py-1 rounded bg-[#ceb5a7] border-2 border-black">
                              {p.room}
                            </span>
                            <span className="text-xl font-bold">{p.site}</span>
                          </div>
                          <div className="text-base font-semibold mt-2 text-gray-700">{p.timestamp}</div>
                        </div>
                        <button
                          onClick={() => {
                            const updated = photos.filter(item => item.id !== p.id);
                            setPhotos(updated);
                            localStorage.setItem('father_photos_v13', JSON.stringify(updated));
                          }}
                          className="bg-white hover:bg-rose-500 hover:text-white p-3 border-2 border-black rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================= TAB 4: 월말정산 ======================= */}
          {tab === '일보' && (
            <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
              <div className="border-b-4 border-black pb-4">
                <h2 className="text-3xl font-black text-black">정산 청구서</h2>
              </div>

              <div>
                <label className="block text-base font-bold mb-2">정산 기간 선택</label>
                <div className="grid grid-cols-3 gap-2 bg-[#ceb5a7] p-2 rounded-xl border-4 border-black shadow-[inset_0px_4px_0px_rgba(0,0,0,0.1)]">
                  <button
                    onClick={() => setBillingPeriod('prevMonth')}
                    className={`py-3.5 rounded-xl text-base font-bold border-2 border-black transition-all ${
                      billingPeriod === 'prevMonth' ? 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent border-transparent'
                    }`}
                  >
                    지난 달
                  </button>
                  <button
                    onClick={() => setBillingPeriod('currentMonth')}
                    className={`py-3.5 rounded-xl text-base font-bold border-2 border-black transition-all ${
                      billingPeriod === 'currentMonth' ? 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent border-transparent'
                    }`}
                  >
                    이번 달
                  </button>
                  <button
                    onClick={() => setBillingPeriod('allUnpaid')}
                    className={`py-3.5 rounded-xl text-base font-bold border-2 border-black transition-all ${
                      billingPeriod === 'allUnpaid' ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent border-transparent'
                    }`}
                  >
                    전체 미수금
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-base font-bold mb-2">청구할 현장 체크</label>
                <div className="space-y-3">
                  {uniqueBillingSites.length === 0 ? (
                    <div className="font-bold text-lg p-6 bg-[#e0f2e9] border-4 border-black rounded-xl text-center">
                      해당 기간 미입금 건이 없습니다.
                    </div>
                  ) : (
                    uniqueBillingSites.map(site => (
                      <label key={site} className="flex items-center gap-4 p-5 bg-white hover:bg-[#e0f2e9] border-4 border-black rounded-xl cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={!uncheckedBillingSites.includes(site)}
                            onChange={(e) => handleToggleBillingSite(site, e.target.checked)}
                            className="w-7 h-7 appearance-none border-2 border-black rounded bg-white checked:bg-[#3c887e] outline-none cursor-pointer"
                          />
                          {!uncheckedBillingSites.includes(site) && <Check className="absolute top-0.5 left-0.5 w-6 h-6 text-white pointer-events-none" />}
                        </div>
                        <span className="text-xl font-bold">{site}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-base font-bold mb-2">입금 계좌</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full text-lg font-bold p-4 bg-white border-4 border-black rounded-xl outline-none focus:bg-[#e0f2e9] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)]"
                />
              </div>

              <div className="bg-[#ceb5a7] p-5 rounded-xl font-bold text-sm whitespace-pre-wrap leading-relaxed border-4 border-black shadow-[inset_0px_4px_0px_rgba(0,0,0,0.1)]">
                {generateKakaoBill()}
              </div>

              <button
                onClick={() => triggerBillConfirm(billingPeriod)}
                className={`w-full py-5 rounded-xl text-xl font-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3 ${
                  billingShifts.length > 0 ? 'bg-[#FACC15] text-black' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                disabled={billingShifts.length === 0}
              >
                <CheckSquare className="w-7 h-7" /> 카톡 복사
              </button>
            </div>
          )}
        </main>

        {/* 3. 하단 네오 브루탈리즘 네비게이션 */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-4 border-black px-4 py-3">
          <div className="max-w-md mx-auto flex justify-between items-center relative h-16">
            <button onClick={() => setTab('공수')} className={`flex-1 flex flex-col items-center transition-colors ${tab === '공수' ? 'text-[#3c887e]' : 'text-black hover:text-[#5b7b7a]'}`}>
              <CalendarIcon className="w-7 h-7 mb-1.5" strokeWidth={tab === '공수' ? 3 : 2} />
              <span className="text-sm font-bold">공수</span>
            </button>
            <button onClick={() => setTab('물량')} className={`flex-1 flex flex-col items-center pr-6 transition-colors ${tab === '물량' ? 'text-[#3c887e]' : 'text-black hover:text-[#5b7b7a]'}`}>
              <Calculator className="w-7 h-7 mb-1.5" strokeWidth={tab === '물량' ? 3 : 2} />
              <span className="text-sm font-bold">물량</span>
            </button>

            {/* 마이크 FAB */}
            <div className="absolute left-1/2 -top-12 -translate-x-1/2 z-50">
              <button
                onClick={handleVoiceFAB}
                className={`w-20 h-20 rounded-full flex items-center justify-center border-4 border-black transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                    : 'bg-[#FACC15] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                }`}
              >
                <Mic className="w-8 h-8" strokeWidth={3} />
              </button>
            </div>

            <button onClick={() => setTab('사진')} className={`flex-1 flex flex-col items-center pl-6 transition-colors ${tab === '사진' ? 'text-[#3c887e]' : 'text-black hover:text-[#5b7b7a]'}`}>
              <Camera className="w-7 h-7 mb-1.5" strokeWidth={tab === '사진' ? 3 : 2} />
              <span className="text-sm font-bold">사진</span>
            </button>
            <button onClick={() => setTab('일보')} className={`flex-1 flex flex-col items-center transition-colors ${tab === '일보' ? 'text-[#3c887e]' : 'text-black hover:text-[#5b7b7a]'}`}>
              <FileText className="w-7 h-7 mb-1.5" strokeWidth={tab === '일보' ? 3 : 2} />
              <span className="text-sm font-bold">정산</span>
            </button>
          </div>
        </div>

        {/* 4. 되묻기 모달 */}
        {pendingQuestion && (
          <div className="fixed inset-0 z-50 bg-[#e0f2e9]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-xl p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center animate-in zoom-in duration-200">
              <div className="w-20 h-20 bg-[#FACC15] border-4 border-black rounded-full flex items-center justify-center mx-auto mb-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Mic className="w-10 h-10 animate-pulse text-black" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black mb-3">
                {pendingQuestion.type === 'ASK_SITE_NAME' && '어느 현장에서 일하셨나요?'}
                {pendingQuestion.type === 'ASK_PYEONG' && '시공할 공간이 몇 평인가요?'}
                {pendingQuestion.type === 'ASK_WHICH_SITE_PAID' && '어느 현장 돈이 들어왔나요?'}
              </h3>
              <p className="text-base font-bold text-gray-500 mb-6">마이크를 누르고 짧게 대답해 주세요.</p>
              <button
                onClick={handleVoiceFAB}
                className={`w-full py-5 rounded-xl text-xl font-black border-4 border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-4 ${
                  isListening ? 'bg-rose-500 text-white' : 'bg-[#3c887e] text-white'
                }`}
              >
                {isListening ? '듣고 있습니다...' : '대답하기'}
              </button>
              <button
                onClick={() => setPendingQuestion(null)}
                className="w-full py-4 bg-white border-4 border-black font-black text-lg rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 5. 검수 모달 */}
        {confirmModalData && (
          <div className="fixed inset-0 z-50 bg-[#e0f2e9]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-xl p-7 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 font-black text-2xl border-b-4 border-black pb-4">
                <ShieldCheck className="w-8 h-8 text-[#3c887e]" strokeWidth={3} />
                {confirmModalData.title}
              </div>

              <div className="space-y-4 bg-[#ceb5a7] p-6 rounded-xl border-4 border-black shadow-[inset_0px_4px_0px_rgba(0,0,0,0.1)]">
                {confirmModalData.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-base">
                    <span className="font-bold text-black/70">{item.label}</span>
                    <span className="font-black text-xl text-right max-w-[60%] line-clamp-2">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3">
                <button
                  onClick={() => setConfirmModalData(null)}
                  className="py-4 bg-white border-4 border-black font-black text-lg rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  수정
                </button>
                <button
                  onClick={confirmModalData.onConfirm}
                  className="py-4 bg-[#FACC15] border-4 border-black text-black font-black text-lg rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}