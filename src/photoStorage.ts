/**
 * photoStorage.ts
 * 
 * Modul Manajemen Penyimpanan Offline Foto SLRT menggunakan IndexedDB (Vanilla Browser API).
 * Membantu menyimpan berkas Base64 berukuran besar di perangkat tanpa membebani kuota 5MB LocalStorage.
 * Menyediakan sinkronisasi ramah waktu muat cepat dengan sinkronisasi memori (in-memory caching).
 */

export interface ArchivePhotoData {
  fotoKkKtp?: string;
  fotoDepanRumah?: string;
  dokumentasiBukti?: string;
  updatedAt?: number; // Sesuai untuk fungsi pembersihan kedaluwarsa (cleanUpArchive)
}

const DB_NAME = 'slrt_photos_db';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

// Penyimpanan cache dalam memori untuk operasi sinkron yang sangat cepat (seperti pengubahan item list grid)
export const photosArchiveCache: Record<string, ArchivePhotoData> = {};

/**
 * Membuka koneksi ke IndexedDB secara mandiri dengan toleransi kegagalan.
 */
export function openPhotosDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak didukung oleh browser Anda.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    
    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Mengisi in-memory cache dengan seluruh foto dari IndexedDB saat aplikasi pertama kali dimuat.
 */
export async function loadPhotosToCache(): Promise<void> {
  try {
    const db = await openPhotosDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const val = cursor.value;
          if (val && val.id) {
            photosArchiveCache[val.id] = {
              fotoKkKtp: val.fotoKkKtp || '',
              fotoDepanRumah: val.fotoDepanRumah || '',
              dokumentasiBukti: val.dokumentasiBukti || '',
              updatedAt: val.updatedAt || Date.now()
            };
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (err) {
    console.error("Gagal memuat arsip foto dari IndexedDB ke in-memory cache:", err);
  }
}

/**
 * Menyimpan atau memperbarui data foto lokal klien ke dalam arsip IndexedDB.
 * Otomatis memperbarui in-memory cache secara sinkron.
 * 
 * @param id ID unik milik record klien
 * @param photoData Objek parsial berisi foto KTP, Rumah, atau Bukti Dokumen
 */
export async function saveToArchive(id: string, photoData: Partial<ArchivePhotoData>): Promise<void> {
  if (!id) return;

  const current = photosArchiveCache[id] || {
    fotoKkKtp: '',
    fotoDepanRumah: '',
    dokumentasiBukti: '',
  };

  const updated: ArchivePhotoData = {
    fotoKkKtp: photoData.fotoKkKtp !== undefined ? photoData.fotoKkKtp : current.fotoKkKtp,
    fotoDepanRumah: photoData.fotoDepanRumah !== undefined ? photoData.fotoDepanRumah : current.fotoDepanRumah,
    dokumentasiBukti: photoData.dokumentasiBukti !== undefined ? photoData.dokumentasiBukti : current.dokumentasiBukti,
    updatedAt: Date.now() // Perbarui timestamp waktu perekaman terbaru
  };

  // Simpan ke in-memory cache instan
  photosArchiveCache[id] = updated;

  // Persist secara asinkron di latar belakang ke IndexedDB
  try {
    const db = await openPhotosDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      id,
      ...updated
    });
  } catch (err) {
    console.error(`Gagal menyimpan foto ID ${id} ke dalam IndexedDB:`, err);
  }
}

/**
 * Mengambil data foto lengkap klien dari IndexedDB berdasarkan ID.
 * Mengutamakan in-memory cache untuk performa maksimal.
 * 
 * @param id ID unik milik record klien
 */
export async function getFromArchive(id: string): Promise<ArchivePhotoData | null> {
  if (!id) return null;
  
  // Ambil langsung dari memori jika tersedia
  if (photosArchiveCache[id]) {
    return photosArchiveCache[id];
  }

  // Jika tidak, lakukan pencarian asinkron ke database
  try {
    const db = await openPhotosDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => {
        const val = request.result;
        if (val) {
          // Sinkronisasikan kembali ke cache memori lokal
          photosArchiveCache[id] = {
            fotoKkKtp: val.fotoKkKtp || '',
            fotoDepanRumah: val.fotoDepanRumah || '',
            dokumentasiBukti: val.dokumentasiBukti || '',
            updatedAt: val.updatedAt || Date.now()
          };
          resolve(photosArchiveCache[id]);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error(`Gagal mengambil foto ID ${id} dari IndexedDB:`, err);
    return null;
  }
}

/**
 * Melakukan pembersihan berkala pada IndexedDB untuk item yang sudah lampau (eksperimental).
 * Membantu menjaga agar memori penyimpanan HP pengguna tetap sehat.
 * 
 * @param maxAgeDays Masa kedaluwarsa berkas offline (default: 45 hari)
 */
export async function cleanUpArchive(maxAgeDays: number = 45): Promise<void> {
  try {
    const db = await openPhotosDB();
    const msLimit = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const val = cursor.value;
          const valAge = val.updatedAt || 0;
          if (valAge && (now - valAge > msLimit)) {
            console.log(`Membersihkan berkas usang ID: ${val.id} (Umur > ${maxAgeDays} hari)`);
            cursor.delete();
            delete photosArchiveCache[val.id];
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (err) {
    console.error("Gagal menjalankan rutin pembersihan database IndexedDB:", err);
  }
}

/**
 * Fungsi migrasi dari penyimpanan berbasis localStorage lama ke IndexedDB.
 */
export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  try {
    const oldArchiveStr = localStorage.getItem('slrt_local_photos_archive');
    if (oldArchiveStr) {
      const oldArchive = JSON.parse(oldArchiveStr);
      console.log("[Pembersihan] Mendeteksi arsip foto lama di LocalStorage, mengeksekusi migrasi...");
      for (const [id, value] of Object.entries(oldArchive)) {
        if (id && value) {
          const valObj = value as any;
          await saveToArchive(id, {
            fotoKkKtp: valObj.fotoKkKtp || '',
            fotoDepanRumah: valObj.fotoDepanRumah || '',
            dokumentasiBukti: valObj.dokumentasiBukti || ''
          });
        }
      }
      localStorage.removeItem('slrt_local_photos_archive');
      console.log("[Sukses] Migrasi selesai! LocalStorage lama dibebaskan.");
    }
  } catch (err) {
    console.warn("Gagal melakukan migrasi dari LocalStorage ke IndexedDB:", err);
  }
}
