// lib/storage/photoStorage.ts
// 대용량 현장 사진 저장소. localStorage(5MB) 대신
// 안드로이드 앱에서는 @capacitor/filesystem(Directory.Data)에 JPEG 파일을,
// 웹 브라우저에서는 IndexedDB(idb-keyval)에 사진 배열을 저장한다.
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export const LEGACY_PHOTOS_KEY = 'father_photos_v13';
const IDB_PHOTOS_KEY = 'father_photos_v14';
const NATIVE_META_KEY = 'father_photos_meta_v14';
const NATIVE_PHOTO_DIR = 'photos';

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.82;

export interface PhotoRecord {
  id: string;
  dataUrl: string;
  timestamp: string | number;
  site: string;
  room: string;
  [extra: string]: unknown;
}

// 네이티브 환경에서는 이미지 본문을 파일로 빼고 메타데이터만 Preferences에 둔다.
interface NativePhotoMeta extends Omit<PhotoRecord, 'dataUrl'> {
  filePath: string;
}

const isBrowser = () => typeof window !== 'undefined';

// -------------------------------------------------------------
// [1] 이미지 압축 (가로 최대 1600px, JPEG 0.82)
// -------------------------------------------------------------
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
    img.src = src;
  });
}

export async function compressImage(source: string | Blob): Promise<string> {
  const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source);
  try {
    const img = await loadImage(objectUrl ?? (source as string));
    const scale = img.naturalWidth > MAX_WIDTH ? MAX_WIDTH / img.naturalWidth : 1;
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D 컨텍스트를 만들 수 없습니다.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

// -------------------------------------------------------------
// [2] 네이티브(Filesystem) 백엔드
// -------------------------------------------------------------
const stripDataUrlPrefix = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1);

async function readNativeMeta(): Promise<NativePhotoMeta[]> {
  const { value } = await Preferences.get({ key: NATIVE_META_KEY });
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as NativePhotoMeta[]) : [];
  } catch {
    return [];
  }
}

async function writeNativeMeta(meta: NativePhotoMeta[]): Promise<void> {
  await Preferences.set({ key: NATIVE_META_KEY, value: JSON.stringify(meta) });
}

async function writeNativeFile(photo: PhotoRecord): Promise<NativePhotoMeta> {
  const { dataUrl, ...rest } = photo;
  const filePath = `${NATIVE_PHOTO_DIR}/${photo.id}.jpg`;
  await Filesystem.writeFile({
    path: filePath,
    data: stripDataUrlPrefix(dataUrl),
    directory: Directory.Data,
    recursive: true,
  });
  return { ...rest, filePath };
}

async function readNativePhotos(): Promise<PhotoRecord[]> {
  const meta = await readNativeMeta();
  const photos = await Promise.all(
    meta.map(async ({ filePath, ...rest }) => {
      try {
        const { data } = await Filesystem.readFile({ path: filePath, directory: Directory.Data });
        const base64 = typeof data === 'string' ? data : await blobToBase64(data);
        return { ...rest, dataUrl: `data:image/jpeg;base64,${base64}` } as PhotoRecord;
      } catch {
        return null; // 파일이 사라진 항목은 건너뛴다.
      }
    }),
  );
  return photos.filter((p): p is PhotoRecord => p !== null);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(stripDataUrlPrefix(String(reader.result)));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// -------------------------------------------------------------
// [3] 웹(IndexedDB) 백엔드
// -------------------------------------------------------------
async function readIdbPhotos(): Promise<PhotoRecord[]> {
  const photos = await idbGet<PhotoRecord[]>(IDB_PHOTOS_KEY);
  return Array.isArray(photos) ? photos : [];
}

async function writeIdbPhotos(photos: PhotoRecord[]): Promise<void> {
  await idbSet(IDB_PHOTOS_KEY, photos);
}

// -------------------------------------------------------------
// [4] 기존 localStorage 사진 자동 마이그레이션
// -------------------------------------------------------------
let migration: Promise<void> | null = null;

export function migrateLegacyPhotos(): Promise<void> {
  if (!migration) {
    migration = runMigration().catch((err) => {
      migration = null; // 실패 시 다음 호출에서 재시도한다. 원본 키는 보존된다.
      throw err;
    });
  }
  return migration;
}

async function runMigration(): Promise<void> {
  if (!isBrowser()) return;
  const raw = window.localStorage.getItem(LEGACY_PHOTOS_KEY);
  if (raw === null) return;

  let legacy: PhotoRecord[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      legacy = (parsed as PhotoRecord[]).filter((p) => p && typeof p.dataUrl === 'string');
    }
  } catch {
    // 손상된 데이터는 이전할 수 없으므로 키만 정리한다.
  }

  if (legacy.length > 0) {
    if (Capacitor.isNativePlatform()) {
      const meta = await readNativeMeta();
      const known = new Set(meta.map((m) => m.id));
      for (const photo of legacy) {
        if (known.has(photo.id)) continue;
        meta.push(await writeNativeFile(photo));
      }
      await writeNativeMeta(meta);
    } else {
      const current = await readIdbPhotos();
      const known = new Set(current.map((p) => p.id));
      await writeIdbPhotos([...current, ...legacy.filter((p) => !known.has(p.id))]);
    }
  }
  window.localStorage.removeItem(LEGACY_PHOTOS_KEY);
}

// -------------------------------------------------------------
// [5] 공개 API
// -------------------------------------------------------------
export async function loadPhotos(): Promise<PhotoRecord[]> {
  if (!isBrowser()) return [];
  await migrateLegacyPhotos();
  return Capacitor.isNativePlatform() ? readNativePhotos() : readIdbPhotos();
}

export async function addPhoto(photo: PhotoRecord): Promise<void> {
  await migrateLegacyPhotos();
  if (Capacitor.isNativePlatform()) {
    const meta = await readNativeMeta();
    meta.push(await writeNativeFile(photo));
    await writeNativeMeta(meta);
  } else {
    const photos = await readIdbPhotos();
    await writeIdbPhotos([...photos, photo]);
  }
}

export async function updatePhoto(id: string, patch: Partial<Omit<PhotoRecord, 'id' | 'dataUrl'>>): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const meta = await readNativeMeta();
    await writeNativeMeta(meta.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  } else {
    const photos = await readIdbPhotos();
    await writeIdbPhotos(photos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
}

export async function deletePhoto(id: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const meta = await readNativeMeta();
    const target = meta.find((m) => m.id === id);
    if (target) {
      await Filesystem.deleteFile({ path: target.filePath, directory: Directory.Data }).catch(() => {});
    }
    await writeNativeMeta(meta.filter((m) => m.id !== id));
  } else {
    const photos = await readIdbPhotos();
    await writeIdbPhotos(photos.filter((p) => p.id !== id));
  }
}
