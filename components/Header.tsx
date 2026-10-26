// components/Header.tsx
// 상단 네오 브루탈리즘 헤더 & 전체 미수금 배지

interface HeaderProps {
  year: number;
  month: number;
  unpaidTotal: number;
}

export default function Header({ year, month, unpaidTotal }: HeaderProps) {
  return (
    <header className="bg-[#ceb5a7] px-5 pt-6 pb-5 sticky top-0 z-30 border-b-4 border-black">
      <div className="max-w-md mx-auto flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-black mb-1">
            <span className="w-3 h-3 rounded-full bg-black animate-pulse border-2 border-white" />
            현장비서 PRO
          </div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-1 uppercase">
            {year}.{String(month).padStart(2, '0')}
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
  );
}
