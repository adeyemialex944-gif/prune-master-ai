/**
 * Prune Master AI - Device-Local Storage Engine
 * Stores video clips, metadata, and binary Blobs directly inside the user's
 * phone or computer browser (IndexedDB).
 * 
 * Benefits:
 * - 0 MB permanent cloud storage needed.
 * - Complete user privacy: clips stay on user's device.
 * - Clips remain safe and playable even when server restarts or sleeps.
 * - Instant offline playback with zero network buffering.
 */

const DB_NAME = 'PruneMasterDeviceStorage';
const DB_VERSION = 1;
const STORE_CLIPS = 'device_clips';

export interface LocalDeviceClip {
  id: string | number;
  serverClipId?: number;
  videoId?: number;
  title: string;
  duration: number;
  viralityScore?: number;
  reason?: string;
  hook?: string;
  callToAction?: string;
  aspectRatio?: string;
  createdAt: string;
  status: string;
  fileSizeBytes?: number;
  videoBlob?: Blob;
  blobUrl?: string; // ephemeral ObjectURL
  thumbnailBlob?: Blob;
  thumbnailUrl?: string;
}

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this browser/environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CLIPS)) {
        const store = db.createObjectStore(STORE_CLIPS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('serverClipId', 'serverClipId', { unique: false });
      }
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Save or update a clip in the user's device storage
 */
export async function saveClipToDevice(clip: LocalDeviceClip, videoBlob?: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, 'readwrite');
    const store = tx.objectStore(STORE_CLIPS);

    const record: any = {
      ...clip,
      id: String(clip.id),
      serverClipId: clip.serverClipId || (typeof clip.id === 'number' ? clip.id : undefined),
      videoBlob: videoBlob || clip.videoBlob,
      fileSizeBytes: (videoBlob || clip.videoBlob)?.size || clip.fileSizeBytes || 0,
      updatedAt: new Date().toISOString(),
    };

    // Remove ephemeral ObjectURLs before storing in IDB
    delete record.blobUrl;

    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all clips stored on this device
 */
export async function getClipsFromDevice(): Promise<LocalDeviceClip[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CLIPS, 'readonly');
      const store = tx.objectStore(STORE_CLIPS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results: LocalDeviceClip[] = (request.result || []).map((item: any) => {
          let blobUrl: string | undefined = undefined;
          if (item.videoBlob instanceof Blob) {
            try {
              blobUrl = URL.createObjectURL(item.videoBlob);
            } catch (e) {
              console.warn('Could not create ObjectURL for clip', item.id, e);
            }
          }
          return {
            ...item,
            blobUrl,
          };
        });

        // Sort latest first
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error fetching clips from device storage:', err);
    return [];
  }
}

/**
 * Fetch a single clip from device storage
 */
export async function getClipFromDevice(clipId: string | number): Promise<LocalDeviceClip | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, 'readonly');
    const store = tx.objectStore(STORE_CLIPS);
    const request = store.get(String(clipId));

    request.onsuccess = () => {
      const item = request.result;
      if (!item) {
        resolve(null);
        return;
      }
      let blobUrl: string | undefined = undefined;
      if (item.videoBlob instanceof Blob) {
        try {
          blobUrl = URL.createObjectURL(item.videoBlob);
        } catch (e) {
          console.warn('Could not create ObjectURL for clip', item.id, e);
        }
      }
      resolve({
        ...item,
        blobUrl,
      });
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a clip from device storage
 */
export async function deleteClipFromDevice(clipId: string | number): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, 'readwrite');
    const store = tx.objectStore(STORE_CLIPS);
    const request = store.delete(String(clipId));

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Fetch storage usage estimate on user's device
 */
export async function getDeviceStorageEstimate(): Promise<{ usedBytes: number; quotaBytes: number; usedMB: string; quotaMB: string }> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      const usedBytes = est.usage || 0;
      const quotaBytes = est.quota || 0;
      return {
        usedBytes,
        quotaBytes,
        usedMB: (usedBytes / (1024 * 1024)).toFixed(1),
        quotaMB: (quotaBytes / (1024 * 1024)).toFixed(0),
      };
    } catch (e) {
      console.warn('Storage estimate error:', e);
    }
  }
  return { usedBytes: 0, quotaBytes: 0, usedMB: '0.0', quotaMB: 'N/A' };
}

/**
 * Clear all clips saved on this device
 */
export async function clearAllDeviceClips(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, 'readwrite');
    const store = tx.objectStore(STORE_CLIPS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Download a Blob directly to the user's PC / Phone Downloads directory
 */
export function downloadBlobToDisk(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
