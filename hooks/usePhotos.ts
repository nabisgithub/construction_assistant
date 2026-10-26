'use client';
// hooks/usePhotos.ts
// 스탬프 카메라 촬영 · 비동기 사진 저장소(IndexedDB / Filesystem) · 현장/공간 이중 필터.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addPhoto,
  compressImage,
  deletePhoto,
  loadPhotos,
  type PhotoRecord,
} from '@/lib/storage/photoStorage';

const ALL = '전체';

// id 는 촬영 시각(Date.now) 문자열이므로 숫자 내림차순 = 최신순.
const newestFirst = (a: PhotoRecord, b: PhotoRecord) => Number(b.id) - Number(a.id);

function drawStamp(ctx: CanvasRenderingContext2D, width: number, height: number, text: string) {
  const barHeight = Math.max(height * 0.08, 70);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, height - barHeight, width, barHeight);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${Math.max(barHeight * 0.42, 26)}px "Pretendard", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 30, height - barHeight / 2);
}

export function usePhotos() {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [siteFilter, setSiteFilter] = useState(ALL);
  const [roomFilter, setRoomFilter] = useState(ALL);

  useEffect(() => {
    let cancelled = false;
    loadPhotos()
      .then((loaded) => {
        if (!cancelled) setPhotos([...loaded].sort(newestFirst));
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  /** 촬영 원본을 가로 1600px 이하로 줄이며 스탬프를 찍고 저장한다. */
  const capturePhoto = useCallback(async (file: File, siteName: string, room: string) => {
    const now = new Date();
    const dateStr =
      now.toLocaleDateString('ko-KR') + ' ' + now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const site = siteName.trim();
    const stampText = `${site ? `[${site}] ` : ''}${room} · ${dateStr}`;

    const dataUrl = await compressImage(file, (ctx, w, h) => drawStamp(ctx, w, h, stampText));
    const photo: PhotoRecord = {
      id: Date.now().toString(),
      dataUrl,
      timestamp: dateStr,
      site: site || '현장 미기재',
      room,
    };
    await addPhoto(photo);
    setPhotos((prev) => [photo, ...prev]);
    return photo;
  }, []);

  const removePhoto = useCallback(async (id: string) => {
    await deletePhoto(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const sites = useMemo(() => [ALL, ...Array.from(new Set(photos.map((p) => p.site)))], [photos]);

  /** 음성 명령용: 말한 현장명을 촬영된 현장 목록과 느슨하게 대조해 필터를 건다. 적용된 현장명을 반환. */
  const applyFilter = useCallback(
    (site: string | null, room: string | null) => {
      const norm = (s: string) => s.replace(/\s+/g, '');
      const matched = site
        ? sites.find((s) => s !== ALL && (norm(s).includes(norm(site)) || norm(site).includes(norm(s))))
        : undefined;
      setSiteFilter(matched ?? ALL);
      setRoomFilter(room ?? ALL);
      return matched ?? null;
    },
    [sites],
  );

  const displayedPhotos = useMemo(
    () =>
      photos.filter(
        (p) => (siteFilter === ALL || p.site === siteFilter) && (roomFilter === ALL || p.room === roomFilter),
      ),
    [photos, siteFilter, roomFilter],
  );

  return {
    photos,
    displayedPhotos,
    sites,
    siteFilter,
    setSiteFilter,
    roomFilter,
    setRoomFilter,
    applyFilter,
    capturePhoto,
    removePhoto,
  };
}
