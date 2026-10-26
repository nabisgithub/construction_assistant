'use client';
// components/tabs/PhotoTab.tsx
// 탭 3: 스탬프 카메라 및 현장/공간 이중 필터
import { useRef, useState } from 'react';
import { Camera, Filter, MapPin, Trash2 } from 'lucide-react';
import { INTERIOR_CONFIG } from '@/constants/interiorConfig';
import type { PhotoRecord } from '@/lib/storage/photoStorage';

interface PhotoTabProps {
  photos: PhotoRecord[]; // 필터가 적용된 목록
  sites: string[];
  siteFilter: string;
  onSiteFilterChange: (site: string) => void;
  roomFilter: string;
  onRoomFilterChange: (room: string) => void;
  onCapture: (file: File, siteName: string, room: string) => Promise<void>;
  onDelete: (id: string) => void;
}

const filterChip = (active: boolean) =>
  `px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border-2 border-black transition-all ${
    active ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'
  }`;

export default function PhotoTab({
  photos,
  sites,
  siteFilter,
  onSiteFilterChange,
  roomFilter,
  onRoomFilterChange,
  onCapture,
  onDelete,
}: PhotoTabProps) {
  const [siteName, setSiteName] = useState('');
  const [roomTag, setRoomTag] = useState('거실');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    setIsSaving(true);
    try {
      await onCapture(file, siteName, roomTag);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5">
        <h2 className="text-3xl font-black border-b-4 border-black pb-4">스탬프 카메라</h2>

        <input
          type="text"
          placeholder="현장명 (예: 서초 302호)"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className="w-full text-lg font-bold p-4 bg-white border-4 border-black rounded-xl outline-none focus:bg-[#e0f2e9] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)]"
        />

        <div>
          <label className="block text-base font-bold mb-2">공간 선택</label>
          <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
            {INTERIOR_CONFIG.roomTags.filter((r) => r !== '전체').map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setRoomTag(tag)}
                className={`px-5 py-2.5 rounded-xl text-base font-bold whitespace-nowrap border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                  roomTag === tag ? 'bg-[#3c887e] text-white' : 'bg-white text-black'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isSaving}
          className="w-full py-5 bg-[#FACC15] text-black rounded-xl text-xl font-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3"
        >
          <Camera className="w-7 h-7" /> {isSaving ? '저장 중...' : '촬영하기'}
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-col gap-4 px-1">
        <div className="flex items-center gap-3">
          <MapPin className="w-7 h-7 text-black" />
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            {sites.map((site) => (
              <button key={site} onClick={() => onSiteFilterChange(site)} className={filterChip(siteFilter === site)}>
                {site}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-7 h-7 text-black" />
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            {INTERIOR_CONFIG.roomTags.map((tag) => (
              <button key={tag} onClick={() => onRoomFilterChange(tag)} className={filterChip(roomFilter === tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {photos.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-xl font-bold text-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            사진이 없습니다.
          </div>
        ) : (
          photos.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border-4 border-black overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL 이라 next/image 최적화 대상이 아니다 */}
              <img src={p.dataUrl} alt="현장사진" className="w-full h-auto object-cover max-h-72 border-b-4 border-black" />
              <div className="p-5 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold px-3 py-1 rounded bg-[#ceb5a7] border-2 border-black">
                      {p.room}
                    </span>
                    <span className="text-xl font-bold">{p.site}</span>
                  </div>
                  <div className="text-base font-semibold mt-2 text-gray-700">{String(p.timestamp)}</div>
                </div>
                <button
                  onClick={() => onDelete(p.id)}
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
  );
}
