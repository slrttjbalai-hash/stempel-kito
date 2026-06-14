import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Clipboard, 
  Check, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Upload, 
  Printer, 
  Search, 
  Filter, 
  Wand2, 
  Building2, 
  MapPin, 
  RotateCcw, 
  Sparkles, 
  Info, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Users, 
  MessageSquare,
  ChevronDown,
  Eye,
  Settings,
  Lock,
  Shield,
  Activity,
  Map,
  Clock,
  Camera,
  UserCheck
} from 'lucide-react';

import { motion } from 'motion/react';

import { SLRTRecord, TANJUNGBALAI_LOCATIONS, INITIAL_RECORDS, FacilitatorUser, INITIAL_FACILITATORS, getSafeBase64Url, KRITERIA_SOSIAL_EKONOMI, KRITERIA_KELAYAKAN_HUNI, KRITERIA_BANTUAN_SOSIAL, KELURAHAN_COORDS } from './types';
import { jsPDF } from 'jspdf';
import BentoRecordDetails from './components/BentoRecordDetails';
import SmartParserTab from './components/SmartParserTab';
import HelpTab from './components/HelpTab';
import DashboardSummary from './components/DashboardSummary';
import NikValidationOverlay from './components/NikValidationOverlay';
import { SidebarListSkeleton, BentoDetailsSkeleton } from './components/SkeletonLoader';
import * as XLSX from 'xlsx';
import { 
  photosArchiveCache, 
  loadPhotosToCache, 
  saveToArchive, 
  cleanUpArchive, 
  migrateLocalStorageToIndexedDB 
} from './photoStorage';

function parseMonthAndYear(dateStr: string) {
  if (!dateStr) return null;
  const lower = dateStr.toLowerCase();
  
  // Extract year which is 4 digits
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
  
  let month = null;
  if (lower.includes('januari') || lower.includes('jan')) month = 1;
  else if (lower.includes('februari') || lower.includes('feb')) month = 2;
  else if (lower.includes('maret') || lower.includes('mar')) month = 3;
  else if (lower.includes('april') || lower.includes('apr')) month = 4;
  else if (lower.includes('mei') || lower.includes('may')) month = 5;
  else if (lower.includes('juni') || lower.includes('jun')) month = 6;
  else if (lower.includes('juli') || lower.includes('jul')) month = 7;
  else if (lower.includes('agustus') || lower.includes('agu') || lower.includes('aug')) month = 8;
  else if (lower.includes('september') || lower.includes('sep')) month = 9;
  else if (lower.includes('oktober') || lower.includes('okt') || lower.includes('oct')) month = 10;
  else if (lower.includes('november') || lower.includes('nov')) month = 11;
  else if (lower.includes('desember') || lower.includes('des') || lower.includes('dec')) month = 12;
  
  if (month && year) {
    return { month, year, value: year * 12 + month };
  }
  return null;
}

function parseVerificationDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();
  if (!cleanStr) return null;

  // Try standard Date parsing
  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) return d;

  // Indonesian month mapping
  const monthsIndo: { [key: string]: number } = {
    'januari': 0, 'jan': 0,
    'februari': 1, 'feb': 1,
    'maret': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'mei': 4,
    'juni': 5, 'jun': 5,
    'juli': 6, 'jul': 6,
    'agustus': 7, 'agt': 7, 'agu': 7,
    'september': 8, 'sep': 8,
    'oktober': 9, 'okt': 9,
    'november': 10, 'nov': 10,
    'desember': 11, 'des': 11
  };

  let normalized = cleanStr.toLowerCase();
  normalized = normalized.replace(/senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu/g, '');
  normalized = normalized.replace(/[,.-]/g, ' ');
  const parts = normalized.split(/\s+/).filter(Boolean);
  
  if (parts.length >= 3) {
    let day = 1;
    let month = 0;
    let year = new Date().getFullYear();
    let foundMonth = false;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (monthsIndo[part] !== undefined) {
        month = monthsIndo[part];
        foundMonth = true;
        if (i > 0) {
          const prev = parseInt(parts[i - 1], 10);
          if (!isNaN(prev) && prev >= 1 && prev <= 31) {
            day = prev;
          }
        }
        if (i < parts.length - 1) {
          const next = parseInt(parts[i + 1], 10);
          if (!isNaN(next) && next > 2000) {
            year = next;
          }
        }
        break;
      }
    }

    if (foundMonth) {
      return new Date(year, month, day);
    }

    const num1 = parseInt(parts[0], 10);
    const num2 = parseInt(parts[1], 10);
    const num3 = parseInt(parts[2], 10);
    if (!isNaN(num1) && !isNaN(num2) && !isNaN(num3)) {
      if (num1 > 1000) {
        return new Date(num1, num2 - 1, num3);
      } else if (num3 > 1000) {
        return new Date(num3, num2 - 1, num1);
      }
    }
  }

  return null;
}

// Helper to strip heavy base64 image strings from record properties to keep LocalStorage size under 5MB quota
function stripPhotosFromRecord(rec: any): any {
  if (!rec) return rec;
  const stripped = { ...rec };
  const keysToClean = [
    'fotoKkKtp', 'foto_ktp_url', 'foto_kk_ktp', 'fotokkktp', 'fotoKk', 'fotoKtp',
    'fotoDepanRumah', 'foto_hunian_url', 'foto_depan_rumah', 'fotodepanrumah', 'fotoRumah',
    'dokumentasiBukti', 'dokumentasibukti', 'dokumentasi_bukti', 'dokumentasi', 'fotoOps', 'foto_ops', 'foto_ops_url'
  ];
  keysToClean.forEach(key => {
    if (stripped[key] && typeof stripped[key] === 'string' && stripped[key].length > 150) {
      stripped[key] = '';
    }
  });
  return stripped;
}

// Helper to strip heavy base64 image strings from a list of records
function stripPhotosFromRecordList(list: any[]): any[] {
  if (!list) return [];
  return list.map(stripPhotosFromRecord);
}

// Helper to save a record to local overrides
function saveRecordOverride(rec: SLRTRecord) {
  try {
    const saved = localStorage.getItem('slrt_record_overrides') || '{}';
    const overrides = JSON.parse(saved);
    overrides[rec.id] = stripPhotosFromRecord(rec);
    localStorage.setItem('slrt_record_overrides', JSON.stringify(overrides));
  } catch (e) {
    console.error("Gagal menyimpan override rekaman lokal:", e);
  }
}

// Helper to remove a record from local overrides
function deleteRecordOverride(id: string) {
  try {
    const saved = localStorage.getItem('slrt_record_overrides') || '{}';
    const overrides = JSON.parse(saved);
    if (overrides[id]) {
      delete overrides[id];
    }
    // Clean up any remaining legacy entries as well to recover storage space
    const cleaned: any = {};
    Object.keys(overrides).forEach(key => {
      cleaned[key] = stripPhotosFromRecord(overrides[key]);
    });
    localStorage.setItem('slrt_record_overrides', JSON.stringify(cleaned));
  } catch (e) {
    console.error("Gagal menghapus override rekaman lokal:", e);
  }
}

// Helper to merge cloud records with local overrides
function mergeRecordsWithOverrides(cloudRecords: SLRTRecord[]): SLRTRecord[] {
  try {
    const savedOver = localStorage.getItem('slrt_record_overrides');
    if (!savedOver) return cloudRecords;
    const overrides = JSON.parse(savedOver);
    
    const mergedList = [...cloudRecords];
    const deletedIdsString = localStorage.getItem('slrt_deleted_record_ids') || '[]';
    let deletedIds: string[] = [];
    try { deletedIds = JSON.parse(deletedIdsString); } catch(e) {}

    Object.keys(overrides).forEach(id => {
      // Do not include deleted overrides
      if (deletedIds.includes(id)) {
        return;
      }
      const existingIndex = mergedList.findIndex(r => r.id === id);
      if (existingIndex !== -1) {
        const cloudRec = mergedList[existingIndex];
        const localRec = overrides[id];
        
        // Cloud is source of truth for ground-truth verification!
        // If the cloud is marked as inspected/visited ('Sudah Dikunjungi'),
        // we must NOT downgrade it to 'Belum Dikunjungi' via a stale local override.
        const cloudIsVisited = cloudRec.statusKunjungan === 'Sudah Dikunjungi';
        const localIsVisited = localRec.statusKunjungan === 'Sudah Dikunjungi';

        const mergedRecord = {
          ...cloudRec,
          ...localRec
        };

        if (cloudIsVisited && !localIsVisited) {
          // Retain ground-truth verification data
          mergedRecord.statusKunjungan = 'Sudah Dikunjungi';
          mergedRecord.tanggalPemeriksaan = cloudRec.tanggalPemeriksaan || localRec.tanggalPemeriksaan;
          mergedRecord.catatanPemeriksa = cloudRec.catatanPemeriksa || localRec.catatanPemeriksa;
          mergedRecord.dokumentasiBukti = cloudRec.dokumentasiBukti || localRec.dokumentasiBukti;
          mergedRecord.namaPendata = cloudRec.namaPendata || localRec.namaPendata;
          mergedRecord.fotoKkKtp = cloudRec.fotoKkKtp || localRec.fotoKkKtp;
          mergedRecord.fotoDepanRumah = cloudRec.fotoDepanRumah || localRec.fotoDepanRumah;
          mergedRecord.foto_hunian_url = cloudRec.foto_hunian_url || localRec.foto_hunian_url;
          mergedRecord.foto_ktp_url = cloudRec.foto_ktp_url || localRec.foto_ktp_url;
          mergedRecord.catatan_pendata = cloudRec.catatan_pendata || localRec.catatan_pendata;
        }

        // Keep cloud photo base64 strings if local doesn't have them
        if (cloudIsVisited && localIsVisited) {
          if (!mergedRecord.fotoKkKtp) mergedRecord.fotoKkKtp = cloudRec.fotoKkKtp;
          if (!mergedRecord.fotoDepanRumah) mergedRecord.fotoDepanRumah = cloudRec.fotoDepanRumah;
          if (!mergedRecord.dokumentasiBukti) mergedRecord.dokumentasiBukti = cloudRec.dokumentasiBukti;
          if (!mergedRecord.foto_hunian_url) mergedRecord.foto_hunian_url = cloudRec.foto_hunian_url;
          if (!mergedRecord.foto_ktp_url) mergedRecord.foto_ktp_url = cloudRec.foto_ktp_url;
        }

        mergedList[existingIndex] = normalizeRecord(mergedRecord);
      } else {
        // Completely local record
        mergedList.unshift(normalizeRecord(overrides[id]));
      }
    });
    return mergedList;
  } catch (e) {
    console.error("Gagal melakukan merge data lokal dengan awan:", e);
    return cloudRecords;
  }
}

// Helper to normalize record properties from various possible client/cloud variations
function normalizeRecord(rec: any): SLRTRecord {
  if (!rec) return rec;
  const id = rec.id || '';

  let fotoKkKtp = rec.fotoKkKtp || rec.foto_ktp_url || rec.foto_kk_ktp || rec.fotokkktp || rec.fotoKk || rec.fotoKtp || '';
  let fotoDepanRumah = rec.fotoDepanRumah || rec.foto_hunian_url || rec.foto_depan_rumah || rec.fotodepanrumah || rec.fotoRumah || '';
  let dokumentasiBukti = rec.dokumentasiBukti || rec.dokumentasibukti || rec.dokumentasi_bukti || rec.dokumentasi || rec.fotoOps || rec.foto_ops || rec.foto_ops_url || '';

  if (id) {
    try {
      let needsSave = false;
      const updatePayload: any = {};
      const cacheVal = photosArchiveCache[id];

      if (fotoKkKtp && fotoKkKtp.length > 150 && (!cacheVal || cacheVal.fotoKkKtp !== fotoKkKtp)) {
        updatePayload.fotoKkKtp = fotoKkKtp;
        needsSave = true;
      }
      if (fotoDepanRumah && fotoDepanRumah.length > 150 && (!cacheVal || cacheVal.fotoDepanRumah !== fotoDepanRumah)) {
        updatePayload.fotoDepanRumah = fotoDepanRumah;
        needsSave = true;
      }
      if (dokumentasiBukti && dokumentasiBukti.length > 150 && (!cacheVal || cacheVal.dokumentasiBukti !== dokumentasiBukti)) {
        updatePayload.dokumentasiBukti = dokumentasiBukti;
        needsSave = true;
      }

      if (needsSave) {
        saveToArchive(id, updatePayload);
      }

      // Restore if empty in current record but available in local photos vault archive cache
      if (cacheVal) {
        if (!fotoKkKtp && cacheVal.fotoKkKtp) {
          fotoKkKtp = cacheVal.fotoKkKtp;
        }
        if (!fotoDepanRumah && cacheVal.fotoDepanRumah) {
          fotoDepanRumah = cacheVal.fotoDepanRumah;
        }
        if (!dokumentasiBukti && cacheVal.dokumentasiBukti) {
          dokumentasiBukti = cacheVal.dokumentasiBukti;
        }
      }
    } catch (e) {
      console.error("Gagal sinkronisasi arsip foto lokal (IndexedDB Cache):", e);
    }
  }

  const statusKunjungan = rec.statusKunjungan || rec.status_kunjungan || rec.statuskunjungan || 'Belum Dikunjungi';
  const tanggalPemeriksaan = rec.tanggalPemeriksaan || rec.tanggal_pemeriksaan || rec.tanggalpemeriksaan || '';
  const catatanPemeriksa = rec.catatanPemeriksa || rec.catatan_pendata || rec.catatan_pemeriksa || rec.catatanpemeriksa || '';
  const namaPendata = rec.namaPendata || rec.nama_pendata || rec.namapendata || rec.namaFasilitator || '';

  // Parse or default Indikator Sosial Ekonomi
  let indikatorSosialEkonomi = rec.indikatorSosialEkonomi || [];
  if (indikatorSosialEkonomi.length === 0) {
    if (rec.status?.toLowerCase().includes('sangat')) {
      indikatorSosialEkonomi = [
        "Pendapatan di bawah UMR / tidak menentu",
        "Pekerjaan Kepala Keluarga serabutan / non-formal",
        "Tidak memiliki jaminan kesehatan mandiri"
      ];
    } else if (rec.status?.toLowerCase().includes('miskin')) {
      indikatorSosialEkonomi = [
        "Pendapatan di bawah UMR / tidak menentu",
        "Pekerjaan Kepala Keluarga serabutan / non-formal"
      ];
    } else if (rec.status?.toLowerCase().includes('rentan')) {
      indikatorSosialEkonomi = [
        "Pendapatan di bawah UMR / tidak menentu"
      ];
    }
  }

  // Parse or default Kelayakan Huni
  let kelayakanHuni = rec.kelayakanHuni || [];
  if (kelayakanHuni.length === 0) {
    if (rec.statusRumah?.toLowerCase().includes('sewa') || rec.statusRumah?.toLowerCase().includes('kontrak')) {
      kelayakanHuni.push("Status tinggal menyewa / sewa bulanan / menumpang keluarga");
    } else if (rec.statusRumah?.toLowerCase().includes('numpang') || rec.statusRumah?.toLowerCase().includes('menumpang')) {
      kelayakanHuni.push("Status tinggal menyewa / sewa bulanan / menumpang keluarga");
    }

    if (rec.jenisPenerangan?.toLowerCase().includes('numpang') || rec.jenisPenerangan?.toLowerCase().includes('tetangga')) {
      kelayakanHuni.push("Penerangan meminjam tetangga / PLN subsidi numpang");
    }

    if (rec.mck?.toLowerCase().includes('tidak layak') || rec.mck?.toLowerCase().includes('umum') || rec.mck?.toLowerCase().includes('kurang')) {
      kelayakanHuni.push("MCK menumpang / umum / tidak layak");
    }
    
    if (id === 'rec-2') {
      kelayakanHuni.push("Atap rumah bocor parah / seng keropos");
    }
  }

  // Parse or default Bantuan Diterima List
  let bantuanDiterimaList = rec.bantuanDiterimaList || [];
  if (bantuanDiterimaList.length === 0 && rec.bantuanDiterima) {
    const rawVal = rec.bantuanDiterima;
    if (rawVal && rawVal !== 'Belum Ada' && rawVal !== 'Belum Terdaftar') {
      bantuanDiterimaList = rawVal.split(',').map((s: string) => s.trim()).filter((s: string) => s && s.toLowerCase() !== 'belum ada');
    }
  }

  // Generate fallback Status History
  let statusHistory = rec.statusHistory || [];
  if (statusHistory.length === 0) {
    statusHistory = [
      {
        status: 'Dibuat',
        timestamp: rec.hariTanggal || 'Senin, 01 Juni 2026',
        note: rec.diinputOleh === 'Warga' ? 'Aduan dilaporkan mandiri oleh warga melalui web portal.' : 'Aduan diregistrasi secara resmi oleh Petugas Admin Dinas Sosial Kota Tanjungbalai.',
        updatedBy: rec.diinputOleh === 'Warga' ? rec.namaKlien : 'Admin Dinsos'
      }
    ];

    if (rec.namaFasilitator && rec.namaFasilitator !== '-') {
      statusHistory.push({
        status: 'Ditugaskan',
        timestamp: rec.hariTanggal || 'Senin, 01 Juni 2026',
        note: `Ditugaskan secara otomatis kepada Petugas Fasilitator Wilayah: ${rec.namaFasilitator}.`,
        updatedBy: 'Sistem SLRT'
      });
    }

    if (statusKunjungan === 'Sudah Dikunjungi') {
      statusHistory.push({
        status: 'Diverifikasi',
        timestamp: rec.tanggalPemeriksaan || 'Kamis, 04 Juni 2026',
        note: catatanPemeriksa || 'Kunjungan rumah & verifikasi 18 instrumen kelayakan di lapangan dinyatakan selesai dan sah.',
        updatedBy: namaPendata || rec.namaFasilitator || 'Fasilitator Lapangan'
      });
    }
  }

  // Parse or resolve latitude and longitude
  let latitude = rec.latitude !== undefined ? Number(rec.latitude) : undefined;
  let longitude = rec.longitude !== undefined ? Number(rec.longitude) : undefined;

  if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
    const kel = rec.kelurahan || '';
    const center = KELURAHAN_COORDS[kel] || { lat: 2.9645, lng: 99.8005 };

    // Simple deterministic hash based on name to spread visual coordinates slightly
    const hashString = rec.namaKlien || id || '';
    let hashVal = 0;
    for (let i = 0; i < hashString.length; i++) {
      hashVal += hashString.charCodeAt(i);
    }
    const angle = ((hashVal * 17) % 360) * Math.PI / 180;
    const radius = 0.0012 * ((hashVal % 10) / 10 + 0.3); // spread out up to 130 meters

    latitude = Number((center.lat + Math.sin(angle) * radius).toFixed(6));
    longitude = Number((center.lng + Math.cos(angle) * radius).toFixed(6));
  }

  return {
    ...rec,
    statusKunjungan,
    fotoKkKtp,
    fotoDepanRumah,
    dokumentasiBukti,
    foto_ktp_url: fotoKkKtp,
    foto_hunian_url: fotoDepanRumah,
    catatan_pendata: catatanPemeriksa,
    tanggalPemeriksaan,
    catatanPemeriksa,
    namaPendata,
    indikatorSosialEkonomi,
    kelayakanHuni,
    bantuanDiterimaList,
    statusHistory,
    latitude,
    longitude
  };
}

// Map CSV header variants to SLRTRecord keys
const CSV_HEADER_MAP: Record<string, keyof SLRTRecord> = {
  'id dokumen': 'id',
  'id': 'id',
  'nama klien / penerima': 'namaKlien',
  'nama klien': 'namaKlien',
  'nama': 'namaKlien',
  'kecamatan': 'kecamatan',
  'kelurahan': 'kelurahan',
  'alamat lengkap klien': 'alamatKlien',
  'alamat lengkap': 'alamatKlien',
  'alamat': 'alamatKlien',
  'no telepon / wa': 'noTelpon',
  'no telpon / wa': 'noTelpon',
  'no telepon': 'noTelpon',
  'no telpon': 'noTelpon',
  'kelengkapan berkas kependudukan': 'dokumen',
  'kelengkapan berkas': 'dokumen',
  'dokumen': 'dokumen',
  'status kesejahteraan (dtks)': 'status',
  'status dtks': 'status',
  'status kesejahteraan': 'status',
  'status': 'status',
  'estimasi penghasilan bulanan': 'pendapatanPerbulan',
  'pendapatan perbulan': 'pendapatanPerbulan',
  'pendapatan': 'pendapatanPerbulan',
  'status kepemilikan rumah': 'statusRumah',
  'status rumah': 'statusRumah',
  'sumber penerangan utama': 'jenisPenerangan',
  'sumber penerangan': 'jenisPenerangan',
  'jenis penerangan': 'jenisPenerangan',
  'penerangan': 'jenisPenerangan',
  'kondisi fasilitas sanitasi mck': 'mck',
  'kondisi mck': 'mck',
  'fasilitas mck': 'mck',
  'mck': 'mck',
  'bantuan sosial diterima': 'bantuanDiterima',
  'bantuan diterima': 'bantuanDiterima',
  'bantuan sosial': 'bantuanDiterima',
  'bantuan': 'bantuanDiterima',
  'masalah / deskripsi kasus': 'jenisPengaduan',
  'masalah': 'jenisPengaduan',
  'deskripsi kasus': 'jenisPengaduan',
  'jenis pengaduan': 'jenisPengaduan',
  'jenis layanan rujukan': 'jenisLayanan',
  'jenis layanan': 'jenisLayanan',
  'layanan': 'jenisLayanan',
  'sumber input awal': 'diinputOleh',
  'sumber input': 'diinputOleh',
  'diinput oleh': 'diinputOleh',
  'diinputoleh': 'diinputOleh',
  'tanggal input / registrasi': 'hariTanggal',
  'tanggal input': 'hariTanggal',
  'tanggal registrasi': 'hariTanggal',
  'haritanggal': 'hariTanggal',
  'hari tanggal': 'hariTanggal',
  'fasilitator lapangan': 'namaFasilitator',
  'nama fasilitator': 'namaFasilitator',
  'nama pendata': 'namaPendata',
  'namapendata': 'namaPendata',
  'tanggal verifikasi lapangan (audit)': 'tanggalPemeriksaan',
  'tanggal verifikasi': 'tanggalPemeriksaan',
  'tanggalpemeriksaan': 'tanggalPemeriksaan',
  'catatan petugas lapangan (verifikasi)': 'catatanPemeriksa',
  'catatan pemeriksa': 'catatanPemeriksa',
  'catatandata': 'catatanPemeriksa',
  'status verifikasi kunjungan': 'statusKunjungan',
  'status kunjungan': 'statusKunjungan',
  'statuskunjungan': 'statusKunjungan',
  'foto kk / ktp': 'fotoKkKtp',
  'foto kk': 'fotoKkKtp',
  'foto depan rumah': 'fotoDepanRumah',
  'foto depan': 'fotoDepanRumah',
  'dokumentasi bukti': 'dokumentasiBukti',
  'bukti': 'dokumentasiBukti',
  'indikator kerentanan sosial ekonomi': 'indikatorSosialEkonomi',
  'indikator sosial ekonomi': 'indikatorSosialEkonomi',
  'kerentanan sosial ekonomi': 'indikatorSosialEkonomi',
  'kondisi fisik hunian': 'kelayakanHuni',
  'kelayakan huni': 'kelayakanHuni',
  'kelayakan rumah': 'kelayakanHuni',
  'program bantuan diterima list': 'bantuanDiterimaList',
  'bantuan diterima list': 'bantuanDiterimaList',
  'daftar bantuan diterima': 'bantuanDiterimaList'
};

// Help parse a CSV line considering double quoted sub-segments containing commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export default function App() {
  // State for database records
  const [records, setRecords] = useState<SLRTRecord[]>(() => {
    const saved = localStorage.getItem('slrt_records');
    let loaded: SLRTRecord[] = saved ? JSON.parse(saved) : INITIAL_RECORDS;

    const deletedIdsString = localStorage.getItem('slrt_deleted_record_ids') || '[]';
    try {
      const deletedIds = JSON.parse(deletedIdsString);
      if (Array.isArray(deletedIds) && deletedIds.length > 0) {
        loaded = loaded.filter(rec => 
          !deletedIds.includes(rec.id) && 
          !rec.isDeleted && 
          (rec as any).isDeleted !== 'true' && 
          rec.statusKunjungan !== 'Dihapus' && 
          rec.statusKunjungan !== 'DELETED'
        );
      } else {
        loaded = loaded.filter(rec => 
          !rec.isDeleted && 
          (rec as any).isDeleted !== 'true' && 
          rec.statusKunjungan !== 'Dihapus' && 
          rec.statusKunjungan !== 'DELETED'
        );
      }
    } catch (e) {
      loaded = loaded.filter(rec => 
        !rec.isDeleted && 
        (rec as any).isDeleted !== 'true' && 
        rec.statusKunjungan !== 'Dihapus' && 
        rec.statusKunjungan !== 'DELETED'
      );
    }
    return mergeRecordsWithOverrides(loaded.map(normalizeRecord));
  });

  // User Authentication & Role Perspective
  const [userRole, setUserRole] = useState<'admin' | 'facilitator' | 'warga'>(() => {
    const saved = localStorage.getItem('slrt_user_role');
    const role = (saved as 'admin' | 'facilitator' | 'warga') || 'admin';
    return role;
  });

  // Active secure session state
  const [session, setSession] = useState<{
    role: 'admin' | 'facilitator' | 'warga';
    email?: string;
    name?: string;
    nik?: string;
    id?: string;
    regionKecamatan?: string;
    regionKelurahan?: string;
  } | null>(() => {
    const saved = localStorage.getItem('slrt_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Registered Field Facilitators state
  const [facilitators, setFacilitators] = useState<FacilitatorUser[]>(() => {
    const saved = localStorage.getItem('slrt_facilitators');
    let fList = saved ? JSON.parse(saved) : INITIAL_FACILITATORS;
    
    // Filter out deleted facilitators
    try {
      const deletedFasString = localStorage.getItem('slrt_deleted_facilitator_ids') || '[]';
      const deletedFasIds = JSON.parse(deletedFasString);
      if (Array.isArray(deletedFasIds) && deletedFasIds.length > 0) {
        fList = fList.filter((f: any) => f && !deletedFasIds.includes(f.id));
      }
    } catch (e) {
      console.error("Gagal menyaring petugas lapangan yang dihapus:", e);
    }

    const savedOverrides = localStorage.getItem('slrt_status_overrides');
    if (savedOverrides) {
      try {
        const overrides = JSON.parse(savedOverrides);
        return fList.map((f: any) => {
          if (f && overrides[f.id]) {
            return { ...f, status: overrides[f.id] };
          }
          return f;
        });
      } catch (e) {
        console.error("Error parsing local overrides:", e);
      }
    }
    return fList;
  });

  const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbzvANvDUP6rS1NSJ6lgpGOaIRy3UAzCGOIsZMYh4sbiutpq2cnn92HNkZiGebdqCFbEcQ/exec";

  // Reconcile list of facilitators with administrative status overrides
  const getReconciledFacilitators = (rawFacs: FacilitatorUser[]): FacilitatorUser[] => {
    let filteredFacs = rawFacs;
    try {
      const deletedFasString = localStorage.getItem('slrt_deleted_facilitator_ids') || '[]';
      const deletedFasIds = JSON.parse(deletedFasString);
      if (Array.isArray(deletedFasIds) && deletedFasIds.length > 0) {
        filteredFacs = rawFacs.filter(f => f && !deletedFasIds.includes(f.id));
      }
    } catch (e) {
      console.error("Gagal menyaring petugas lapangan yang dihapus:", e);
    }

    const savedOverrides = localStorage.getItem('slrt_status_overrides');
    if (!savedOverrides) return filteredFacs;
    try {
      const overrides = JSON.parse(savedOverrides);
      return filteredFacs.map(f => {
        if (f && overrides[f.id]) {
          return { ...f, status: overrides[f.id] };
        }
        return f;
      });
    } catch (e) {
      console.error("Gagal merekonsoliasi status kustom:", e);
      return filteredFacs;
    }
  };

  // State for synchronization status
  const [cloudLoading, setCloudLoading] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);

  // Count local overrides pending cloud synchronization confirmation
  const unsyncedCount = useMemo(() => {
    try {
      const savedOver = localStorage.getItem('slrt_record_overrides');
      if (!savedOver) return 0;
      const overrides = JSON.parse(savedOver);
      return Object.keys(overrides).length;
    } catch (e) {
      return 0;
    }
  }, [records]);

  // Synchronize all offline changes to Google Sheets
  const handleSyncAllOfflineChanges = async () => {
    try {
      const savedOver = localStorage.getItem('slrt_record_overrides');
      if (!savedOver) return;
      const overrides = JSON.parse(savedOver);
      const keys = Object.keys(overrides);
      if (keys.length === 0) {
        alert("Seluruh data Anda telah sepenuhnya tersinkronisasi dengan database awan Google Sheets!");
        return;
      }
      
      setCloudLoading(true);
      let success = 0;
      for (const id of keys) {
        const rec = overrides[id];
        try {
          await fetch(GOOGLE_SHEETS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
              "Content-Type": "text/plain"
            },
            body: JSON.stringify({
              action: 'syncRecord',
              data: rec
            })
          });
          success++;
        } catch (e) {
          console.error("Gagal sinkronisasi data ID:", id, e);
        }
      }
      
      // Force refresh of initial data from cloud which also prunes matches
      await refreshFromCloud(false);
      
      alert(`✓ Sinkronisasi Berhasil!\nBerhasil mengirimkan ${success} dari ${keys.length} data perubahan lokal langsung ke Google Sheets secara real-time.`);
    } catch (e) {
      console.error(e);
      alert("Gagal melakukan sinkronisasi data luring. Silakan periksa koneksi internet Anda.");
    } finally {
      setCloudLoading(false);
    }
  };

  // Force clean sync from cloud: clears local browser overrides so that clean, real-time values from other PCs are loaded instantly
  const handleForceSynchronizeFromCloud = async () => {
    const confirmClear = window.confirm(
      "⚠️ PERINGATAN RE-SINKRONISASI COLD-FORCE:\n\n" +
      "Tindakan ini akan menghapus salinan data lokal, daftar luring yang tertunda, dan seluruh overrides pada browser ini, " +
      "kemudian menenggelamkan/mendownload data asli dan terbaru yang ada di database pusat Google Sheets.\n\n" +
      "Gunakan ini jika Anda ingin melihat perubahan instan yang dikirim dari komputer/PC lain secara bersih.\n\n" +
      "Apakah Anda yakin ingin melanjutkan?"
    );
    if (!confirmClear) return;

    setCloudLoading(true);
    try {
      // Clear local states and storage overrides
      localStorage.removeItem('slrt_records');
      localStorage.removeItem('slrt_record_overrides');
      localStorage.removeItem('slrt_deleted_record_ids');
      
      // Reset states
      setSelectedRecordId(null);
      
      // Pull fresh data
      const response = await fetch(`${GOOGLE_SHEETS_API_URL}?action=getInitialData`);
      if (response.ok) {
        const json = await response.json();
        if (json.records && Array.isArray(json.records)) {
          const normalized = json.records.filter((rec: any) => {
            return !rec.isDeleted && 
                   rec.isDeleted !== 'true' && 
                   rec.statusKunjungan !== 'Dihapus' && 
                   rec.statusKunjungan !== 'DELETED';
          }).map(normalizeRecord);
          
          setRecords(normalized);
          localStorage.setItem('slrt_records', JSON.stringify(stripPhotosFromRecordList(normalized)));
        }
        
        if (json.facilitators && Array.isArray(json.facilitators)) {
          const reconciled = getReconciledFacilitators(json.facilitators);
          setFacilitators(reconciled);
          localStorage.setItem('slrt_facilitators', JSON.stringify(reconciled));
        }
        
        const now = new Date();
        setLastCloudSync(now.toLocaleTimeString('id-ID'));
        alert("✓ Sinkronisasi Paksa Berhasil!\nSeluruh cache telah dinetralkan dan data murni yang terbaru dari Google Sheets sukses dimuat.");
      } else {
        alert("Gagal menghubungi Google Sheets central. Mohon periksa kembali API URL Google Apps Script Anda.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyinkronkan data pusat. Pastikan koneksi internet stabil.");
    } finally {
      setCloudLoading(false);
    }
  };

  // Parse User Agent to get friendly device info
  const getDeviceDetails = () => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return "Android HP/Tablet";
    if (/iPad|iPhone|iPod/.test(ua)) return "iOS Apple Device";
    if (/windows/i.test(ua)) return "Windows PC";
    if (/macintosh/i.test(ua)) return "macOS Apple PC";
    if (/linux/i.test(ua)) return "Linux System";
    return "Perangkat Tidak Teridentifikasi (" + navigator.platform + ")";
  };

  // Synchronize initial data from Google Sheets database (facilitators + records)
  const refreshFromCloud = async (showNotification: boolean = false) => {
    setCloudLoading(true);
    try {
      const response = await fetch(`${GOOGLE_SHEETS_API_URL}?action=getInitialData`);
      if (response.ok) {
        const json = await response.json();
        if (json.records && Array.isArray(json.records)) {
          const deletedIdsString = localStorage.getItem('slrt_deleted_record_ids') || '[]';
          let deletedIds: string[] = [];
          try {
            deletedIds = JSON.parse(deletedIdsString);
          } catch (e) {}

          const filtered = json.records.filter((rec: any) => {
            return !deletedIds.includes(rec.id) && 
                   !rec.isDeleted && 
                   rec.isDeleted !== 'true' && 
                   rec.statusKunjungan !== 'Dihapus' && 
                   rec.statusKunjungan !== 'DELETED';
          });
          const normalized = filtered.map(normalizeRecord);

          // Clean up local overrides that have successfully integrated/synced to the cloud
          const savedOver = localStorage.getItem('slrt_record_overrides');
          if (savedOver) {
            try {
              const overrides = JSON.parse(savedOver);
              let overridesChanged = false;
              normalized.forEach((cloudRec: any) => {
                const localRec = overrides[cloudRec.id];
                if (localRec) {
                  const matchesStatus = cloudRec.statusKunjungan === localRec.statusKunjungan;
                  // If the status is processed in cloud, we can safely trust the cloud version now
                  if (matchesStatus && (cloudRec.tanggalPemeriksaan === localRec.tanggalPemeriksaan || !localRec.tanggalPemeriksaan)) {
                    delete overrides[cloudRec.id];
                    overridesChanged = true;
                  }
                }
              });
              if (overridesChanged) {
                const cleanedOver: any = {};
                Object.keys(overrides).forEach(k => {
                  cleanedOver[k] = stripPhotosFromRecord(overrides[k]);
                });
                localStorage.setItem('slrt_record_overrides', JSON.stringify(cleanedOver));
              }
            } catch (pruneErr) {
              console.error("Gagal melakukan pemangkasan override:", pruneErr);
            }
          }

          const merged = mergeRecordsWithOverrides(normalized);
          setRecords(merged);
          localStorage.setItem('slrt_records', JSON.stringify(stripPhotosFromRecordList(merged)));
        }
        if (json.facilitators && Array.isArray(json.facilitators)) {
          const reconciled = getReconciledFacilitators(json.facilitators);
          setFacilitators(reconciled);
          localStorage.setItem('slrt_facilitators', JSON.stringify(reconciled));
        }
        const now = new Date();
        setLastCloudSync(now.toLocaleTimeString('id-ID'));
        if (showNotification) {
          alert("✓ Sinkronisasi Berhasil!\nSeluruh data akun pendata dan laporan pengaduan berhasil tersinkronisasi offline/online secara real-time dari Google Sheets.");
        }
      } else {
        if (showNotification) {
          alert("Gagal memuat data dari Google Sheets, menggunakan salinan data lokal.");
        }
      }
    } catch (err) {
      console.warn("Gagal terhubung dengan database cloud Google Sheets, sistem beralih menggunakan basis data lokal offline:", err);
      if (showNotification) {
        alert("Gagal terhubung ke database pusat Google Sheets. Pastikan koneksi internet aktif, lalu coba kembali.");
      }
    } finally {
      setCloudLoading(false);
    }
  };

  // Synchronize on startup and pull changes periodically
  useEffect(() => {
    async function initializeOfflineCache() {
      // 1. Run backward-compatible migration from LocalStorage to IndexedDB
      await migrateLocalStorageToIndexedDB();
      
      // 1b. Run periodic cleanup on IndexedDB to prune photo assets older than 45 days
      await cleanUpArchive(45);
      
      // 2. Load all high-res photos from IndexedDB into synchronous in-memory cache
      await loadPhotosToCache();
      
      // 3. Immediately normalize and refresh local records to reflect restored photographs
      setRecords(prev => prev.map(normalizeRecord));
      
      // 4. Trigger cloud synchronization as normal
      refreshFromCloud(false);
    }
    
    initializeOfflineCache();

    // Auto-update every 12 seconds to ensure registrations and records are in near-real-time sync across devices
    const syncInterval = setInterval(() => {
      refreshFromCloud(false);
    }, 12000);

    return () => clearInterval(syncInterval);
  }, []);

  // Form input states for Authentication Gate
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState(''); // for admin
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Sign up mode toggle for facilitator gate
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Field inputs for facilitator registration Form
  const [regName, setRegName] = useState('');
  const [regNik, setRegNik] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regKec, setRegKec] = useState('Datuk Bandar');
  const [regKel, setRegKel] = useState('Pahang');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Save facilitators and session
  useEffect(() => {
    localStorage.setItem('slrt_facilitators', JSON.stringify(facilitators));
  }, [facilitators]);

  useEffect(() => {
    if (session) {
      localStorage.setItem('slrt_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('slrt_session');
    }
  }, [session]);

  // Handle automatic select of first kelurahan when registration kecamatan changes
  useEffect(() => {
    if (TANJUNGBALAI_LOCATIONS[regKec]) {
      setRegKel(TANJUNGBALAI_LOCATIONS[regKec][0]);
    }
  }, [regKec]);

  // Verification dialog & form states
  const [selectedVerifierRecord, setSelectedVerifierRecord] = useState<SLRTRecord | null>(null);
  const [showVerifierModal, setShowVerifierModal] = useState(false);
  const [verifierNotes, setVerifierNotes] = useState('');
  const [verifierPhoto, setVerifierPhoto] = useState('https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=400');
  const [verifierDate, setVerifierDate] = useState('');
  const [verifierNamaPendata, setVerifierNamaPendata] = useState('');
  const [verifierFotoKkKtp, setVerifierFotoKkKtp] = useState('');
  const [verifierFotoDepanRumah, setVerifierFotoDepanRumah] = useState('');
  const [verifierLat, setVerifierLat] = useState<number | null>(null);
  const [verifierLng, setVerifierLng] = useState<number | null>(null);
  const [photoResolutionMode, setPhotoResolutionMode] = useState<'standard' | 'high'>(() => {
    const saved = localStorage.getItem('slrt_photo_resolution_mode');
    return (saved === 'standard' || saved === 'high') ? saved : 'high';
  });

  const [formLatitude, setFormLatitude] = useState<number | null>(null);
  const [formLongitude, setFormLongitude] = useState<number | null>(null);

  const changePhotoResolutionMode = (mode: 'standard' | 'high') => {
    setPhotoResolutionMode(mode);
    localStorage.setItem('slrt_photo_resolution_mode', mode);
  };

  const memoizedVerifierFotoKkKtp = useMemo(() => {
    return getSafeBase64Url(verifierFotoKkKtp);
  }, [verifierFotoKkKtp]);

  const memoizedVerifierFotoDepanRumah = useMemo(() => {
    return getSafeBase64Url(verifierFotoDepanRumah);
  }, [verifierFotoDepanRumah]);

  const memoizedVerifierPhoto = useMemo(() => {
    return getSafeBase64Url(verifierPhoto);
  }, [verifierPhoto]);
  const [selectedFacilitatorFilter, setSelectedFacilitatorFilter] = useState<string>('all');
  const [selectedPendataFilter, setSelectedPendataFilter] = useState<string>('all');

  // Link and auto-filter display based on the currently logged-in facilitator account name
  useEffect(() => {
    // Default to 'all' to allow all facilitators to view and verify any item in the queue list (as requested)
    setSelectedFacilitatorFilter('all');
    
    // Auto-fill formFasilitator with the logged-in facilitator's/officer's name
    if (session?.name) {
      setFormFasilitator(session.name);
    }
  }, [userRole, session]);
  const [visiblePasswords, setVisiblePasswords] = useState<{[key: string]: boolean}>({});

  // Real Camera States for Real-time capture & Geotagting
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [onPhotoCapture, setOnPhotoCapture] = useState<((photoDataUrl: string) => void) | null>(null);
  const [cameraTargetName, setCameraTargetName] = useState<string>('');

  // Warga Portal Specific Input form / search
  const [wargaSearchQuery, setWargaSearchQuery] = useState('');
  const [wargaAddNama, setWargaAddNama] = useState('');
  const [wargaAddKecamatan, setWargaAddKecamatan] = useState('Datuk Bandar');
  const [wargaAddKelurahan, setWargaAddKelurahan] = useState('Pahang');
  const [wargaAddAlamat, setWargaAddAlamat] = useState('');
  const [wargaAddPhone, setWargaAddPhone] = useState('');
  const [wargaAddPengaduan, setWargaAddPengaduan] = useState('');
  const [wargaAddPekerjaan, setWargaAddPekerjaan] = useState('');
  const [wargaAddNik, setWargaAddNik] = useState('');
  const [wargaAddNamaKuasa, setWargaAddNamaKuasa] = useState('-');
  const [wargaAddDokumen, setWargaAddDokumen] = useState('KK, KTP');
  const [wargaAddStatus, setWargaAddStatus] = useState('Miskin');
  const [wargaAddBantuanDiterima, setWargaAddBantuanDiterima] = useState('Belum Ada');
  const [wargaAddStatusRumah, setWargaAddStatusRumah] = useState('Milik Sendiri');
  const [wargaAddJenisPenerangan, setWargaAddJenisPenerangan] = useState('PLN Bersubsidi 450W');
  const [wargaAddMck, setWargaAddMck] = useState('Sendiri Layak');
  const [wargaAddPendapatanPerbulan, setWargaAddPendapatanPerbulan] = useState('');
  const [wargaAddJenisLayanan, setWargaAddJenisLayanan] = useState('');
  const [wargaAddIndikatorSosialEkonomi, setWargaAddIndikatorSosialEkonomi] = useState<string[]>([]);
  const [wargaAddKelayakanHuni, setWargaAddKelayakanHuni] = useState<string[]>([]);
  const [wargaAddBantuanDiterimaList, setWargaAddBantuanDiterimaList] = useState<string[]>([]);
  const [wargaFormSuccess, setWargaFormSuccess] = useState<string | null>(null);

  const [backgroundSyncStatus, setBackgroundSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncingTargetName, setSyncingTargetName] = useState<string>('');

  // State for active tabs: 'all-records' | 'add-record' | 'smart-parser' | 'help' | 'dashboard-summary' | 'facilitators'
  const [activeTab, setActiveTab ] = useState<'all-records' | 'add-record' | 'smart-parser' | 'help' | 'dashboard-summary' | 'facilitators'>('all-records');

  // State for filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterKelurahan, setFilterKelurahan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterKunjungan, setFilterKunjungan] = useState(''); // filter by visit status
  const [filterStartMonth, setFilterStartMonth] = useState('');
  const [filterStartYear, setFilterStartYear] = useState('');
  const [filterEndMonth, setFilterEndMonth] = useState('');
  const [filterEndYear, setFilterEndYear] = useState('');
  const [filterVerifStartDate, setFilterVerifStartDate] = useState('');
  const [filterVerifEndDate, setFilterVerifEndDate] = useState('');
  const [filterBulanBerjalan, setFilterBulanBerjalan] = useState(false);

  // Selected Record state
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Google Sheets integration helper state
  const [syncingRecordId, setSyncingRecordId] = useState<string | null>(null);

  // Input states (Form State)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formFasilitator, setFormFasilitator] = useState('');
  const [formKecamatan, setFormKecamatan] = useState('Datuk Bandar');
  const [formKelurahan, setFormKelurahan] = useState('Pahang');
  const [formHariTanggal, setFormHariTanggal] = useState('');
  const [formNamaKlien, setFormNamaKlien] = useState('');
  const [formNik, setFormNik] = useState('');
  const [isWargaNikFocused, setIsWargaNikFocused] = useState(false);
  const [isFormNikFocused, setIsFormNikFocused] = useState(false);
  const [isRegNikFocused, setIsRegNikFocused] = useState(false);
  const [formPekerjaanKrt, setFormPekerjaanKrt] = useState('');
  const [formNamaKuasa, setFormNamaKuasa] = useState('-');
  const [formAlamatKlien, setFormAlamatKlien] = useState('');
  const [formNoTelpon, setFormNoTelpon] = useState('');
  const [formDokumen, setFormDokumen] = useState('KK, KTP');
  const [formStatus, setFormStatus] = useState('Miskin');
  const [formBantuanDiterima, setFormBantuanDiterima] = useState('Belum Ada');
  const [formStatusRumah, setFormStatusRumah] = useState('Milik Sendiri');
  const [formJenisPenerangan, setFormJenisPenerangan] = useState('PLN Bersubsidi 450W');
  const [formMck, setFormMck] = useState('Sendiri Layak');
  const [formPendapatanPerbulan, setFormPendapatanPerbulan] = useState('');
  const [formJenisPengaduan, setFormJenisPengaduan] = useState('');
  const [formJenisLayanan, setFormJenisLayanan] = useState('');
  const [formIndikatorSosialEkonomi, setFormIndikatorSosialEkonomi] = useState<string[]>([]);
  const [formKelayakanHuni, setFormKelayakanHuni] = useState<string[]>([]);
  const [formBantuanDiterimaList, setFormBantuanDiterimaList] = useState<string[]>([]);

  // Automatically acquire coordinate geolocation on opening "Input Kunjungan Baru"
  useEffect(() => {
    if (activeTab === 'add-record' && !editingId) {
      // It is a new record creation, fetch the client's current location immediately
      getGeotagCoordinates().then(geo => {
        setFormLatitude(geo.latitude);
        setFormLongitude(geo.longitude);
      }).catch(err => {
        console.error("Gagal mendapatkan koordinat otomatis:", err);
      });
    }
  }, [activeTab, editingId]);

  // Viewport/context auto-scroll on transitioning to 'Add Record' or opening 'Verifier' modal
  useEffect(() => {
    if (activeTab === 'add-record') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  useEffect(() => {
    if (showVerifierModal) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // If there's an internal scrollable panel for the verifier modal (e.g. max-h-[90vh] overflow-y-auto), reset its scroll position too
      const timer = setTimeout(() => {
        const verifierInnerElement = document.querySelector('#verifier-modal > div');
        if (verifierInnerElement) {
          verifierInnerElement.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [showVerifierModal]);

  // Raw Chat Copy-paste parser tool states
  const [rawText, setRawText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Partial<SLRTRecord> | null>(null);
  const [parseStatusMsg, setParseStatusMsg] = useState('');

  // Dialog notifications / copy triggers
  const [copiedRecordId, setCopiedRecordId] = useState<'list' | 'tbl' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteFacilitatorConfirm, setShowDeleteFacilitatorConfirm] = useState<string | null>(null);

  // Auto-save changes to localStorage (strip photos to keep size ultra micro and prevent QuotaExceededError)
  useEffect(() => {
    localStorage.setItem('slrt_records', JSON.stringify(stripPhotosFromRecordList(records)));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('slrt_user_role', userRole);
  }, [userRole]);

  // Adjust kelurahan list automatically when form kecamatan changes
  useEffect(() => {
    if (TANJUNGBALAI_LOCATIONS[formKecamatan]) {
      setFormKelurahan(TANJUNGBALAI_LOCATIONS[formKecamatan][0]);
    }
  }, [formKecamatan]);

  // Handle format of Hari/Tanggal automatically
  const handleAutoDate = (dateString: string) => {
    if (!dateString) return;
    try {
      const date = new Date(dateString);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const indonedianDay = days[date.getDay()];
      const dayNum = date.getDate().toString().padStart(2, '0');
      const indonesianMonth = months[date.getMonth()];
      const year = date.getFullYear();
      
      setFormHariTanggal(`${indonedianDay}, ${dayNum} ${indonesianMonth} ${year}`);
    } catch (e) {
      // Keep manual values
    }
  };

  // ==========================================
  // AUTHENTICATION & LOGIN PROCESSORS
  // ==========================================

  // 1. Admin Login Submission (Credentials check: Username: SLRT KITO, Password: SLRTKITO9102)
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError("Harap lengkapi semua bidang login.");
      return;
    }

    if (authUsername.trim() === 'SLRT KITO' && authPassword.trim() === 'SLRTKITO9102') {
      const newSession = {
        role: 'admin' as const,
        name: 'Administrator SLRT KITO',
        email: 'admin@tanjungbalaikota.go.id'
      };
      setSession(newSession);
      setUserRole('admin');
      setActiveTab('all-records');
      setAuthUsername('');
      setAuthPassword('');
      setAuthError(null);
      alert("Autentikasi Berhasil! Selamat datang di Master Web Dashboard SLRT KITO Pemerintah Kota Tanjungbalai.");
    } else {
      setAuthError("Kredensial Administrator tidak valid. Pastikan Username dan Password sesuai.");
    }
  };

  // 2. Facilitator Login Submission with Live Google Sheets Verification
  const handleFacilitatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Harap lengkapi Email dan Password.");
      return;
    }

    setCloudLoading(true);
    let currentFacs = facilitators;
    try {
      // Fetch latest registered facilitators & records in real-time
      const response = await fetch(`${GOOGLE_SHEETS_API_URL}?action=getInitialData`);
      if (response.ok) {
        const json = await response.json();
        if (json.facilitators && Array.isArray(json.facilitators)) {
          const reconciled = getReconciledFacilitators(json.facilitators);
          currentFacs = reconciled;
          setFacilitators(reconciled);
          localStorage.setItem('slrt_facilitators', JSON.stringify(reconciled));
        }
        if (json.records && Array.isArray(json.records)) {
          const deletedIdsString = localStorage.getItem('slrt_deleted_record_ids') || '[]';
          let deletedIds: string[] = [];
          try {
            deletedIds = JSON.parse(deletedIdsString);
          } catch (e) {}

          const filtered = json.records.filter((rec: any) => {
            return !deletedIds.includes(rec.id) && 
                   !rec.isDeleted && 
                   rec.isDeleted !== 'true' && 
                   rec.statusKunjungan !== 'Dihapus' && 
                   rec.statusKunjungan !== 'DELETED';
          });
          const normalized = filtered.map(normalizeRecord);
          const merged = mergeRecordsWithOverrides(normalized);
          setRecords(merged);
          localStorage.setItem('slrt_records', JSON.stringify(stripPhotosFromRecordList(merged)));
        }
        const now = new Date();
        setLastCloudSync(now.toLocaleTimeString('id-ID'));
      }
    } catch (err) {
      console.warn("Gagal sinkron data cloud saat login, memproses dengan data luring offline lokal:", err);
    } finally {
      setCloudLoading(false);
    }

    const matched = currentFacs.find(f => f.email.trim().toLowerCase() === authEmail.trim().toLowerCase());
    if (!matched) {
      setAuthError("Surel/Email tidak ditemukan dalam sistem. Jika Anda baru, silakan lakukan Registrasi terlebih dahulu.");
      return;
    }

    if (matched.password !== authPassword.trim()) {
      setAuthError("Kata sandi / Password salah. Silakan coba kembali dengan teliti.");
      return;
    }

    // Verify approval status
    if (matched.status === 'PENDING_APPROVAL') {
      setAuthError("⚠️ AKSES DITOLAK: Pendaftaran Anda masih dalam status 'PENDING_APPROVAL' (Menunggu Tinjauan). Harap hubungi Administrator Dinsos untuk aktivasi akun.");
      return;
    }

    if (matched.status === 'REJECTED') {
      setAuthError("❌ AKSES DIKUNCI: Pendaftaran Anda berstatus 'DITOLAK' oleh Dinas Sosial. Silakan hubungi admin pusat.");
      return;
    }

    // Success login
    const newSession = {
      role: 'facilitator' as const,
      email: matched.email,
      name: matched.name,
      nik: matched.nik,
      id: matched.id,
      regionKecamatan: matched.regionKecamatan,
      regionKelurahan: matched.regionKelurahan
    };
    setSession(newSession);
    setUserRole('facilitator');
    setActiveTab('all-records');
    setAuthEmail('');
    setAuthPassword('');
    setAuthError(null);
    alert(`Autentikasi Berhasil! Selamat bekerja di lapangan, Fasilitator ${matched.name}.`);
  };

  // 3. Facilitator New Registration / Sign-Up Submission (Initial status: PENDING_APPROVAL)
  const handleFacilitatorRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setRegSuccess(null);

    if (!regName.trim() || !regNik.trim() || !regPhone.trim() || !regEmail.trim() || !regPassword.trim()) {
      setAuthError("Mohon lengkapi seluruh formulir registrasi.");
      return;
    }

    if (regNik.trim().length !== 16 || !/^\d+$/.test(regNik.trim())) {
      setAuthError("NIK / ID Pegawai wajib berupa tepat 16 digit angka.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setAuthError("Konfirmasi password tidak cocok dengan password.");
      return;
    }

    setCloudLoading(true);
    let currentFacs = facilitators;
    try {
      // Sync facilitators from cloud to guarantee duplication check is 100% accurate across all devices
      const response = await fetch(`${GOOGLE_SHEETS_API_URL}?action=getInitialData`);
      if (response.ok) {
        const json = await response.json();
        if (json.facilitators && Array.isArray(json.facilitators)) {
          const reconciled = getReconciledFacilitators(json.facilitators);
          currentFacs = reconciled;
          setFacilitators(reconciled);
          localStorage.setItem('slrt_facilitators', JSON.stringify(reconciled));
        }
      }
    } catch (err) {
      console.warn("Gagal mengecek tumpukan data awan saat registrasi, melanjutkan secara lokal:", err);
    } finally {
      setCloudLoading(false);
    }

    // Check NIK duplication or Email duplication
    const hasEmail = currentFacs.some(f => f.email.toLowerCase() === regEmail.trim().toLowerCase());
    if (hasEmail) {
      setAuthError("Email ini sudah terdaftar dalam sistem. Gunakan email lain atau login kembali.");
      return;
    }

    const hasNik = currentFacs.some(f => f.nik === regNik.trim());
    if (hasNik) {
      setAuthError("Nomor NIK ini sudah terdaftar dalam sistem.");
      return;
    }

    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const createdDateString = `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    const newFacilitator: FacilitatorUser = {
      id: `fac-${Date.now()}`,
      name: regName.trim(),
      nik: regNik.trim(),
      regionKecamatan: regKec,
      regionKelurahan: regKel,
      phone: regPhone.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword.trim(),
      status: 'PENDING_APPROVAL', // Mandatory initial state for registration review
      createdAt: createdDateString
    };

    setCloudLoading(true);
    try {
      // Post registration down to Google Sheets database including current parsed device details
      await fetch(GOOGLE_SHEETS_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify({
          action: 'registerFacilitator',
          data: {
            ...newFacilitator,
            perangkat: getDeviceDetails()
          }
        })
      });

      // Under mode: "no-cors", the fetch resolves successfully once the request has been dispatched.
      setFacilitators(prev => [...prev, newFacilitator]);
      setRegSuccess(`Registrasi sukses untuk "${regName}"! Akun Anda kini tercatat online di Google Sheets dengan status PENDING_APPROVAL. Silakan hubungi Administrator Dinsos untuk aktivasi.`);
    } catch (err) {
      console.error("Cloud registration failed:", err);
      // Fallback local registration
      setFacilitators(prev => [...prev, newFacilitator]);
      setRegSuccess(`Registrasi sukses (offline/lokal) untuk "${regName}"! Akun Anda kini tersimpan dalam cache lokal dengan status PENDING_APPROVAL.`);
    } finally {
      setCloudLoading(false);
    }

    // Clear registration fields
    setRegName('');
    setRegNik('');
    setRegPhone('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setIsRegisterMode(false); // return to login area for feedback
  };

  // 4. Admin Action: Approve/Reject Facilitator Status with Google Sheets update
  const handleUpdateFacilitatorStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    const matched = facilitators.find(f => f.id === id);

    // Save the status override locally so it cannot be reverted by background synchronization
    try {
      const savedOverrides = localStorage.getItem('slrt_status_overrides');
      const overrides = savedOverrides ? JSON.parse(savedOverrides) : {};
      overrides[id] = newStatus;
      localStorage.setItem('slrt_status_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.error("Gagal menyimpan override status lokal:", e);
    }

    setFacilitators(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, status: newStatus };
      }
      return f;
    }));
    
    // Sync status change directly to Google Sheets database (bypassing CORS)
    try {
      await fetch(GOOGLE_SHEETS_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify({
          action: 'updateFacilitatorStatus',
          id: id,
          status: newStatus
        })
      });
    } catch (err) {
      console.error("Gagal sinkron status fasilitas ke cloud:", err);
    }

    const label = newStatus === 'APPROVED' ? 'DISETUJUI (Aktif)' : 'DITOLAK (Nonaktif)';
    alert(`Fasilitator "${matched?.name || ''}" berhasil diubah status menjadi: ${label}`);
  };

  // 5. Admin Action: Delete Facilitator Account with Google Sheets update
  const handleDeleteFacilitator = async (id: string) => {
    // Save to local deleted facilitator list to prevent cloud sync restoring it
    try {
      const deletedFasString = localStorage.getItem('slrt_deleted_facilitator_ids') || '[]';
      const deletedFasIds = JSON.parse(deletedFasString);
      if (!deletedFasIds.includes(id)) {
        deletedFasIds.push(id);
        localStorage.setItem('slrt_deleted_facilitator_ids', JSON.stringify(deletedFasIds));
      }
    } catch (e) {
      console.error("Gagal menyimpan ID fasilitator terhapus:", e);
    }

    // Purge any local status override for this deleted accounts
    try {
      const savedOverrides = localStorage.getItem('slrt_status_overrides');
      if (savedOverrides) {
        const overrides = JSON.parse(savedOverrides);
        delete overrides[id];
        localStorage.setItem('slrt_status_overrides', JSON.stringify(overrides));
      }
    } catch (e) {
      console.error("Gagal menghapus override status lokal:", e);
    }

    setFacilitators(prev => prev.filter(f => f.id !== id));
    
    // Delete facilitator from Google Sheets database (bypassing CORS)
    try {
      await fetch(GOOGLE_SHEETS_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify({
          action: 'deleteFacilitator',
          id: id
        })
      });
    } catch (err) {
      console.error("Gagal menghapus fasilitas di database cloud:", err);
    }
    
    alert("Akun Fasilitator berhasil dihapus dari sistem.");
  };

  // Preloaded templates for Smart Parser testing
  const SMART_PARSER_SAMPLES = [
    {
      label: "Format Laporan WhatsApp 1",
      text: `LAPORAN PENGADUAN SLRT KITO
Nama Fasilitator: M. Riza Syahputra
Kelurahan: Sijambi
Kecamatan: Datuk Bandar
Hari/Tanggal: Rabu, 03 Juni 2026
Nama Klien: Khairuddin Harahap
Pekerjaan KRT: Penarik Becak Motor
Nama Kuasa: - (Langsung)
Alamat Klien: Jl. Jend. Sudirman Gg. Setia No. 89, Sijambi
No Telpon: 081299002211
Dokumen: KK, KTP, Surat Diagnosa Rumah Sakit
Status: Sangat Miskin
Bantuan: Belum Ada
Status Rumah: Menumpang (Milik Keluarga)
Penerangan: PLN Bersubsidi 450W
MCK: Sendiri Kurang Layak
Pendapatan: Rp 500.000 / bulan
Pengaduan: Klien menderita penyakit stroke ringan selama 1 tahun, kesulitan dalam membeli obat-obatan rutin. Memohon dialihkan ke KIS PBI karena KIS mandiri terblokir denda.
Layanan: Pengusulan peralihan KIS Mandiri ke KIS APBD (Penerima Bantuan Iuran) Kota Tanjungbalai.`
    },
    {
      label: "Format Narasi / Chat Acak",
      text: `Selamat siang Admin SLRT Kito Tanjungbalai, saya fasilitator Halimah ingin melaporkan kunjungan hari ini Kamis tanggal 4 Juni 2026.
Tadi saya mengunjungi ibu klien yang bernama Rosmawati di Kelurahan Sirantau, Kecamatan Datuk Bandar. Alamat lengkapnya di Gg. Bersama No. 3A, Sirantau. Beliau ini seorang janda (Pekerjaan KRT: Penjual Kue Keliling), untuk kuasa tidak ada (langsung sendiri). No hp yang bisa dihubungi: 081377884455.
Dokumen yang dia siapkan ada KK sama KTP. Kondisi ekonominya Sangat Miskin. Belum ada dapat bantuan pkh atau bpnt sama sekali, kasihan sekali. Rumahnya statusnya masih sewa bulanan. Untuk listrik beliau pakai PLN Bersubsidi. Urusan MCK di rumah itu tidak layak karena sumurnya sering keruh dan toiletnya rusak. Pendapatan perbulan hanya sekitar Rp 600.000.
Ibu Rosmawati mengadu karena anaknya yang umur 12 tahun tidak bisa melanjutkan sekolah ke jenjang SMP karena biaya masuk sekolah dan peralatan yang mahal. Dia ingin mengajukan Layanan bantuan beasiswa siswa kurang mampu atau Kartu Indonesia Pintar (KIP) serta bantuan sosial DTKS.`
    }
  ];

  // Raw Chat parsing engine
  const handleParseRawText = () => {
    if (!rawText.trim()) {
      setParseStatusMsg("Silakan masukkan teks laporan terlebih dahulu.");
      return;
    }

    const lines = rawText.split('\n');
    const result: Partial<SLRTRecord> = {
      namaFasilitator: '',
      kelurahan: '',
      kecamatan: '',
      hariTanggal: '',
      namaKlien: '',
      pekerjaanKrt: '',
      namaKuasa: '-',
      alamatKlien: '',
      noTelpon: '',
      dokumen: '',
      status: 'Miskin',
      bantuanDiterima: 'Belum Ada',
      statusRumah: 'Milik Sendiri',
      jenisPenerangan: 'PLN Bersubsidi 450W',
      mck: 'Sendiri Layak',
      pendapatanPerbulan: '',
      jenisPengaduan: '',
      jenisLayanan: ''
    };

    const getMatch = (regexes: RegExp[], line: string): string | null => {
      for (const regex of regexes) {
        const match = line.match(regex);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      return null;
    };

    lines.forEach(line => {
      const fas = getMatch([/Fasilitator\s*:\s*(.*)/i, /Nama Fasilitator\s*:\s*(.*)/i, /Fasil\s*:\s*(.*)/i, /fasilitator\s*([a-zA-Z\s.]+)/i], line);
      if (fas && !result.namaFasilitator) result.namaFasilitator = fas;

      const kel = getMatch([/Kelurahan\s*:\s*(.*)/i, /Kel\s*:\s*(.*)/i, /kelurahan\s*([a-zA-Z\s]+)/i], line);
      if (kel && !result.kelurahan) result.kelurahan = kel;

      const kec = getMatch([/Kecamatan\s*:\s*(.*)/i, /Kec\s*:\s*(.*)/i, /kecamatan\s*([a-zA-Z\s]+)/i], line);
      if (kec && !result.kecamatan) result.kecamatan = kec;

      const htg = getMatch([/Hari\/Tanggal\s*:\s*(.*)/i, /Tanggal\s*:\s*(.*)/i, /Hari\/Tgl\s*:\s*(.*)/i, /tanggal\s*([0-9a-zA-Z\s,]+)/i], line);
      if (htg && !result.hariTanggal) result.hariTanggal = htg;

      const kli = getMatch([/Nama Klien\s*:\s*(.*)/i, /Klien\s*:\s*(.*)/i, /klien bernama\s*([a-zA-Z\s.]+)/i, /Nama\s*:\s*(.*)/i], line);
      if (kli && !result.namaKlien) result.namaKlien = kli;

      const pek = getMatch([/Pekerjaan KRT\s*:\s*(.*)/i, /Pekerjaan\s*:\s*(.*)/i, /pekerjaan\s*([a-zA-Z\s/]+)/i], line);
      if (pek && !result.pekerjaanKrt) result.pekerjaanKrt = pek;

      const kua = getMatch([/Nama Kuasa\s*:\s*(.*)/i, /Kuasa\s*:\s*(.*)/i, /diwakilkan oleh\s*(.*)/i, /diwakilkan kepada\s*(.*)/i], line);
      if (kua && !result.namaKuasa) result.namaKuasa = kua;

      const alm = getMatch([/Alamat Klien\s*:\s*(.*)/i, /Alamat\s*:\s*(.*)/i, /alamat lengkapnya\s*di\s*(.*)/i, /alamat\s*di\s*(.*)/i], line);
      if (alm && !result.alamatKlien) result.alamatKlien = alm;

      const tel = getMatch([/No Telpon\s*:\s*(.*)/i, /No HP\s*:\s*(.*)/i, /No hp\/telepon\s*:\s*(.*)/i, /hp\s*:\s*([0-9\-\s]+)/i, /No\s*Telpon\/HP\s*:\s*(.*)/i], line);
      if (tel && !result.noTelpon) result.noTelpon = tel;

      const dok = getMatch([/Dokumen\s*:\s*(.*)/i, /Berkas\s*:\s*(.*)/i, /dokumen yang dibawa\s*([a-zA-Z,\s]+)/i, /dokumen berupa\s*(.*)/i], line);
      if (dok && !result.dokumen) result.dokumen = dok;

      const stt = getMatch([/Status Klien\s*:\s*(.*)/i, /Status\s*:\s*(.*)/i, /kondisi ekonominya\s*([a-zA-Z\s]+)/i], line);
      if (stt && !result.status) result.status = stt;

      const ban = getMatch([/Bantuan yang Sudah Diperoleh\s*:\s*(.*)/i, /Bantuan\s*:\s*(.*)/i, /sudah dapat\s*bantuan\s*([a-zA-Z,\s\/]+)/i, /menerima bantuan\s*(.*)/i], line);
      if (ban && !result.bantuanDiterima) result.bantuanDiterima = ban;

      const srm = getMatch([/Status Rumah\s*:\s*(.*)/i, /Rumah\s*:\s*(.*)/i, /status rumah\s*sebagai\s*(.*)/i, /rumah tinggal\s*([a-zA-Z\s]+)/i], line);
      if (srm && !result.statusRumah) result.statusRumah = srm;

      const pen = getMatch([/Jenis Penerangan\s*:\s*(.*)/i, /Penerangan\s*:\s*(.*)/i, /listrik\s*([a-zA-Z0-9\s]+)/i, /listrik pakai\s*(.*)/i], line);
      if (pen && !result.jenisPenerangan) result.jenisPenerangan = pen;

      const mck_match = getMatch([/MCK\s*:\s*(.*)/i, /toilet\s*([a-zA-Z\s]+)/i, /kondisi MCK\s*(.*)/i], line);
      if (mck_match && !result.mck) result.mck = mck_match;

      const pen_bul = getMatch([/Pendapatan Perbulan\s*:\s*(.*)/i, /Pendapatan\s*:\s*(.*)/i, /gaji perbulan\s*(.*)/i, /penghasilan\s*(.*)/i], line);
      if (pen_bul && !result.pendapatanPerbulan) result.pendapatanPerbulan = pen_bul;

      const peng = getMatch([/Jenis Pengaduan\s*:\s*(.*)/i, /Pengaduan\s*:\s*(.*)/i, /mengeluh karena\s*(.*)/i, /mengadu karena\s*(.*)/i], line);
      if (peng && !result.jenisPengaduan) result.jenisPengaduan = peng;

      const lay = getMatch([/Jenis Layanan yang Diinginkan\s*:\s*(.*)/i, /Layanan\s*:\s*(.*)/i, /layanan berupa\s*(.*)/i, /usulan layanan\s*(.*)/i], line);
      if (lay && !result.jenisLayanan) result.jenisLayanan = lay;
    });

    // Fallbacks
    if (!result.namaKlien) {
      const matchKlien = rawText.match(/(?:nama klien|klien bernama|klien)\s*:\s*([a-zA-Z\s.]+)/i);
      if (matchKlien && matchKlien[1]) result.namaKlien = matchKlien[1].trim();
    }
    if (!result.kelurahan) {
      const matchKel = rawText.match(/(?:kelurahan|kel)\s*([a-zA-Z\s]+?)(?:,|$|\n)/i);
      if (matchKel && matchKel[1]) result.kelurahan = matchKel[1].trim();
    }
    if (!result.kecamatan) {
      const matchKec = rawText.match(/(?:kecamatan|kec)\s*([a-zA-Z\s]+?)(?:,|$|\n)/i);
      if (matchKec && matchKec[1]) result.kecamatan = matchKec[1].trim();
    }

    setParsedPreview(result);
    setParseStatusMsg("Berhasil menganalisis data secara otomatis!");
  };

  // Apply parsed results to state
  const applyParsedDataToForm = () => {
    if (!parsedPreview) return;

    setFormFasilitator(parsedPreview.namaFasilitator || '');
    setFormKecamatan(Object.keys(TANJUNGBALAI_LOCATIONS).includes(parsedPreview.kecamatan || '') ? (parsedPreview.kecamatan || 'Datuk Bandar') : 'Datuk Bandar');
    setFormKelurahan(parsedPreview.kelurahan || 'Pahang');
    setFormHariTanggal(parsedPreview.hariTanggal || '');
    setFormNamaKlien(parsedPreview.namaKlien || '');
    let parsedNik = parsedPreview.nik || '';
    if (!parsedNik && parsedPreview.dokumen) {
      const match = parsedPreview.dokumen.match(/NIK:\s*(\d{16})/i);
      if (match) {
        parsedNik = match[1];
      }
    }
    setFormNik(parsedNik);
    setFormPekerjaanKrt(parsedPreview.pekerjaanKrt || '');
    setFormNamaKuasa(parsedPreview.namaKuasa || '-');
    setFormAlamatKlien(parsedPreview.alamatKlien || '');
    setFormNoTelpon(parsedPreview.noTelpon || '');
    setFormDokumen(parsedPreview.dokumen || 'KK, KTP');
    setFormStatus(parsedPreview.status || 'Miskin');
    setFormBantuanDiterima(parsedPreview.bantuanDiterima || 'Belum Ada');
    setFormStatusRumah(parsedPreview.statusRumah || 'Milik Sendiri');
    setFormJenisPenerangan(parsedPreview.jenisPenerangan || 'PLN Bersubsidi 450W');
    setFormMck(parsedPreview.mck || 'Sendiri Layak');
    setFormPendapatanPerbulan(parsedPreview.pendapatanPerbulan || '');
    setFormJenisPengaduan(parsedPreview.jenisPengaduan || '');
    setFormJenisLayanan(parsedPreview.jenisLayanan || '');

    setEditingId(null);
    setActiveTab('add-record');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check if case-insensitive keywords for high-priority are in text description
  const checkIsHighPriority = (text: string | undefined): boolean => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return lower.includes('darurat') || lower.includes('stroke') || lower.includes('butuh segera');
  };

  // Submit form handler
  const handleSubmitRecord = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNamaKlien.trim() || !formFasilitator.trim() || !formKelurahan.trim()) {
      alert("Harap lengkapi setidaknya Nama Fasilitator, Kelurahan, dan Nama Klien.");
      return;
    }

    const cleanNik = formNik.trim();
    if (!cleanNik) {
      alert("⚠️ NIK Klien wajib diisi!");
      return;
    }
    if (cleanNik.length !== 16 || !/^\d+$/.test(cleanNik)) {
      alert("⚠️ NIK Klien harus tepat 16 digit angka.");
      return;
    }

    const isDuplicate = records.some(r => r.nik === cleanNik && r.id !== editingId);
    if (isDuplicate) {
      const dupRec = records.find(r => r.nik === cleanNik && r.id !== editingId);
      alert(`⚠️ Duplikasi NIK Terdeteksi!\n\nNIK (${cleanNik}) sudah terdaftar atas nama "${dupRec?.namaKlien}" (Kelurahan ${dupRec?.kelurahan}, Status Kunjungan: ${dupRec?.statusKunjungan || 'Belum Dikunjungi'}).\n\nHarap periksa kembali NIK yang dimasukkan.`);
      return;
    }

    const existingRec = editingId ? records.find(r => r.id === editingId) : null;

    // Build or update statusHistory
    let statusHistory = existingRec?.statusHistory ? [...existingRec.statusHistory] : [];
    
    if (!existingRec) {
      // Creation phase
      const dateString = formHariTanggal.trim() || (() => {
        const today = new Date();
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
      })();
      statusHistory = [
        {
          status: 'Dibuat',
          timestamp: typeof dateString === 'function' ? dateString() : dateString,
          note: 'Aduan diregistrasi secara resmi oleh Petugas Admin Dinas Sosial Kota Tanjungbalai.',
          updatedBy: session?.name || 'Admin Dinsos'
        }
      ];
      if (formFasilitator.trim()) {
        statusHistory.push({
          status: 'Ditugaskan',
          timestamp: typeof dateString === 'function' ? dateString() : dateString,
          note: `Ditugaskan secara otomatis kepada Fasilitator: ${formFasilitator.trim()}.`,
          updatedBy: session?.name || 'Admin Dinsos'
        });
      }
    } else {
      // Update phase
      const today = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const todayFormatted = `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

      if (existingRec.namaFasilitator !== formFasilitator.trim() && formFasilitator.trim()) {
        statusHistory.push({
          status: 'Ditugaskan',
          timestamp: todayFormatted,
          note: `Penugasan dialihkan dari ${existingRec.namaFasilitator || 'Tanpa Fasilitator'} kepada ${formFasilitator.trim()}.`,
          updatedBy: session?.name || 'Admin Dinsos'
        });
      }
    }

    const compiledRecord: SLRTRecord = {
      id: editingId || `rec-${Date.now()}`,
      namaFasilitator: formFasilitator.trim(),
      kelurahan: formKelurahan.trim(),
      kecamatan: formKecamatan,
      hariTanggal: formHariTanggal.trim() || (() => {
        const today = new Date();
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
      })(),
      namaKlien: formNamaKlien.trim(),
      nik: cleanNik,
      pekerjaanKrt: formPekerjaanKrt.trim() || '-',
      namaKuasa: formNamaKuasa.trim() || '-',
      alamatKlien: formAlamatKlien.trim() || '-',
      noTelpon: formNoTelpon.trim() || '-',
      dokumen: formDokumen.trim() ? (formDokumen.trim().includes('(NIK:') ? formDokumen.trim() : `${formDokumen.trim()} (NIK: ${cleanNik})`) : `KK, KTP (NIK: ${cleanNik})`,
      status: formStatus,
      bantuanDiterima: formBantuanDiterimaList.length > 0 ? formBantuanDiterimaList.join(', ') : 'Belum Ada',
      statusRumah: formStatusRumah,
      jenisPenerangan: formJenisPenerangan,
      mck: formMck,
      pendapatanPerbulan: formPendapatanPerbulan.trim() || 'Tidak Tetap/Kerja Serabutan',
      jenisPengaduan: formJenisPengaduan.trim(),
      jenisLayanan: formJenisLayanan.trim() || 'Rujukan Bantuan Sosial',
      isHighPriority: checkIsHighPriority(formJenisPengaduan.trim()),
      
      // Keep existing role/status properties if editing, or default to initial state
      statusKunjungan: existingRec ? existingRec.statusKunjungan : 'Belum Dikunjungi',
      tanggalPemeriksaan: existingRec?.tanggalPemeriksaan,
      catatanPemeriksa: existingRec?.catatanPemeriksa,
      dokumentasiBukti: existingRec?.dokumentasiBukti,
      fotoKkKtp: existingRec?.fotoKkKtp,
      fotoDepanRumah: existingRec?.fotoDepanRumah,
      foto_hunian_url: existingRec?.foto_hunian_url,
      foto_ktp_url: existingRec?.foto_ktp_url,
      namaPendata: formFasilitator.trim() || existingRec?.namaPendata,
      catatan_pendata: existingRec?.catatan_pendata,
      diinputOleh: existingRec ? existingRec.diinputOleh : 'Admin',
      latitude: formLatitude !== null ? formLatitude : (existingRec?.latitude !== undefined ? existingRec.latitude : undefined),
      longitude: formLongitude !== null ? formLongitude : (existingRec?.longitude !== undefined ? existingRec.longitude : undefined),
      
      // New fields
      indikatorSosialEkonomi: formIndikatorSosialEkonomi,
      kelayakanHuni: formKelayakanHuni,
      bantuanDiterimaList: formBantuanDiterimaList,
      statusHistory
    };

    if (editingId) {
      setRecords(prev => prev.map(rec => rec.id === editingId ? compiledRecord : rec));
      setSelectedRecordId(editingId);
      setEditingId(null);
    } else {
      setRecords(prev => [compiledRecord, ...prev]);
      setSelectedRecordId(compiledRecord.id);
    }

    saveRecordOverride(compiledRecord);

    // Auto-sync directly to Google Sheets database in the background
    handleSyncToGoogleSheets(compiledRecord, true);

    resetForm();
    setActiveTab('all-records');
  };

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setFormFasilitator(session?.name || '');
    setFormHariTanggal('');
    setFormNamaKlien('');
    setFormNik('');
    setFormPekerjaanKrt('');
    setFormNamaKuasa('-');
    setFormAlamatKlien('');
    setFormNoTelpon('');
    setFormDokumen('KK, KTP');
    setFormStatus('Miskin');
    setFormBantuanDiterima('Belum Ada');
    setFormStatusRumah('Milik Sendiri');
    setFormJenisPenerangan('PLN Bersubsidi 450W');
    setFormMck('Sendiri Layak');
    setFormPendapatanPerbulan('');
    setFormJenisPengaduan('');
    setFormJenisLayanan('');
    setFormIndikatorSosialEkonomi([]);
    setFormKelayakanHuni([]);
    setFormBantuanDiterimaList([]);
    setFormLatitude(null);
    setFormLongitude(null);
  };

  // Global-like in-memory cache variable inside App closure to prevent GPS hardware wait lag on consecutive captures
  const cachedGeotagCoordinatesRef = useRef<{ latitude: number; longitude: number; timestamp: string; address: string } | null>(null);

  // Silent automatic GPS coordinate pre-fetching on startup
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const today = new Date();
          const timestampStr = today.toLocaleString('id-ID') + ' WIB';
          cachedGeotagCoordinatesRef.current = {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            timestamp: timestampStr,
            address: 'Survei Geotagging Real-time Lapangan'
          };
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // Geotagging Coordinates Utility - Defaults to Tanjungbalai (with 0ms instant cached-speed lookup)
  const getGeotagCoordinates = (): Promise<{ latitude: number; longitude: number; timestamp: string; address: string }> => {
    const today = new Date();
    const timestampStr = today.toLocaleString('id-ID') + ' WIB';

    if (cachedGeotagCoordinatesRef.current) {
      // Return the cached position with fresh timezone timestamp immediately without any hardware lookup delay!
      return Promise.resolve({
        ...cachedGeotagCoordinatesRef.current,
        timestamp: timestampStr
      });
    }

    return new Promise((resolve) => {
      const defaultData = {
        latitude: 2.9645,
        longitude: 99.8005,
        timestamp: timestampStr,
        address: 'Survei Geotagging Real-time Lapangan'
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const result = {
              latitude: Number(pos.coords.latitude.toFixed(6)),
              longitude: Number(pos.coords.longitude.toFixed(6)),
              timestamp: timestampStr,
              address: 'Survei Geotagging Real-time Lapangan'
            };
            cachedGeotagCoordinatesRef.current = result; // cache it for consecutive photos
            resolve(result);
          },
          () => {
            const rLat = 2.9645 + (Math.random() - 0.5) * 0.005;
            const rLon = 99.8005 + (Math.random() - 0.5) * 0.005;
            resolve({
              latitude: Number(rLat.toFixed(6)),
              longitude: Number(rLon.toFixed(6)),
              timestamp: timestampStr,
              address: 'GPS Tanjungbalai, Sumatera Utara'
            });
          },
          { enableHighAccuracy: false, timeout: 1200 } // Super fast low-timeout prevents app freezing while requesting geolocation
        );
      } else {
        resolve(defaultData);
      }
    });
  };

  // Camera action handlers
  const videoRef = useRef<HTMLVideoElement>(null);

  const startLiveCamera = async (mode: 'user' | 'environment') => {
    setCameraError(null);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: mode, 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Error opening camera stream:", err);
      setCameraError("Gagal mengakses kamera internal. Hubungi admin atau gunakan opsi 'Upload & Kompres'.");
    }
  };

  const stopLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const switchFacingMode = () => {
    const nextMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextMode);
    startLiveCamera(nextMode);
  };

  const captureLivePhoto = () => {
    if (videoRef.current && onPhotoCapture) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      // Set resolution directly at photo click based on user setting
      const isHighRes = photoResolutionMode === 'high';
      const targetW = isHighRes ? 960 : 480;
      const targetH = video.videoWidth ? Math.round((video.videoHeight / video.videoWidth) * targetW) : (isHighRes ? 720 : 360);
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', isHighRes ? 0.85 : 0.70);
        
        // Stop stream and close modal
        stopLiveCamera();
        setCameraModalOpen(false);
        
        // Add Geotag to captured image and compress
        processGeotagAndCompression(dataUrl, true, onPhotoCapture);
      }
    }
  };

  // Main canvas-level processor for geotagging drawing and iterative JPG quality compression
  const processGeotagAndCompression = (
    imageUrl: string,
    addGeotag: boolean,
    callback: (compressedDataUrl: string) => void
  ) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = async () => {
      // Dynamic max dimensions based on the user-controlled photoResolutionMode
      const isHighRes = photoResolutionMode === 'high';
      const maxDimension = isHighRes ? 960 : 480;
      
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original image onto canvas
      ctx.drawImage(img, 0, 0, width, height);

      if (addGeotag) {
        const geo = await getGeotagCoordinates();
        setVerifierLat(geo.latitude);
        setVerifierLng(geo.longitude);

        // Translucent dark slate overlay background for clear telemetry contrast text representation
        const labelBarHeight = Math.round(height * 0.22);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(0, height - labelBarHeight, width, labelBarHeight);

        // Emerald horizontal accent brand line
        ctx.fillStyle = '#059669';
        ctx.fillRect(0, height - labelBarHeight, width, Math.max(2, Math.round(height * 0.008)));

        // Write information text inside overlay
        const fontSize = Math.max(7, Math.round(width * 0.026));
        ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = '#ffffff';

        const paddingLeft = Math.round(width * 0.04);
        let textY = height - labelBarHeight + Math.round(labelBarHeight * 0.32);

        ctx.fillText(`📍 GPS: Lat ${geo.latitude}, Lon ${geo.longitude}`, paddingLeft, textY);

        textY += Math.round(labelBarHeight * 0.26);
        ctx.font = `${fontSize - 1}px "Inter", sans-serif`;
        ctx.fillStyle = '#f1f5f9';
        ctx.fillText(`📅 WAKTU: ${geo.timestamp}`, paddingLeft, textY);

        textY += Math.round(labelBarHeight * 0.26);
        ctx.font = `italic ${fontSize - 1.5}px sans-serif`;
        ctx.fillStyle = '#34d399';
        
        let displayAddr = geo.address;
        if (displayAddr.length > 50) {
          displayAddr = displayAddr.substring(0, 47) + '...';
        }
        ctx.fillText(`🏷️ LOKASI: ${displayAddr}`, paddingLeft, textY);
      }

      // Progressively compress JPG based on size limits of selected quality mode
      const maxPayloadKb = isHighRes ? 120 : 32;
      let quality = isHighRes ? 0.85 : 0.70;
      let compressedUrl = canvas.toDataURL('image/jpeg', quality);
      let calculatedPayloadKb = (compressedUrl.length * 0.75) / 1024;

      let cycles = 0;
      while (calculatedPayloadKb > maxPayloadKb && quality > 0.15 && cycles < 10) {
        quality -= 0.10;
        compressedUrl = canvas.toDataURL('image/jpeg', quality);
        calculatedPayloadKb = (compressedUrl.length * 0.75) / 1024;
        cycles++;
      }

      // If still exceeding target limit scale down the resolution of image
      if (calculatedPayloadKb > maxPayloadKb) {
        const shrinkCanvas = document.createElement('canvas');
        shrinkCanvas.width = Math.round(width * 0.8);
        shrinkCanvas.height = Math.round(height * 0.8);
        const shrinkCtx = shrinkCanvas.getContext('2d');
        if (shrinkCtx) {
          shrinkCtx.drawImage(canvas, 0, 0, shrinkCanvas.width, shrinkCanvas.height);
          compressedUrl = shrinkCanvas.toDataURL('image/jpeg', isHighRes ? 0.6 : 0.4);
        }
      }

      callback(compressedUrl);
    };
  };

  // Convert uploaded regular image to compressed base64 format under 32KB
  const handleImageUploadHelper = (file: File, callback: (result: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const rawResult = reader.result;
        // Run compression (without always adding geotags since it is custom citizen uploaded document files)
        processGeotagAndCompression(rawResult, false, callback);

        // Fetch precise real-time coordinates of the device during upload and pin to physical coordinates
        getGeotagCoordinates().then(geo => {
          setVerifierLat(geo.latitude);
          setVerifierLng(geo.longitude);
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Handler helper to initiate verification from facilitator perspective
  const handleOpenVerifierModal = (rec: SLRTRecord) => {
    setSelectedVerifierRecord(rec);
    setVerifierNotes(rec.catatanPemeriksa || rec.catatan_pendata || '');
    
    // Auto-fill verifier's name automatically with the logged-in user's account name
    const activeName = session?.name || 'Petugas SLRT';
    setVerifierNamaPendata(activeName);
    
    setVerifierFotoKkKtp(rec.fotoKkKtp || rec.foto_ktp_url || '');
    setVerifierFotoDepanRumah(rec.fotoDepanRumah || rec.foto_hunian_url || '');
    
    // Use existing verifier photo (dokumentasiBukti) if present, otherwise set a random realistic placeholder
    if (rec.dokumentasiBukti) {
      setVerifierPhoto(rec.dokumentasiBukti);
    } else {
      const housePhotos = [
        'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=400', // poverty study
        'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=400', // paperwork
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400', // rustic wall
        'https://images.unsplash.com/photo-1516880711640-ef7db81be3e1?auto=format&fit=crop&q=80&w=400', // wooden structure
      ];
      const pickedPhoto = housePhotos[Math.floor(Math.random() * housePhotos.length)];
      setVerifierPhoto(pickedPhoto);
    }

    // Automatically set verification date/time to the EXACT current real-world timestamp
    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const hrs = String(today.getHours()).padStart(2, '0');
    const mins = String(today.getMinutes()).padStart(2, '0');
    const secs = String(today.getSeconds()).padStart(2, '0');
    const formattedDateTime = `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()} Pukul ${hrs}:${mins}:${secs} WIB`;
    
    setVerifierDate(formattedDateTime);
    setVerifierLat(rec.latitude || null);
    setVerifierLng(rec.longitude || null);
    setShowVerifierModal(true);

    // Otomatisasi deteksi GPS real-time ketika fasilitator saat membuka modal verifikasi aduan
    getGeotagCoordinates()
      .then((geo) => {
        setVerifierLat(geo.latitude);
        setVerifierLng(geo.longitude);
      })
      .catch((err) => {
        console.warn("Auto GPS detection in verifier modal failed:", err);
      });
  };

  // Submit/save visitation verification from facilitator perspective
  const handleConfirmVerifierVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerifierRecord) return;

    let compiledRecordForSync: SLRTRecord | null = null;
    const updatedRecords = records.map(rec => {
      if (rec.id === selectedVerifierRecord.id) {
        const history = rec.statusHistory ? [...rec.statusHistory] : [];
        const activeDate = verifierDate.trim() || 'Hari Ini';
        const activeNotes = verifierNotes.trim() || 'Kunjungan fisik lapangan dan pemeriksaan 18 indikator selesai diverifikasi tanpa catatan khusus.';
        const activeBy = verifierNamaPendata.trim() || session?.name || rec.namaFasilitator || 'Petugas SLRT';
        
        // Remove prior verified log if somehow present to prevent doubles, then push fresh
        const filteredHistory = history.filter(h => h.status !== 'Diverifikasi');
        filteredHistory.push({
          status: 'Diverifikasi',
          timestamp: activeDate,
          note: activeNotes,
          updatedBy: activeBy
        });

        const updated = normalizeRecord({
          ...rec,
          statusKunjungan: 'Sudah Dikunjungi' as const,
          tanggalPemeriksaan: activeDate,
          
          namaFasilitator: activeBy,
          namaPendata: activeBy,
          nama_pendata: activeBy,
          namapendata: activeBy,
          
          dokumentasiBukti: verifierPhoto,
          dokumentasibukti: verifierPhoto,
          dokumentasi_bukti: verifierPhoto,
          fotoOps: verifierPhoto,
          foto_ops: verifierPhoto,
          foto_ops_url: verifierPhoto,
          
          catatanPemeriksa: activeNotes,
          catatanpemeriksa: activeNotes,
          catatan_pemeriksa: activeNotes,
          catatan_pendata: activeNotes,
          
          fotoKkKtp: verifierFotoKkKtp,
          foto_ktp_url: verifierFotoKkKtp,
          foto_kk_ktp: verifierFotoKkKtp,
          fotokkktp: verifierFotoKkKtp,
          fotoKk: verifierFotoKkKtp,
          fotoKtp: verifierFotoKkKtp,
          
          fotoDepanRumah: verifierFotoDepanRumah,
          foto_hunian_url: verifierFotoDepanRumah,
          foto_depan_rumah: verifierFotoDepanRumah,
          fotodepanrumah: verifierFotoDepanRumah,
          fotoRumah: verifierFotoDepanRumah,
          statusHistory: filteredHistory,
          latitude: verifierLat !== null ? verifierLat : (cachedGeotagCoordinatesRef.current ? cachedGeotagCoordinatesRef.current.latitude : rec.latitude),
          longitude: verifierLng !== null ? verifierLng : (cachedGeotagCoordinatesRef.current ? cachedGeotagCoordinatesRef.current.longitude : rec.longitude)
        });
        compiledRecordForSync = updated;
        return updated;
      }
      return rec;
    });

    setRecords(updatedRecords);
    setSelectedRecordId(selectedVerifierRecord.id);
    setShowVerifierModal(false);
    setSelectedVerifierRecord(null);

    // Auto-sync the verified visitation fields back to the Google Sheets central database
    if (compiledRecordForSync) {
      saveRecordOverride(compiledRecordForSync);
      handleSyncToGoogleSheets(compiledRecordForSync, true);
    }
  };

  // Citizen direct report submit handler (Pelaporan Mandiri Warga)
  const handleWargaSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wargaAddNama.trim() || !wargaAddPhone.trim() || !wargaAddPengaduan.trim()) {
      alert("Harap lengkapi setidaknya Nama Lengkap, No HP/WhatsApp, dan Keluhan Anda.");
      return;
    }

    const cleanNik = wargaAddNik.trim();
    if (!cleanNik) {
      alert("⚠️ NIK Klien wajib diisi!");
      return;
    }
    if (cleanNik.length !== 16 || !/^\d+$/.test(cleanNik)) {
      alert("⚠️ NIK Klien harus tepat 16 digit angka.");
      return;
    }

    const isDuplicate = records.some(r => r.nik === cleanNik);
    if (isDuplicate) {
      const dupRec = records.find(r => r.nik === cleanNik);
      alert(`⚠️ Duplikasi NIK Terdeteksi!\n\nNIK (${cleanNik}) sudah pernah terdaftar atas nama "${dupRec?.namaKlien}" (Kelurahan ${dupRec?.kelurahan}, Status Kunjungan: ${dupRec?.statusKunjungan || 'Belum Dikunjungi'}).\n\nLaporan rujukan mandiri baru tidak dapat diajukan apabila NIK telah terdaftar sebelumnya dalam database pelayanan SLRT.`);
      return;
    }

    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dateFormatted = `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    // Select randomly from the approved list of facilitators to assign this ticket
    const activeFacilitatingStaff = facilitators.filter(f => f.status === 'APPROVED').map(f => f.name);
    const assignedFasil = activeFacilitatingStaff.length > 0 
      ? activeFacilitatingStaff[Math.floor(Math.random() * activeFacilitatingStaff.length)]
      : 'Belum Ditugaskan';

    const statusHistory = [
      {
        status: 'Dibuat',
        timestamp: dateFormatted,
        note: 'Pendaftaran aduan mandiri secara daring melalui portal mandiri warga.',
        updatedBy: wargaAddNama.trim()
      }
    ];

    if (assignedFasil) {
      statusHistory.push({
        status: 'Ditugaskan',
        timestamp: dateFormatted,
        note: `Ditugaskan secara otomatis oleh sistem kepada Petugas Fasilitator Wilayah: ${assignedFasil}.`,
        updatedBy: 'Sistem SLRT'
      });
    }

    const CitizenReport: SLRTRecord = {
      id: `warga-${Date.now()}`,
      namaFasilitator: assignedFasil,
      kelurahan: wargaAddKelurahan,
      kecamatan: wargaAddKecamatan,
      hariTanggal: dateFormatted,
      namaKlien: wargaAddNama.trim(),
      nik: cleanNik,
      pekerjaanKrt: wargaAddPekerjaan.trim() || 'Tidak Tetap/Serabutan',
      namaKuasa: wargaAddNamaKuasa.trim() || '-',
      alamatKlien: wargaAddAlamat.trim() || 'Alamat dikonfirmasi saat kunjungan lapangan.',
      noTelpon: wargaAddPhone.trim(),
      dokumen: `KK, KTP (NIK: ${cleanNik})`,
      status: wargaAddStatus,
      bantuanDiterima: wargaAddBantuanDiterimaList.length > 0 ? wargaAddBantuanDiterimaList.join(', ') : 'Belum Ada',
      statusRumah: wargaAddStatusRumah,
      jenisPenerangan: wargaAddJenisPenerangan,
      mck: wargaAddMck,
      pendapatanPerbulan: wargaAddPendapatanPerbulan.trim() || 'Tidak Tetap/Kerja Serabutan',
      jenisPengaduan: wargaAddPengaduan.trim(),
      jenisLayanan: wargaAddJenisLayanan.trim() || 'Pengusulan DTKS & Bantuan Sosial Berjalan',
      isHighPriority: checkIsHighPriority(wargaAddPengaduan.trim()),
      
      statusKunjungan: 'Belum Dikunjungi',
      diinputOleh: 'Warga',

      // New fields
      indikatorSosialEkonomi: wargaAddIndikatorSosialEkonomi,
      kelayakanHuni: wargaAddKelayakanHuni,
      bantuanDiterimaList: wargaAddBantuanDiterimaList,
      statusHistory
    };

    setRecords(prev => [CitizenReport, ...prev]);
    saveRecordOverride(CitizenReport);
    
    // Auto-sync directly to Google Sheets database in the background
    handleSyncToGoogleSheets(CitizenReport, true);

    setWargaSearchQuery(wargaAddPhone.trim()); // auto lock lookup search query to easily let citizen track it!
    setWargaFormSuccess(`Laporan Anda berhasil dikirim! Silakan lacak dengan menggunakan kata kunci nomor HP: ${wargaAddPhone}`);
    
    // Reset warga form inputs
    setWargaAddNama('');
    setWargaAddAlamat('');
    setWargaAddPhone('');
    setWargaAddPengaduan('');
    setWargaAddPekerjaan('');
    setWargaAddNik('');
    setWargaAddNamaKuasa('-');
    setWargaAddDokumen('KK, KTP');
    setWargaAddStatus('Miskin');
    setWargaAddBantuanDiterima('Belum Ada');
    setWargaAddStatusRumah('Milik Sendiri');
    setWargaAddJenisPenerangan('PLN Bersubsidi 450W');
    setWargaAddMck('Sendiri Layak');
    setWargaAddPendapatanPerbulan('');
    setWargaAddJenisLayanan('');
    setWargaAddIndikatorSosialEkonomi([]);
    setWargaAddKelayakanHuni([]);
    setWargaAddBantuanDiterimaList([]);

    // Clear success message after 12 secs
    setTimeout(() => {
      setWargaFormSuccess(null);
    }, 12000);
  };

  // Delete Record
  const handleDeleteRecord = (id: string) => {
    if (userRole !== 'admin') {
      alert("Hanya Admin Database yang diperbolehkan menghapus data.");
      return;
    }

    const recordToDelete = records.find(rec => rec.id === id);
    if (recordToDelete) {
      // Set statusKunjungan to 'Dihapus' to synchronize with Google Sheets in near real-time
      const updatedDeletedRecord = {
        ...recordToDelete,
        statusKunjungan: 'Dihapus' as any,
        diinputOleh: 'Admin (Deleted)'
      };
      handleSyncToGoogleSheets(updatedDeletedRecord, true);

      // Try to physically delete from Google Sheets if they have updated the Apps Script code
      fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'deleteRecord',
          id: id
        })
      }).catch(err => console.warn("Optional physical delete record failed:", err));
    }

    try {
      const deletedIdsString = localStorage.getItem('slrt_deleted_record_ids') || '[]';
      const deletedIds = JSON.parse(deletedIdsString);
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('slrt_deleted_record_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {
      console.error("Error storing deleted record ID:", e);
    }

    setRecords(prev => prev.filter(rec => rec.id !== id));
    deleteRecordOverride(id);
    if (selectedRecordId === id) {
      const remaining = records.filter(rec => rec.id !== id);
      setSelectedRecordId(remaining.length > 0 ? remaining[0].id : null);
    }
    setShowDeleteConfirm(null);
  };

  // Set up edit form
  const handleEditRecordSetup = (rec: SLRTRecord) => {
    setEditingId(rec.id);
    setFormFasilitator(rec.namaFasilitator);
    setFormKecamatan(rec.kecamatan);
    setFormKelurahan(rec.kelurahan);
    setFormHariTanggal(rec.hariTanggal);
    setFormNamaKlien(rec.namaKlien);
    let nikVal = rec.nik || '';
    if (!nikVal && rec.dokumen) {
      const match = rec.dokumen.match(/NIK:\s*(\d{16})/i);
      if (match) {
        nikVal = match[1];
      }
    }
    setFormNik(nikVal);
    setFormPekerjaanKrt(rec.pekerjaanKrt);
    setFormNamaKuasa(rec.namaKuasa);
    setFormAlamatKlien(rec.alamatKlien);
    setFormNoTelpon(rec.noTelpon);
    setFormDokumen(rec.dokumen);
    setFormStatus(rec.status);
    setFormBantuanDiterima(rec.bantuanDiterima);
    setFormStatusRumah(rec.statusRumah);
    setFormJenisPenerangan(rec.jenisPenerangan);
    setFormMck(rec.mck);
    setFormPendapatanPerbulan(rec.pendapatanPerbulan);
    setFormJenisPengaduan(rec.jenisPengaduan);
    setFormJenisLayanan(rec.jenisLayanan);
    setFormIndikatorSosialEkonomi(rec.indikatorSosialEkonomi || []);
    setFormKelayakanHuni(rec.kelayakanHuni || []);
    setFormBantuanDiterimaList(rec.bantuanDiterimaList || []);
    setFormLatitude(rec.latitude !== undefined && rec.latitude !== null ? rec.latitude : null);
    setFormLongitude(rec.longitude !== undefined && rec.longitude !== null ? rec.longitude : null);

    setActiveTab('add-record');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const matchesSearch = 
        rec.namaKlien.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.namaFasilitator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.alamatKlien.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.jenisPengaduan.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesKecamatan = filterKecamatan ? rec.kecamatan === filterKecamatan : true;
      const matchesKelurahan = filterKelurahan ? rec.kelurahan.toLowerCase() === filterKelurahan.toLowerCase() : true;
      const matchesStatus = filterStatus ? rec.status === filterStatus : true;
      const matchesKunjungan = filterKunjungan ? (rec.statusKunjungan || 'Belum Dikunjungi') === filterKunjungan : true;

      let matchesFasilitatorFilter = true;
      if (selectedFacilitatorFilter && selectedFacilitatorFilter !== 'all') {
        matchesFasilitatorFilter = rec.namaFasilitator === selectedFacilitatorFilter;
      }

      let matchesPendataFilter = true;
      if (selectedPendataFilter && selectedPendataFilter !== 'all') {
        matchesPendataFilter = rec.namaPendata === selectedPendataFilter;
      }

      // Range Month & Year filter
      const parsedDate = parseMonthAndYear(rec.hariTanggal);
      
      const startRangeVal = filterStartYear && filterStartMonth 
        ? parseInt(filterStartYear, 10) * 12 + parseInt(filterStartMonth, 10)
        : filterStartYear 
          ? parseInt(filterStartYear, 10) * 12 + 1
          : null;

      const endRangeVal = filterEndYear && filterEndMonth 
        ? parseInt(filterEndYear, 10) * 12 + parseInt(filterEndMonth, 10)
        : filterEndYear 
          ? parseInt(filterEndYear, 10) * 12 + 12
          : null;

      let matchesDateRange = true;
      if (parsedDate) {
        if (startRangeVal !== null && parsedDate.value < startRangeVal) {
          matchesDateRange = false;
        }
        if (endRangeVal !== null && parsedDate.value > endRangeVal) {
          matchesDateRange = false;
        }
      } else {
        // Only screen if at least one filter boundary is active
        if (startRangeVal !== null || endRangeVal !== null) {
          matchesDateRange = false;
        }
      }

      // Rentang tanggal verifikasi lapangan (tanggalPemeriksaan)
      let matchesVerifDateRange = true;
      if (filterVerifStartDate || filterVerifEndDate) {
        if (rec.tanggalPemeriksaan) {
          const pDate = parseVerificationDate(rec.tanggalPemeriksaan);
          if (pDate) {
            if (filterVerifStartDate) {
              const startD = new Date(filterVerifStartDate);
              startD.setHours(0,0,0,0);
              if (pDate < startD) matchesVerifDateRange = false;
            }
            if (filterVerifEndDate) {
              const endD = new Date(filterVerifEndDate);
              endD.setHours(23,59,59,999);
              if (pDate > endD) matchesVerifDateRange = false;
            }
          } else {
            matchesVerifDateRange = false;
          }
        } else {
          matchesVerifDateRange = false;
        }
      }

      let matchesBulanBerjalan = true;
      if (filterBulanBerjalan) {
        if (parsedDate) {
          matchesBulanBerjalan = parsedDate.month === 6 && parsedDate.year === 2026;
        } else {
          matchesBulanBerjalan = false;
        }
      }

      return matchesSearch && matchesKecamatan && matchesKelurahan && matchesStatus && matchesKunjungan && matchesFasilitatorFilter && matchesPendataFilter && matchesDateRange && matchesVerifDateRange && matchesBulanBerjalan;
    });
  }, [
    records, 
    searchQuery, 
    filterKecamatan, 
    filterKelurahan, 
    filterStatus, 
    filterKunjungan, 
    selectedFacilitatorFilter,
    selectedPendataFilter,
    filterStartMonth,
    filterStartYear,
    filterEndMonth,
    filterEndYear,
    filterVerifStartDate,
    filterVerifEndDate,
    filterBulanBerjalan
  ]);

  // Selected Object
  const selectedRecord = useMemo(() => {
    return records.find(rec => rec.id === selectedRecordId) || null;
  }, [records, selectedRecordId]);

  // Stats per Kelurahan for current month (Juni 2026)
  const currentMonthKelurahanStats = useMemo(() => {
    const stats: Record<string, { total: number; visited: number; unvisited: number }> = {};
    records.forEach(r => {
      if (r.isDeleted === true || r.isDeleted === 'true') return;
      const parsedDate = parseMonthAndYear(r.hariTanggal);
      const isCurrentMonth = parsedDate && parsedDate.month === 6 && parsedDate.year === 2026;
      if (isCurrentMonth) {
        const kel = r.kelurahan || 'Tidak Diketahui';
        if (!stats[kel]) {
          stats[kel] = { total: 0, visited: 0, unvisited: 0 };
        }
        stats[kel].total += 1;
        if (r.statusKunjungan === 'Sudah Dikunjungi') {
          stats[kel].visited += 1;
        } else {
          stats[kel].unvisited += 1;
        }
      }
    });
    return stats;
  }, [records]);

  // 18 formats text generator
  const generateListText = (rec: SLRTRecord) => {
    return `1. Nama Fasilitator: ${rec.namaFasilitator}
2. Kelurahan: ${rec.kelurahan}
3. Kecamatan: ${rec.kecamatan}
4. Hari/Tanggal: ${rec.hariTanggal}
5. Nama Klien: ${rec.namaKlien}
6. Pekerjaan KRT (Kepala Rumah Tangga): ${rec.pekerjaanKrt}
7. Nama Kuasa: ${rec.namaKuasa}
8. Alamat Klien: ${rec.alamatKlien}
9. No Telpon: ${rec.noTelpon}
10. Dokumen: ${rec.dokumen}
11. Status: ${rec.status}
12. Bantuan yang Sudah Diperoleh: ${rec.bantuanDiterima}
13. Status Rumah: ${rec.statusRumah}
14. Jenis Penerangan: ${rec.jenisPenerangan}
15. MCK: ${rec.mck}
16. Pendapatan Perbulan: ${rec.pendapatanPerbulan}
17. Jenis Pengaduan: ${rec.jenisPengaduan}
18. Jenis Layanan yang Diinginkan: ${rec.jenisLayanan}`;
  };

  // Markdown generator
  const generateMarkdownTable = (recList: SLRTRecord[]) => {
    let md = `| No | Nama Klien | J.Kel / Alamat | Pekerjaan KRT | Bantuan Terakhir | Status Sosial | Penghasilan | Keluhan / Pengaduan | Layanan yang Diinginkan |\n|---|---|---|---|---|---|---|---|---|\n`;
    
    recList.forEach((rec, idx) => {
      const cleanAlamat = rec.alamatKlien.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const cleanKeluhan = rec.jenisPengaduan.substring(0, 150).replace(/\|/g, '\\|').replace(/\n/g, ' ') + (rec.jenisPengaduan.length > 150 ? '...' : '');
      const cleanLayanan = rec.jenisLayanan.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      md += `| ${idx + 1} | **${rec.namaKlien}** <br> \`Kel. ${rec.kelurahan}\` | ${cleanAlamat} <br> Telp: ${rec.noTelpon} | ${rec.pekerjaanKrt} | ${rec.bantuanDiterima} | **${rec.status}** | ${rec.pendapatanPerbulan} | ${cleanKeluhan} | ${cleanLayanan} |\n`;
    });
    return md;
  };

  // Clipboard copy
  const handleCopyToClipboard = (text: string, type: 'list' | 'tbl') => {
    navigator.clipboard.writeText(text);
    setCopiedRecordId(type);
    setTimeout(() => {
      setCopiedRecordId(null);
    }, 2000);
  };

  // Export
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Data_SLRT_KITO_Tanjungbalai_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Advanced Export to CSV / XLSX with custom columns (Nama Petugas, Tanggal Verifikasi, Catatan Petugas, Status Verifikasi)
  const handleAdvancedExport = (format: 'CSV' | 'xlsx') => {
    if (filteredRecords.length === 0) {
      alert("Tidak ada data hasil filter untuk diekspor. Silakan ubah kriteria saringan.");
      return;
    }

    const exportData = filteredRecords.map((rec, idx) => ({
      'No': idx + 1,
      'ID Dokumen': rec.id,
      'Nama Klien / Penerima': rec.namaKlien,
      'Kecamatan': rec.kecamatan,
      'Kelurahan': rec.kelurahan,
      'Alamat Lengkap Klien': rec.alamatKlien,
      'No Telepon / WA': rec.noTelpon,
      'Kelengkapan Berkas Kependudukan': rec.dokumen,
      'Status Kesejahteraan (DTKS)': rec.status,
      'Estimasi Penghasilan Bulanan': rec.pendapatanPerbulan,
      'Status Kepemilikan Rumah': rec.statusRumah,
      'Sumber Penerangan Utama': rec.jenisPenerangan,
      'Kondisi Fasilitas Sanitasi MCK': rec.mck,
      'Bantuan Sosial Diterima': rec.bantuanDiterima || 'Belum Terdaftar',
      'Masalah / Deskripsi Kasus': rec.jenisPengaduan,
      'Jenis Layanan Rujukan': rec.jenisLayanan,
      'Sumber Input Awal': rec.diinputOleh || 'Admin',
      'Tanggal Input / Registrasi': rec.hariTanggal,
      
      // Target requested verification metrics with side-by-side columns
      'Fasilitator Lapangan': rec.namaFasilitator || 'Belum Ditunjuk',
      'Nama Pendata': rec.namaPendata || (rec.statusKunjungan === 'Sudah Dikunjungi' ? (rec.namaFasilitator || 'Petugas SLRT') : 'Belum Diverifikasi'),
      'Tanggal Verifikasi Lapangan (Audit)': rec.tanggalPemeriksaan || 'Belum Diverifikasi',
      'Tanggal Verifikasi': (rec.statusKunjungan === 'Sudah Dikunjungi') ? (rec.tanggalPemeriksaan || '') : '',
      'Catatan Petugas Lapangan (Verifikasi)': rec.catatanPemeriksa || 'Belum ada catatan lapangan',
      'Status Verifikasi Kunjungan': rec.statusKunjungan || 'Belum Dikunjungi'
    }));

    // Construct metadata filename
    let fileNamePrefix = 'Laporan_Terpadu_SLRT_KITO_Tanjungbalai';
    if (selectedFacilitatorFilter && selectedFacilitatorFilter !== 'all') {
      fileNamePrefix += `_Fas_${selectedFacilitatorFilter.replace(/\s+/g, '_')}`;
    }
    if (selectedPendataFilter && selectedPendataFilter !== 'all') {
      fileNamePrefix += `_Pen_${selectedPendataFilter.replace(/\s+/g, '_')}`;
    }
    if (filterVerifStartDate || filterVerifEndDate) {
      fileNamePrefix += `_Verif_${filterVerifStartDate || 'Awal'}_to_${filterVerifEndDate || 'Akhir'}`;
    }
    const currentFormattedDate = new Date().toISOString().slice(0, 10);

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan SLRT KITO");
      
      const max_cols = exportData.reduce((acc, row) => {
        Object.keys(row).forEach((key, idx) => {
          const val = row[key as keyof typeof row] ? row[key as keyof typeof row]!.toString() : '';
          acc[idx] = Math.max(acc[idx] || 0, val.length, key.length);
        });
        return acc;
      }, [] as number[]);
      worksheet['!cols'] = max_cols.map(len => ({ wch: Math.min(len + 3, 50) }));

      XLSX.writeFile(workbook, `${fileNamePrefix}_${currentFormattedDate}.xlsx`);
    } else {
      const headers = Object.keys(exportData[0]).join(',');
      const rows = exportData.map(row => {
        return Object.values(row).map(val => {
          const strVal = val ? val.toString().replace(/"/g, '""').replace(/\n/g, ' ') : '';
          return `"${strVal}"`;
        }).join(',');
      });
      
      const csvStr = "\uFEFF" + [headers, ...rows].join('\n');
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", `${fileNamePrefix}_${currentFormattedDate}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  // Google Sheets Web App Synchronization (Real Integration)
  const handleSyncToGoogleSheets = async (rec: SLRTRecord, silent: boolean = false) => {
    setSyncingRecordId(rec.id);
    if (silent) {
      setBackgroundSyncStatus('syncing');
      setSyncingTargetName(rec.namaKlien);
    }
    try {
      await fetch(GOOGLE_SHEETS_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify({
          action: 'syncRecord',
          data: rec
        })
      });
      
      // Clear the local override so it doesn't mask cloud updates or conflicts on other machines
      deleteRecordOverride(rec.id);

      if (silent) {
        setBackgroundSyncStatus('success');
        setTimeout(() => setBackgroundSyncStatus('idle'), 4000);
      } else {
        alert(`Berhasil Mengirim Data!\nCatatan pemohon "${rec.namaKlien}" telah disinkronisasikan langsung ke Google Sheets Anda secara real-time.`);
      }

      // Automatically refresh in the background to update client memory
      await refreshFromCloud(false);
    } catch (err) {
      console.error(err);
      if (silent) {
        setBackgroundSyncStatus('error');
        setTimeout(() => setBackgroundSyncStatus('idle'), 4000);
      } else {
        alert("Gagal mensinkronisasikan data ke Google Sheets. Silakan periksa koneksi jaringan Anda.");
      }
    } finally {
      setSyncingRecordId(null);
    }
  };

  // Bulk Google Sheets Synchronization
  const handleBulkSyncToGoogleSheets = async () => {
    if (records.length === 0) {
      alert("Tidak ada data dalam database untuk disinkronkan.");
      return;
    }
    
    const confirmSync = window.confirm(`Apakah Anda yakin ingin mengekspor seluruh database (${records.length} data) ke Google Sheets secara massal?`);
    if (!confirmSync) return;
    
    setSyncingRecordId('all');
    let successCount = 0;
    
    for (const rec of records) {
      try {
        await fetch(GOOGLE_SHEETS_API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain"
          },
          body: JSON.stringify({
            action: 'syncRecord',
            data: rec
          })
        });
        successCount++;
      } catch (err) {
        console.error("Failed to sync record ID: " + rec.id, err);
      }
    }
    
    alert(`Sinkronisasi Selesai!\nSistem berhasil mengirimkan ${successCount} dari ${records.length} data rujukan SLRT ke Google Sheets.`);
    setSyncingRecordId(null);
  };

  // Input Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          if (event.target?.result) {
            const parsed = JSON.parse(event.target.result as string);
            if (Array.isArray(parsed)) {
              const proceed = window.confirm(`Apakah Anda yakin ingin mengimpor ${parsed.length} data kunjungan?`);
              if (proceed) {
                setRecords(prev => {
                  const merged = [...parsed, ...prev];
                  const unique = merged.filter((item, index, self) => 
                    index === self.findIndex((t) => t.id === item.id)
                  );
                  return unique;
                });
                alert("Berhasil mengimpor data!");
              }
            } else {
              alert("Data JSON tidak sesuai format.");
            }
          }
        } catch (err) {
          alert("Gagal membaca file JSON.");
        }
      };
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          if (event.target?.result) {
            const text = event.target.result as string;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
              alert("Berkas CSV kosongan atau tidak memiliki baris data.");
              return;
            }

            const rawHeaders = parseCSVLine(lines[0]);
            const headerIndices: { key: keyof SLRTRecord; index: number }[] = [];

            rawHeaders.forEach((h, idx) => {
              const cleanH = h.toLowerCase().trim().replace(/["]/g, '');
              const mappedKey = CSV_HEADER_MAP[cleanH] || CSV_HEADER_MAP[cleanH.replace(/_/, ' ')];
              if (mappedKey) {
                headerIndices.push({ key: mappedKey, index: idx });
              }
            });

            if (headerIndices.length === 0) {
              alert("Gagal mengidentifikasi kolom data di baris header CSV. Pastikan tajuk kolom sesuai format resmi.");
              return;
            }

            const parsedRecords: SLRTRecord[] = [];
            for (let i = 1; i < lines.length; i++) {
              const columns = parseCSVLine(lines[i]);
              if (columns.length === 0 || (columns.length === 1 && columns[0] === '')) continue;
              
              const rec: Partial<SLRTRecord> = {};
              headerIndices.forEach(({ key, index }) => {
                if (index < columns.length) {
                  let val: any = columns[index].trim();
                  // Clean surrounding quotes
                  if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.substring(1, val.length - 1).trim();
                  }

                  if (key === 'isHighPriority') {
                    val = val === 'true' || val === '1' || val === 'Ya' || val === 'true';
                  } else if (key === 'indikatorSosialEkonomi' || key === 'kelayakanHuni' || key === 'bantuanDiterimaList') {
                    if (val) {
                      // Determine separator
                      if (val.includes(';')) {
                        val = val.split(';').map((s: string) => s.trim()).filter((s: string) => s);
                      } else if (val.includes(',')) {
                        val = val.split(',').map((s: string) => s.trim()).filter((s: string) => s);
                      } else {
                        val = [val.trim()];
                      }
                    } else {
                      val = [];
                    }
                  }
                  (rec as any)[key] = val;
                }
              });

              if (!rec.id) {
                rec.id = `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              }
              if (!rec.namaKlien) {
                continue;
              }
              
              // Maintain synchronization between assistance types (list vs string format)
              if (rec.bantuanDiterimaList && rec.bantuanDiterimaList.length > 0 && (!rec.bantuanDiterima || rec.bantuanDiterima === 'Belum Ada')) {
                rec.bantuanDiterima = rec.bantuanDiterimaList.join(', ');
              } else if (rec.bantuanDiterima && (!rec.bantuanDiterimaList || rec.bantuanDiterimaList.length === 0)) {
                rec.bantuanDiterimaList = rec.bantuanDiterima.split(';').map((s: string) => s.trim()).filter((s: string) => s);
                if (rec.bantuanDiterimaList.length === 0 && rec.bantuanDiterima !== 'Belum Ada') {
                  rec.bantuanDiterimaList = rec.bantuanDiterima.split(',').map((s: string) => s.trim()).filter((s: string) => s);
                }
              }

              rec.namaFasilitator = rec.namaFasilitator || 'Petugas SLRT';
              rec.kecamatan = rec.kecamatan || 'Tanjungbalai Selatan';
              rec.kelurahan = rec.kelurahan || 'Indra Sakti';
              rec.hariTanggal = rec.hariTanggal || new Date().toLocaleDateString('id-ID');
              rec.statusKunjungan = (rec.statusKunjungan as any) || 'Belum Dikunjungi';

              // Call normalizeRecord to apply defaults, history, status and database synchronization rules
              const normalized = normalizeRecord(rec as SLRTRecord);
              parsedRecords.push(normalized);
            }

            if (parsedRecords.length === 0) {
              alert("Tidak ada data valid yang dapat diimpor dari file CSV.");
              return;
            }

            const proceed = window.confirm(`Apakah Anda yakin ingin mengimpor ${parsedRecords.length} data rujukan SLRT dari berkas CSV ini?`);
            if (proceed) {
              setRecords(prev => {
                const merged = [...parsedRecords, ...prev];
                const unique = merged.filter((item, index, self) => 
                  index === self.findIndex((t) => t.id === item.id)
                );
                return unique;
              });
              alert(`Berhasil mengimpor ${parsedRecords.length} data rujukan SLRT dari CSV!`);
            }
          }
        } catch (err) {
          console.error(err);
          alert("Gagal memproses berkas CSV.");
        }
      };
    }
  };

  const handleDownloadCSVTemplate = () => {
    const headers = [
      "ID",
      "Nama Klien",
      "Kecamatan",
      "Kelurahan",
      "Alamat Lengkap",
      "No Telpon",
      "Dokumen Pendukung",
      "Status DTKS",
      "Pendapatan Perbulan",
      "Status Rumah",
      "Jenis Penerangan",
      "Kondisi MCK",
      "Bantuan Sudah Diperoleh",
      "Jenis Pengaduan",
      "Jenis Layanan",
      "Nama Fasilitator",
      "Hari Tanggal Input",
      "Status Kunjungan",
      "Tanggal Verifikasi",
      "Catatan Pemeriksa",
      "Indikator Sosial Ekonomi",
      "Kelayakan Huni",
      "Bantuan Diterima List"
    ];

    const sampleRow1 = [
      "rec-tpl-001",
      "Maimunah",
      "Tanjungbalai Selatan",
      "Indra Sakti",
      "Jl. Masjid No. 24, Lingkungan II",
      "081234567890",
      "KK, KTP",
      "Sangat Miskin",
      "750000",
      "Sewa Bulanan",
      "PLN Bersubsidi 450W",
      "MCK Umum/Tidak Layak",
      "Belum Ada",
      "Kurang modal usaha pedagang asongan dan jaminan KIS",
      "PKH, PBI Jaminan Kesehatan",
      "Ahmad Fauzi",
      "Senin, 01 Juni 2026",
      "Belum Dikunjungi",
      "",
      "",
      "Pendapatan di bawah UMR / tidak menentu; Pekerjaan Kepala Keluarga serabutan / non-formal",
      "Status tinggal menyewa / sewa bulanan / menumpang keluarga; MCK menumpang / umum / tidak layak",
      "Belum Ada"
    ];

    const sampleRow2 = [
      "rec-tpl-002",
      "Syamsudin",
      "Tanjungbalai Utara",
      "Kuala Silau Bestari",
      "Jl. Pantai Amor, Lingkungan IV",
      "085398765432",
      "KK",
      "Miskin",
      "1200000",
      "Milik Sendiri",
      "PLN Bersubsidi 450W",
      "Sendiri Layak",
      "PKH",
      "Keluarga sakit menahun butuh rujukan RSUD",
      "PBI Jaminan Kesehatan / KIS",
      "Siti Rahma",
      "Selasa, 02 Juni 2026",
      "Sudah Dikunjungi",
      "Kamis, 04 Juni 2026",
      "Rumah sudah disurvei lapangan. Atap keropos layak program rutilahu.",
      "Pendapatan di bawah UMR / tidak menentu; Anggota keluarga sakit menahun / disabilitas tanpa perawatan medik",
      "Atap rumah bocor parah / seng keropos",
      "PKH (Program Keluarga Harapan)"
    ];

    const csvContent = "\uFEFF" + [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      sampleRow1.map(v => `"${v.replace(/"/g, '""')}"`).join(','),
      sampleRow2.map(v => `"${v.replace(/"/g, '""')}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "SLRT_Tanjungbalai_Template_Impor.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Seed Reset
  const handleResetToDemo = () => {
    if (window.confirm("Apakah Anda yakin ingin mengatur ulang data kembali ke data contoh bawaan?")) {
      localStorage.removeItem('slrt_deleted_record_ids');
      localStorage.removeItem('slrt_record_overrides');
      setRecords(INITIAL_RECORDS);
      setSelectedRecordId(null);
      localStorage.setItem('slrt_records', JSON.stringify(INITIAL_RECORDS));
    }
  };

  // Clear Database completely
  const handleClearDatabase = () => {
    if (window.confirm("Apakah Anda yakin ingin MENGOSONGKAN seluruh database? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data rujukan serta akun petugas lapangan lokal.")) {
      localStorage.removeItem('slrt_records');
      localStorage.removeItem('slrt_deleted_record_ids');
      localStorage.removeItem('slrt_record_overrides');
      localStorage.removeItem('slrt_facilitators');
      localStorage.removeItem('slrt_deleted_facilitator_ids');
      localStorage.removeItem('slrt_status_overrides');
      
      setRecords([]);
      setFacilitators([]);
      setSelectedRecordId(null);
      alert("Seluruh database berhasil dikosongkan sepenuhnya!");
    }
  };

  // Formatted client slip generation
  const handlePrintSlip = () => {
    if (!selectedRecord) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>SLRT KITO - Laporan Pengaduan: ${selectedRecord.namaKlien}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 40px; 
              color: #1e293b; 
              line-height: 1.5; 
              background-color: #fff;
              max-width: 800px;
              margin: 0 auto;
            }
            .header-container { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              gap: 20px; 
              border-bottom: 3px double #94a3b8; 
              padding-bottom: 16px; 
              margin-bottom: 24px; 
            }
            .header-logo { 
              height: 75px; 
              flex-shrink: 0; 
            }
            .header-text { 
              text-align: center; 
              flex-grow: 1; 
            }
            .header-text h1 { 
              margin: 0; 
              font-size: 16px; 
              text-transform: uppercase; 
              font-weight: 700; 
              color: #1e293b; 
              letter-spacing: 0.5px;
            }
            .header-text h2 { 
              margin: 3px 0 0; 
              font-size: 18px; 
              text-transform: uppercase; 
              color: #0f766e; 
              font-weight: 700; 
              letter-spacing: 0.5px;
            }
            .header-text h3 { 
              margin: 4px 0 0; 
              font-size: 10px; 
              font-weight: 500; 
              color: #64748b; 
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .header-text p { 
              margin: 2px 0 0; 
              font-size: 9px; 
              color: #94a3b8; 
            }
            
            .doc-title {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .doc-metadata {
              font-size: 10px;
              color: #64748b;
              margin-bottom: 20px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            
            .section-title {
              background-color: #f1f5f9;
              color: #0f766e;
              font-size: 11px;
              font-weight: 700;
              padding: 6px 12px;
              margin-top: 20px;
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-radius: 4px;
            }
            
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            .info-table td {
              padding: 6px 8px;
              font-size: 11px;
              vertical-align: top;
              border-bottom: 1px solid #f8fafc;
            }
            .info-table td.label {
              width: 32%;
              font-weight: 600;
              color: #64748b;
            }
            .info-table td.separator {
              width: 3%;
              color: #64748b;
              text-align: center;
              padding-right: 0;
              padding-left: 0;
            }
            .info-table td.value {
              width: 65%;
              color: #1e293b;
              word-break: break-word;
            }
            
            .grid-2col {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }

            .row-fullwidth {
              border-bottom: 1px solid #f1f5f9;
              padding: 8px;
              font-size: 11px;
            }
            .row-fullwidth .label {
              font-weight: 600;
              color: #64748b;
              margin-bottom: 4px;
            }
            .row-fullwidth .value {
              color: #1e293b;
              white-space: pre-wrap;
              line-height: 1.6;
              word-break: break-word;
            }

            /* Section V Documentation */
            .doc-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-top: 10px;
            }
            .doc-card {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px;
              background-color: #f8fafc;
              text-align: center;
            }
            .doc-img-container {
              width: 100%;
              height: 180px;
              background-color: #e2e8f0;
              border-radius: 6px;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              border: 1px dashed #94a3b8;
            }
            .doc-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .doc-placeholder {
              color: #94a3b8;
              font-size: 10px;
              font-weight: 600;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 6px;
            }
            .doc-placeholder-icon {
              font-size: 24px;
            }
            .doc-caption {
              font-size: 10px;
              font-weight: 700;
              color: #334155;
              margin-top: 4px;
            }
            .doc-subcaption {
              font-size: 9px;
              color: #64748b;
              margin-top: 2px;
            }

            .signatures-container {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
              page-break-inside: avoid;
            }
            .sig-box {
              text-align: center;
              width: 250px;
              font-size: 11px;
            }
            .sig-space {
              height: 60px;
            }
            .sig-name {
              font-weight: 700;
              border-bottom: 1px solid #1e293b;
              display: inline-block;
              padding-bottom: 2px;
              min-width: 180px;
              margin-top: 10px;
            }
            
            .footer-disclaimer {
              margin-top: 40px;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              font-size: 8px;
              font-style: italic;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }

            .btn-print { 
              background: #0f766e; 
              color: #fff; 
              border: 0; 
              padding: 10px 20px; 
              border-radius: 8px; 
              font-family: inherit; 
              font-size: 12px;
              cursor: pointer; 
              margin-bottom: 20px; 
              font-weight: 600; 
              transition: all 0.2s; 
              box-shadow: 0 4px 6px -1px rgba(15, 118, 110, 0.2);
            }
            .btn-print:hover { 
              background: #0d5c56; 
              box-shadow: 0 4px 12px -1px rgba(15, 118, 110, 0.3);
            }
            @page {
              size: A4;
              margin: 1.5cm;
            }
            @media print {
              .btn-print { display: none; }
              body { 
                padding: 0; 
                margin: 0;
                font-size: 10px;
                background-color: #fff;
                color: #000;
              }
              .section-title {
                page-break-after: avoid;
                margin-top: 15px;
              }
              .info-table tr, .row-fullwidth, .signatures-container {
                page-break-inside: avoid;
              }
              .doc-grid {
                page-break-inside: avoid;
              }
              .doc-card { 
                page-break-inside: avoid; 
              }
            }
          </style>
        </head>
        <body>
          <button class="btn-print" onclick="window.print()">Cetak Slip Dokumen (Ctrl + P)</button>
          
          <div class="header-container">
            <img class="header-logo" src="https://upload.wikimedia.org/wikipedia/commons/9/90/LOGO_KOTA_TANJUNG_BALAI.png" referrerPolicy="no-referrer" onerror="this.style.display='none'" />
            <div class="header-text">
              <h1>PEMERINTAH KOTA TANJUNGBALAI</h1>
              <h2>DINAS SOSIAL KOTA TANJUNGBALAI</h2>
              <h3>SISTEM LAYANAN DAN RUJUKAN TERPADU - SLRT KITO</h3>
              <p>Kawasan Kantor Walikota, Kota Tanjungbalai, Sumatera Utara</p>
            </div>
          </div>
          
          <div class="doc-title">FORMULIR REGISTER & VERIFIKASI PENGADUAN KLIEN</div>
          <div class="doc-metadata">
            ID Dokumen: ${selectedRecord.id} &nbsp;|&nbsp; Penginput: ${selectedRecord.diinputOleh || 'Admin'}
          </div>

          <div class="section-title">I. IDENTITAS UTAMA PENGADU & KLIEN</div>
          <div class="grid-2col">
            <table class="info-table">
              <tr>
                <td class="label">Nama Klien</td>
                <td class="separator">:</td>
                <td class="value"><strong>${selectedRecord.namaKlien}</strong></td>
              </tr>
              <tr>
                <td class="label">No. HP/WA Active</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.noTelpon}</td>
              </tr>
              <tr>
                <td class="label">Penerima Kuasa</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.namaKuasa || '-'}</td>
              </tr>
              <tr>
                <td class="label">Kelengkapan Berkas</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.dokumen}</td>
              </tr>
            </table>

            <table class="info-table">
              <tr>
                <td class="label">Kecamatan / Kel.</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.kecamatan} / ${selectedRecord.kelurahan}</td>
              </tr>
              <tr>
                <td class="label">Pekerjaan Kepala RT</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.pekerjaanKrt || '-'}</td>
              </tr>
              <tr>
                <td class="label">Estimasi Pendapatan</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.pendapatanPerbulan || '-'}</td>
              </tr>
              <tr>
                <td class="label">Status Sosial</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.status}</td>
              </tr>
            </table>
          </div>

          <div class="row-fullwidth">
            <div class="label">Alamat Lengkap</div>
            <div class="value">${selectedRecord.alamatKlien}</div>
          </div>

          <div class="section-title">II. FASILITAS HUNIAN & INTEGRASI BANTUAN</div>
          <div class="grid-2col">
            <table class="info-table">
              <tr>
                <td class="label">Rumah Kepemilikan</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.statusRumah}</td>
              </tr>
              <tr>
                <td class="label">Akses Sanitasi / MCK</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.mck}</td>
              </tr>
            </table>

            <table class="info-table">
              <tr>
                <td class="label">Sumber Penerangan</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.jenisPenerangan}</td>
              </tr>
              <tr>
                <td class="label">Bansos Sedang Aktif</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.bantuanDiterima || 'Belum Terdaftar'}</td>
              </tr>
            </table>
          </div>

          <div class="section-title">III. DETAIL KASUS ADUAN & RUJUKAN</div>
          <div class="grid-2col">
            <table class="info-table">
              <tr>
                <td class="label">Jenis Layanan Tujuan</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.jenisLayanan}</td>
              </tr>
            </table>
            <table class="info-table">
              <tr>
                <td class="label">Fasilitator Terkait</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.namaFasilitator}</td>
              </tr>
            </table>
          </div>
          <div class="row-fullwidth">
            <div class="label">Deskripsi Keluhan</div>
            <div class="value">${selectedRecord.jenisPengaduan}</div>
          </div>

          <div class="section-title">IV. STATUS VERIFIKASI FISIK & LAPANGAN (AUDIT)</div>
          <div class="grid-2col">
            <table class="info-table">
              <tr>
                <td class="label">Status Kunjungan</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.statusKunjungan || 'Belum Dikunjungi'}</td>
              </tr>
            </table>
            <table class="info-table">
              <tr>
                <td class="label">Tanggal Pemeriksaan</td>
                <td class="separator">:</td>
                <td class="value">${selectedRecord.tanggalPemeriksaan || 'Belum Diperiksa'}</td>
              </tr>
            </table>
          </div>
          <div class="row-fullwidth">
            <div class="label">Catatan Pengawas</div>
            <div class="value">${selectedRecord.catatanPemeriksa || 'Belum ada catatan verifikasi fisik lapangan dari petugas terkait.'}</div>
          </div>

          <div class="section-title">V. DOKUMENTASI HASIL VERIFIKASI LAPORAN</div>
          <div class="doc-grid">
            <div class="doc-card">
              <div class="doc-img-container">
                ${(selectedRecord.fotoDepanRumah || selectedRecord.dokumentasiBukti) ? `
                  <img class="doc-img" src="${getSafeBase64Url(selectedRecord.fotoDepanRumah || selectedRecord.dokumentasiBukti)}" />
                ` : `
                  <div class="doc-placeholder">
                    <span class="doc-placeholder-icon">🏠</span>
                    <span>Foto Kondisi Rumah Klien</span>
                    <span style="font-size: 8px; color: #94a3b8; font-weight: normal; margin-top: 4px;">(Belum Diunggah)</span>
                  </div>
                `}
              </div>
              <div class="doc-caption">Foto 1: Kondisi Kelayakan Hunian</div>
              <div class="doc-subcaption">Kondisi fisik luar dan perumahan klien</div>
            </div>

            <div class="doc-card">
              <div class="doc-img-container">
                ${selectedRecord.fotoKkKtp ? `
                  <img class="doc-img" src="${getSafeBase64Url(selectedRecord.fotoKkKtp)}" />
                ` : `
                  <div class="doc-placeholder">
                    <span class="doc-placeholder-icon">📄</span>
                    <span>Foto KK / KTP Klien</span>
                    <span style="font-size: 8px; color: #94a3b8; font-weight: normal; margin-top: 4px;">(Belum Diunggah)</span>
                  </div>
                `}
              </div>
              <div class="doc-caption">Foto 2: Berkas Kependudukan</div>
              <div class="doc-subcaption">Arsip administrasi resmi KK/KTP terverifikasi</div>
            </div>
          </div>

          <div class="signatures-container">
            <div class="sig-box">
              <p>Petugas Fasilitator Pendata,</p>
              <p>Dinas Sosial Tanjungbalai</p>
              <div class="sig-space"></div>
              <div class="sig-name">${selectedRecord.namaFasilitator}</div>
            </div>
            <div class="sig-box">
              <p>Tanjungbalai, ${selectedRecord.hariTanggal.split(',')[1] || '_________________'}</p>
              <p>Klien / Penerima Layanan</p>
              <div class="sig-space"></div>
              <div class="sig-name">${selectedRecord.namaKlien}</div>
            </div>
          </div>
          
          <div class="footer-disclaimer">
            <span>Pernyataan: Dokumen ini divalidasi sah secara elektronik oleh Sistem Layanan dan Rujukan Terpadu SLRT KITO Kota Tanjungbalai.</span>
            <span>SLRT KITO</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Professional PDF Client Detailed Report download via jsPDF
  const handleDownloadPDF = async () => {
    if (!selectedRecord) return;
    const rec = selectedRecord;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Helper to asynchronously convert external emblem to base64
    const loadEmblemBase64 = (): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve('');
          }
        };
        img.onerror = () => {
          resolve('');
        };
        img.src = 'https://upload.wikimedia.org/wikipedia/commons/9/90/LOGO_KOTA_TANJUNG_BALAI.png';
      });
    };

    // Helper to load any internal base64 or external url with timeout and auto-conversion to standard JPEG
    const loadAnyImageBase64 = (srcUrl: string): Promise<string> => {
      return new Promise((resolve) => {
        const normalizedUrl = getSafeBase64Url(srcUrl);
        if (!normalizedUrl) {
          resolve('');
          return;
        }
        
        // If it is already a base64 data url, we resolve immediately for extreme performance and 100% reliability
        if (normalizedUrl.startsWith('data:')) {
          resolve(normalizedUrl);
          return;
        }

        // For non-JPEG base64 and external URLs, we load them into canvas to convert to JPEG format
        const img = new Image();
        if (!normalizedUrl.startsWith('data:')) {
          img.crossOrigin = 'Anonymous';
        }
        
        const timeoutId = setTimeout(() => {
          resolve(normalizedUrl.startsWith('data:') ? normalizedUrl : '');
        }, 2500);

        img.onload = () => {
          clearTimeout(timeoutId);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 645;
            canvas.height = img.height || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              resolve(normalizedUrl.startsWith('data:') ? normalizedUrl : '');
            }
          } catch (e) {
            resolve(normalizedUrl.startsWith('data:') ? normalizedUrl : '');
          }
        };

        img.onerror = () => {
          clearTimeout(timeoutId);
          resolve(normalizedUrl.startsWith('data:') ? normalizedUrl : '');
        };

        img.src = normalizedUrl;
      });
    };

    const logoBase64 = await loadEmblemBase64();

    if (logoBase64) {
      // Set the official emblem image
      doc.addImage(logoBase64, 'PNG', 14, 11, 15, 19);
    } else {
      // High quality fallback vector emblem
      doc.setFillColor(15, 118, 110);
      doc.triangle(15, 15, 29, 15, 22, 28, 'F');
      doc.rect(15, 11, 14, 4, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(255, 255, 255);
      doc.text('PEMKOT', 22, 14, { align: 'center' });
    }

    // Header letterhead setup
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(30, 41, 59);
    doc.text('PEMERINTAH KOTA TANJUNGBALAI', 112, 17, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(15, 118, 110);
    doc.text('DINAS SOSIAL KOTA TANJUNGBALAI', 112, 23, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('SISTEM LAYANAN DAN RUJUKAN TERPADU - SLRT KITO', 112, 29, { align: 'center' });

    // Double divider lines
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.6);
    doc.line(15, 35, 195, 35);
    doc.setLineWidth(0.2);
    doc.line(15, 37, 195, 37);

    // Document Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('FORMULIR REGISTER & VERIFIKASI PENGADUAN KLIEN', 15, 45);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`ID Dokumen: ${rec.id}   |   Penginput: ${rec.diinputOleh || 'Admin'}`, 15, 50);

    let totalPageCount = 1;

    // Helper to start a new page dynamically
    const handleNewPage = (): number => {
      doc.addPage();
      totalPageCount++;
      
      // Draw dynamic top header line on subsequent pages
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Klien: ${rec.namaKlien}   |   ID Dokumen: ${rec.id}`, 15, 14);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(15, 16, 195, 16);
      return 22; // reset content origin on current page
    };

    let currentY = 55;

    // Dynamic space controller
    const ensureSpace = (neededHeight: number): number => {
      // If current cursor + needed height exceeds safety page limit (265mm), move to next A4 page
      if (currentY + neededHeight > 265) {
        currentY = handleNewPage();
      }
      return currentY;
    };

    // Helper functions for sections
    const drawSectionHeader = (title: string) => {
      currentY = ensureSpace(10);
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 180, 6, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 118, 110);
      doc.text(title, 18, currentY + 4.5);
      currentY += 10;
    };

    const drawRow = (label1: string, val1: string, label2?: string, val2?: string) => {
      // Column 1 starts at x=18. Label limited to 32mm. Value limited to 53mm
      // Column 2 starts at x=110. Label limited to 32mm. Value limited to 51mm
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const label1Lines = doc.splitTextToSize(label1, 32);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const val1Lines = doc.splitTextToSize(val1 || '-', 53);
      
      let col1Height = Math.max(label1Lines.length, val1Lines.length) * 4;
      let col2Height = 0;
      
      let label2Lines: string[] = [];
      let val2Lines: string[] = [];
      
      if (label2) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        label2Lines = doc.splitTextToSize(label2, 32);
        
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        val2Lines = doc.splitTextToSize(val2 || '-', 51);
        
        col2Height = Math.max(label2Lines.length, val2Lines.length) * 4;
      }
      
      const rowHeight = Math.max(col1Height, col2Height, 5.5);
      currentY = ensureSpace(rowHeight + 3.5);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label1Lines, 18, currentY);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(':', 50, currentY);
      doc.text(val1Lines, 52, currentY);
      
      if (label2) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(label2Lines, 110, currentY);
        
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(':', 142, currentY);
        doc.text(val2Lines, 144, currentY);
      }
      
      const nextY = currentY + rowHeight;
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.1);
      doc.line(15, nextY, 195, nextY);
      currentY = nextY + 3.5;
    };

    const drawRowFullWidth = (label: string, val: string) => {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const labelLines = doc.splitTextToSize(label, 32);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const wrappedText = doc.splitTextToSize(val || '-', 138);

      const textHeight = wrappedText.length * 4;
      const rowHeight = textHeight + 1;

      currentY = ensureSpace(rowHeight + 3.5);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label, 18, currentY);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(':', 52, currentY);
      doc.text(wrappedText, 54, currentY);
      
      const nextY = currentY + rowHeight;
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.1);
      doc.line(15, nextY, 195, nextY);
      currentY = nextY + 3.5;
    };

    // SECTION I
    drawSectionHeader('I. IDENTITAS UTAMA PENGADU & KLIEN');
    drawRow('Nama Lengkap Klien', rec.namaKlien, 'Kecamatan / Kel.', `${rec.kecamatan} / ${rec.kelurahan}`);
    drawRow('No. HP/WA Active', rec.noTelpon, 'Pekerjaan Kepala RT', rec.pekerjaanKrt);
    drawRow('Penerima Kuasa', rec.namaKuasa, 'Estimasi Pendapatan', rec.pendapatanPerbulan);
    drawRow('Kelengkapan Berkas', rec.dokumen, 'Status Sosial', rec.status);
    drawRowFullWidth('Alamat Lengkap', rec.alamatKlien);

    // SECTION II
    drawSectionHeader('II. FASILITAS HUNIAN & INTEGRASI BANTUAN');
    drawRow('Rumah Kepemilikan', rec.statusRumah, 'Sumber Penerangan', rec.jenisPenerangan);
    drawRow('Akses Sanitasi / MCK', rec.mck, 'Bansos Sedang Aktif', rec.bantuanDiterima || 'Belum Terdaftar');

    // SECTION III
    drawSectionHeader('III. DETAIL KASUS ADUAN & RUJUKAN');
    drawRow('Jenis Layanan Tujuan', rec.jenisLayanan, 'Fasilitator Terkait', rec.namaFasilitator);
    drawRowFullWidth('Deskripsi Keluhan', rec.jenisPengaduan);

    // SECTION IV
    drawSectionHeader('IV. STATUS VERIFIKASI FISIK & LAPANGAN (AUDIT)');
    drawRow('Status Kunjungan', rec.statusKunjungan || 'Belum Dikunjungi', 'Tanggal Pemeriksaan', rec.tanggalPemeriksaan || 'Belum Diperiksa');
    drawRowFullWidth('Catatan Pengawas', rec.catatanPemeriksa || 'Belum ada catatan verifikasi fisik lapangan dari petugas terkait.');

    // SECTION V
    // Calculate total height needed for Section V
    // 10mm (header) + 3mm (gap) + 40mm (boxes) + 4mm (caption margin) + 7mm (caption texts) = 64mm
    const sectionVHeight = 64;
    currentY = ensureSpace(sectionVHeight);

    drawSectionHeader('V. DOKUMENTASI HASIL VERIFIKASI LAPORAN');
    
    const boxWidth = 54;
    const boxHeight = 40;
    const boxY = currentY + 3;
    
    // Column 1 Box
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.setFillColor(248, 250, 252);
    doc.rect(15, boxY, boxWidth, boxHeight, 'FD');
    
    // Column 2 Box
    doc.rect(78, boxY, boxWidth, boxHeight, 'FD');

    // Column 3 Box
    doc.rect(141, boxY, boxWidth, boxHeight, 'FD');

    // Helper to draw geometric placeholder graphics with camera icon
    const drawPhotoPlaceholder = (x: number, y: number, w: number, h: number, title: string) => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.rect(x + 2, y + 2, w - 4, h - 4); // Inner border
      
      const cx = x + (w / 2);
      const cy = y + (h / 2) - 3;
      doc.setFillColor(241, 245, 249);
      doc.rect(cx - 5, cy - 3, 10, 6, 'F');
      
      // Draw camera lens circle
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.4);
      doc.circle(cx, cy, 1.8);
      
      // Flash bar
      doc.setFillColor(148, 163, 184);
      doc.rect(cx - 2.5, cy - 4.5, 5, 1, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(title, cx, cy + 7, { align: 'center' });
      
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(5.5);
      doc.text('Bukti Lapangan (GPS)', cx, cy + 10.5, { align: 'center' });
    };

    // Load actual photographs with crossOrigin safety
    const img1Base64 = await loadAnyImageBase64(rec.fotoDepanRumah || rec.foto_hunian_url || '');
    const img2Base64 = await loadAnyImageBase64(rec.fotoKkKtp || rec.foto_ktp_url || '');
    const img3Base64 = await loadAnyImageBase64(rec.dokumentasiBukti || '');

    // Function to parse dynamic image format from mime types with robust fallback
    const detectFormat = (base64Str: string): string => {
      const lower = base64Str.toLowerCase();
      if (lower.includes('data:image/png') || lower.includes('png')) return 'PNG';
      if (lower.includes('data:image/webp') || lower.includes('webp')) return 'WEBP';
      if (lower.includes('data:image/gif') || lower.includes('gif')) return 'GIF';
      return 'JPEG';
    };

    if (img1Base64) {
      try {
        const fmt1 = detectFormat(img1Base64);
        doc.addImage(img1Base64, fmt1, 15.5, boxY + 0.5, boxWidth - 1, boxHeight - 1);
      } catch (err) {
        drawPhotoPlaceholder(15, boxY, boxWidth, boxHeight, 'FOTO DEPAN RUMAH');
      }
    } else {
      drawPhotoPlaceholder(15, boxY, boxWidth, boxHeight, 'FOTO DEPAN RUMAH');
    }

    if (img2Base64) {
      try {
        const fmt2 = detectFormat(img2Base64);
        doc.addImage(img2Base64, fmt2, 78.5, boxY + 0.5, boxWidth - 1, boxHeight - 1);
      } catch (err) {
        drawPhotoPlaceholder(78, boxY, boxWidth, boxHeight, 'FOTO KK / KTP');
      }
    } else {
      drawPhotoPlaceholder(78, boxY, boxWidth, boxHeight, 'FOTO KK / KTP');
    }

    if (img3Base64) {
      try {
        const fmt3 = detectFormat(img3Base64);
        doc.addImage(img3Base64, fmt3, 141.5, boxY + 0.5, boxWidth - 1, boxHeight - 1);
      } catch (err) {
        drawPhotoPlaceholder(141, boxY, boxWidth, boxHeight, 'FOTO KONTROL KUNJUNGAN');
      }
    } else {
      drawPhotoPlaceholder(141, boxY, boxWidth, boxHeight, 'FOTO KONTROL KUNJUNGAN');
    }

    // Captions below photos
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Foto 1: Kelayakan Hunian', 15, boxY + boxHeight + 4);
    doc.text('Foto 2: Berkas Kependudukan', 78, boxY + boxHeight + 4);
    doc.text('Foto 3: Kontrol Kunjungan', 141, boxY + boxHeight + 4);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Kondisi fisik tempat tinggal.', 15, boxY + boxHeight + 7);
    doc.text('Arsip data kependudukan.', 78, boxY + boxHeight + 7);
    doc.text('Dokumentasi kontrol petugas.', 141, boxY + boxHeight + 7);

    currentY = boxY + boxHeight + 11;

    // Put signatures in a safe place
    currentY = ensureSpace(30);
    const sigY = currentY + 4;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    doc.text('Petugas Fasilitator Pendata,', 25, sigY);
    doc.text('Dinas Sosial Tanjungbalai', 25, sigY + 4);
    doc.setFont('Helvetica', 'normal');
    doc.text('_____________________________', 25, sigY + 20);
    doc.setFont('Helvetica', 'bold');
    doc.text(`( ${rec.namaFasilitator} )`, 25, sigY + 24);

    // DRAW FOOTERS DYNAMICALLY ON EVERY PAGE
    const drawPageFooter = (pageNum: number, totalPages: number) => {
      doc.setPage(pageNum);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(15, 280, 195, 280);

      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Pernyataan: Dokumen ini divalidasi sah secara elektronik oleh Sistem Layanan dan Rujukan Terpadu SLRT KITO Kota Tanjungbalai.', 15, 284);
      doc.text(`Halaman ${pageNum} dari ${totalPages}`, 195, 284, { align: 'right' });
    };

    for (let i = 1; i <= totalPageCount; i++) {
      drawPageFooter(i, totalPageCount);
    }

    // Download PDF triggers
    doc.save(`SLRT_KITO_Layanan_${rec.namaKlien.replace(/\s+/g, '_')}_${rec.id}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none antialiased">
      
      {/* 1. HEADER RE-DESIGNED TO BENTO SPEC */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 shadow-xs z-10 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm shadow-indigo-150 select-none">
            S
          </div>
          <div>
            <h1 className="text-base font-extrabold leading-none text-slate-900 tracking-tight font-display">SLRT KITO</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Sistem Layanan Rujukan Terpadu</p>
          </div>
          
          {/* Cloud Database Synchronization Indicator */}
          <div className="ml-4 pl-4 border-l border-slate-200 hidden md:flex items-center gap-2">
            <button
              onClick={() => refreshFromCloud(true)}
              disabled={cloudLoading}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                cloudLoading 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed scale-98 animate-pulse'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 active:scale-95 cursor-pointer'
              }`}
              title="Klik untuk mensinkronisasi data langsung dengan Google Sheets secara real-time"
            >
              <span className={`w-2 h-2 rounded-full ${cloudLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
              {cloudLoading ? 'Menyinkronkan...' : 'Database Terhubung'}
            </button>

            <button
              onClick={handleForceSynchronizeFromCloud}
              disabled={cloudLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100/80 active:scale-95 cursor-pointer transition-all border border-rose-150"
              title="Klik untuk membersihkan memory cache lokal browser ini dan menarik paksa seluruh data murni langsung dari Google Sheets (Gunakan jika data di PC ini berbeda / tidak sinkron dengan PC lain)"
            >
              🧹 Bersihkan Cache &amp; Tarik Cloud
            </button>

            {lastCloudSync && (
              <span className="text-[10px] text-slate-400 font-mono">
                Aktif: {lastCloudSync}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            {userRole === 'admin' && (
              <>
                <p className="text-xs font-bold text-indigo-700 leading-none">Kito Database Admin</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">Dashboard Kependudukan Dinsos</p>
              </>
            )}
            {userRole === 'facilitator' && (
              <>
                <p className="text-xs font-bold text-emerald-700 leading-none">Petugas Fasilitator Lapangan</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">Verifikator Kualifikasi Lansung</p>
              </>
            )}
            {userRole === 'warga' && (
              <>
                <p className="text-xs font-bold text-amber-700 leading-none">Portal Warga Kota Tanjungbalai</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">Pengaduan Mandiri Klien</p>
              </>
            )}
          </div>
          
          <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold text-xs border shadow-sm ${
            userRole === 'admin' ? 'bg-gradient-to-tr from-indigo-500 to-indigo-600 border-indigo-300 shadow-indigo-100' :
            userRole === 'facilitator' ? 'bg-gradient-to-tr from-emerald-500 to-emerald-600 border-emerald-300 shadow-emerald-100' :
            'bg-gradient-to-tr from-amber-500 to-amber-600 border-amber-300 shadow-amber-100'
          }`}>
            {userRole === 'admin' ? 'AD' : userRole === 'facilitator' ? 'FL' : 'WR'}
          </div>

          {((userRole === 'admin' && session?.role === 'admin') || 
            (userRole === 'facilitator' && session?.role === 'facilitator')) && (
            <button
              type="button"
              onClick={() => {
                setSession(null);
                setAuthEmail('');
                setAuthPassword('');
                setAuthUsername('');
                setActiveTab('all-records');
              }}
              className="px-3 py-1.5 border border-rose-200 bg-rose-50/50 hover:bg-rose-55 text-rose-700 text-xs font-black rounded-lg cursor-pointer transition-colors"
              title="Keluar Sesi Aman"
            >
              Keluar
            </button>
          )}
        </div>
      </header>

      {/* PERSPECTIVE ROLE SWITCHER TOOLBAR */}
      <section className="bg-slate-900 text-white px-6 md:px-8 py-3 flex flex-col lg:flex-row items-center justify-between gap-4 border-b border-indigo-950 font-sans shadow-inner shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${
            userRole === 'admin' ? 'bg-indigo-500/10 text-indigo-450' :
            userRole === 'facilitator' ? 'bg-emerald-500/10 text-emerald-450' :
            'bg-amber-500/10 text-amber-450'
          }`}>
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-black tracking-wide uppercase text-slate-350 flex items-center gap-1.5">
              <span>ALUR INTEGRASI 3 PIHAK:</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                userRole === 'admin' ? 'bg-indigo-600 text-white' :
                userRole === 'facilitator' ? 'bg-emerald-600 text-white' :
                'bg-amber-650 text-white'
              }`}>
                Mode: {userRole === 'admin' ? 'Database Admin' : userRole === 'facilitator' ? 'Fasilitator' : 'Warga Mandiri'}
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
              Alihkan status peran Anda untuk menguji integrasi end-to-end (Admin Input Baru → Fasilitator Mengaudit &amp; Unggah Bukti → Warga Melacak Status).
            </p>
          </div>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 max-w-full overflow-x-auto shrink-0 select-none">
          <button 
            type="button"
            onClick={() => {
              setUserRole('admin');
              setActiveTab('all-records');
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              userRole === 'admin' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-805/50 font-black' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>💻</span>
            <span>Admin Database</span>
          </button>
          
          <button 
            type="button"
            onClick={() => {
              setUserRole('facilitator');
              setActiveTab('all-records');
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              userRole === 'facilitator' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-805/50 font-black' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>👥</span>
            <span>Fasilitator</span>
          </button>
          
          <button 
            type="button"
            onClick={() => {
              setUserRole('warga');
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              userRole === 'warga' 
                ? 'bg-amber-600 text-white shadow-md shadow-amber-805/50 font-black' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🏡</span>
            <span>Portal Warga</span>
          </button>
        </div>
      </section>

      {/* QUICK STATUS BAR METRICS */}
      <section className="bg-slate-100/50 border-b border-slate-200/80 shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Database SLRT: <b>{records.length} Klien</b></span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">Diverifikasi: {records.filter(r => r.statusKunjungan === 'Sudah Dikunjungi').length} Klien</span>
            <span>•</span>
            <span className="text-amber-750 font-bold">Menunggu Kunjungan: {records.filter(r => r.statusKunjungan !== 'Sudah Dikunjungi').length} Klien</span>
            <span>•</span>
            <span className="text-indigo-700 font-bold">Fasilitator Dinsos: {Array.from(new Set(records.map(r => r.namaFasilitator))).length} Petugas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[10px] uppercase font-semibold">Sistem Terintegrasi KITO</span>
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      {userRole === 'warga' ? (
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-y-auto font-sans flex flex-col gap-6">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-6 md:p-8 rounded-3xl shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md border border-amber-500/30">
            <div className="max-w-2xl font-sans">
              <span className="bg-amber-500/20 border border-amber-400/30 text-amber-100 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                Portal Pengaduan Mandiri &amp; Lacak Status
              </span>
              <h2 className="text-xl md:text-2xl font-black mt-3 tracking-tight font-display text-white">Hubungan Langsung Warga &amp; Dinsos Tanjungbalai</h2>
              <p className="text-xs text-amber-100 mt-2 leading-relaxed">
                Melalui program <b>SLRT KITO</b>, masyarakat Tanjungbalai kini dapat mendaftarkan keluhan rujukan jaminan sosial rumahtangga secara mandiri, kemudian memantau proses verifikasi kunjungan lapangan (visitation) oleh fasilitator daerah secara instan dan terbuka.
              </p>
            </div>
            <div className="flex flex-col gap-2 bg-amber-900/40 p-4 rounded-2xl border border-amber-500/20 shrink-0 self-stretch md:self-auto text-center md:text-left justify-center select-text font-mono">
              <div className="text-xl font-bold">👥 {records.filter(r => r.statusKunjungan === 'Sudah Dikunjungi').length} / {records.length}</div>
              <div className="text-[10px] text-amber-200 uppercase tracking-wider font-extrabold">Kunjungan Terverifikasi</div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 select-text">
            
            {/* PORTAL WARGA LEFT: FORM INPUT */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-amber-600">✍️</span> FORMULIR ADUAN MANDIRI WARGA
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal font-sans">
                    Pengajuan secara mandiri untuk diusulkan ke dalam DTKS jika rumahtangga Anda belum menerima bantuan sosial PKH/BPNT/KIS.
                  </p>
                </div>

                {wargaFormSuccess && (
                  <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs p-4 rounded-2xl animate-fadeIn flex flex-col gap-2">
                    <p className="font-extrabold flex items-center gap-1.5 text-emerald-900">
                      <span className="text-base">✅</span> PENDAFTARAN BERHASIL!
                    </p>
                    <p className="leading-relaxed text-[11px] text-emerald-850 font-medium">
                      {wargaFormSuccess}
                    </p>
                    <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mt-1 font-mono">
                      Petugas Dinsos ditunjuk akan berkunjung ke kediaman Anda.
                    </p>
                  </div>
                )}

                <form onSubmit={handleWargaSubmitReport} className="flex flex-col gap-5 text-xs">
                  {/* SECTION A - IDENTITAS */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col gap-4">
                    <h4 className="text-[11px] font-black text-amber-700 uppercase tracking-widest pb-1 border-b border-rose-200/50">
                      A. Profil Identitas Kepala Keluarga &amp; Klien
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">1. Nama Klien Utama *</label>
                        <input
                          type="text"
                          required
                          placeholder="Nama lengkap pemohon/klien..."
                          value={wargaAddNama}
                          onChange={(e) => setWargaAddNama(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 font-sans"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">2. No. Telpon / HP Aktif *</label>
                        <input
                          type="tel"
                          required
                          placeholder="Contoh: 08123456789 (Tanpa spasi)"
                          value={wargaAddPhone}
                          onChange={(e) => setWargaAddPhone(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">3. Kecamatan Klien *</label>
                        <select
                          value={wargaAddKecamatan}
                          onChange={(e) => {
                            setWargaAddKecamatan(e.target.value);
                            setWargaAddKelurahan(TANJUNGBALAI_LOCATIONS[e.target.value as keyof typeof TANJUNGBALAI_LOCATIONS][0]);
                          }}
                          className="w-full bg-white border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-850 focus:outline-none focus:border-amber-600 font-sans font-bold cursor-pointer"
                        >
                          {Object.keys(TANJUNGBALAI_LOCATIONS).map(kel => (
                            <option key={kel} value={kel}>{kel}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">4. Kelurahan Klien *</label>
                        <select
                          value={wargaAddKelurahan}
                          onChange={(e) => setWargaAddKelurahan(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-850 focus:outline-none focus:border-amber-600 font-sans font-bold cursor-pointer"
                        >
                          {TANJUNGBALAI_LOCATIONS[wargaAddKecamatan as keyof typeof TANJUNGBALAI_LOCATIONS]?.map(kel => (
                            <option key={kel} value={kel}>{kel}</option>
                          )) || <option value="">Pilih Kelurahan</option>}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative">
                        <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">5. NIK Klien (16 Digit) *</label>
                        <input
                          type="text"
                          maxLength={16}
                          placeholder="Masukkan 16 digit NIK..."
                          value={wargaAddNik}
                          onChange={(e) => setWargaAddNik(e.target.value.replace(/\D/g, ''))}
                          onFocus={() => setIsWargaNikFocused(true)}
                          onBlur={() => setIsWargaNikFocused(false)}
                          className={`w-full bg-white text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none font-mono tracking-widest border transition-all duration-200 ${
                            wargaAddNik.trim().length > 0 && wargaAddNik.trim().length < 16
                              ? 'border-amber-400 focus:ring-1 focus:ring-amber-400 bg-amber-50/10'
                              : wargaAddNik.trim().length === 16 && records.some(r => r.nik === wargaAddNik.trim())
                              ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/25'
                              : wargaAddNik.trim().length === 16
                              ? 'border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-emerald-50/10'
                              : 'border-slate-200 focus:border-amber-600'
                          }`}
                          required
                        />
                        <NikValidationOverlay
                          nik={wargaAddNik}
                          type="client"
                          records={records}
                          isVisible={isWargaNikFocused || wargaAddNik.trim().length > 0}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">6. Pekerjaan Pokok KRT</label>
                        <input
                          type="text"
                          placeholder="Contoh: Nelayan, Serabutan, IRT..."
                          value={wargaAddPekerjaan}
                          onChange={(e) => setWargaAddPekerjaan(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 font-sans"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-505 block mb-1 uppercase tracking-wider">7. Nama Kuasa (Jika Numpang/Kuasa)</label>
                        <input
                          type="text"
                          value={wargaAddNamaKuasa}
                          onChange={(e) => setWargaAddNamaKuasa(e.target.value)}
                          className="w-full bg-white border border-slate-202 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">8. Alamat Klien Lengkap</label>
                        <textarea
                          rows={2}
                          placeholder="Sertakan nama jalan, gang, nomor rumah, dan nomor lingkungan..."
                          value={wargaAddAlamat}
                          onChange={(e) => setWargaAddAlamat(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 resize-none font-sans leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-505 block mb-1 uppercase tracking-wider">9. Dokumen Yang Dibawa Klien</label>
                        <input
                          type="text"
                          placeholder="Contoh: KK, KTP, Surat SKTM..."
                          value={wargaAddDokumen}
                          onChange={(e) => setWargaAddDokumen(e.target.value)}
                          className="w-full bg-white border border-slate-202 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION B - SOSIAL EKONOMI */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col gap-4">
                    <h4 className="text-[11px] font-black text-amber-700 uppercase tracking-widest pb-1 border-b border-rose-200/50">
                      B. Indikator Sosial Ekonomi &amp; Kelayakan Hunian
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-505 block mb-1 uppercase tracking-wider">10. Status Kesejahteraan Klien</label>
                        <select
                          value={wargaAddStatus}
                          onChange={(e) => setWargaAddStatus(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-none focus:border-amber-600 text-slate-800"
                        >
                          <option value="Sangat Miskin">Sangat Miskin</option>
                          <option value="Miskin">Miskin</option>
                          <option value="Rentan">Rentan</option>
                          <option value="Hampir Sejahtera">Hampir Sejahtera</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">12. Status Kepemilikan Rumah</label>
                        <select
                          value={wargaAddStatusRumah}
                          onChange={(e) => setWargaAddStatusRumah(e.target.value)}
                          className="w-full bg-white border border-slate-205 text-xs px-3 py-2.5 rounded-xl outline-none focus:border-amber-600 text-slate-805 font-medium"
                        >
                          <option value="Milik Sendiri">Milik Sendiri</option>
                          <option value="Sewa">Sewa / Kontrak</option>
                          <option value="Menumpang">Menumpang (Keluarga)</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">13. Jenis Penerangan Utama</label>
                        <select
                          value={wargaAddJenisPenerangan}
                          onChange={(e) => setWargaAddJenisPenerangan(e.target.value)}
                          className="w-full bg-white border border-slate-205 text-xs px-3 py-2.5 rounded-xl outline-none focus:border-amber-600 text-slate-805 font-medium"
                        >
                          <option value="PLN Bersubsidi 450W">PLN Bersubsidi (450W / 900W)</option>
                          <option value="PLN Non-Subsidi">PLN Non-Subsidi (&gt;= 1300W)</option>
                          <option value="Listrik Numpang Tetangga">Listrik Numpang Tetangga</option>
                          <option value="Tanpa Listrik">Tanpa Listrik</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">14. Kondisi Fasilitas MCK</label>
                        <select
                          value={wargaAddMck}
                          onChange={(e) => setWargaAddMck(e.target.value)}
                          className="w-full bg-white border border-slate-205 text-xs px-3 py-2.5 rounded-xl outline-none focus:border-amber-600 text-slate-805 font-medium"
                        >
                          <option value="Sendiri Layak">Sendiri Layak</option>
                          <option value="Sendiri Kurang Layak">Sendiri Kurang Layak</option>
                          <option value="MCK Umum / Bersama">MCK Umum / Bersama</option>
                          <option value="Tidak Layak / Tidak Ada Toilet">Tidak Layak / Tidak Ada Toilet</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">15. Est. Pendapatan KRT Perbulan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Rp 600.000"
                          value={wargaAddPendapatanPerbulan}
                          onChange={(e) => setWargaAddPendapatanPerbulan(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-none focus:border-amber-600 text-slate-800"
                        />
                      </div>

                      {/* MULTI-SELECT CHECKBOXES FOR BANTUAN YANG SUDAH DIPEROLEH */}
                      <div className="col-span-1 sm:col-span-2 md:col-span-3">
                        <label className="text-[10px] font-black text-slate-550 block mb-1.5 uppercase tracking-wider">11. Program Bantuan Sosial yang Pernah Diterima (Pilih Semua yang Sesuai)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                          {KRITERIA_BANTUAN_SOSIAL.map((bantuan) => {
                            const isChecked = wargaAddBantuanDiterimaList.includes(bantuan);
                            return (
                              <label key={bantuan} className="flex items-start gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-950 transition-colors py-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setWargaAddBantuanDiterimaList([...wargaAddBantuanDiterimaList, bantuan]);
                                    } else {
                                      setWargaAddBantuanDiterimaList(wargaAddBantuanDiterimaList.filter(b => b !== bantuan));
                                    }
                                  }}
                                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 shrink-0 transition-all cursor-pointer"
                                />
                                <span>{bantuan}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* MULTI-SELECT CHECKBOXES FOR INDIKATOR SOSIAL EKONOMI */}
                      <div className="col-span-1 sm:col-span-2 md:col-span-3">
                        <label className="text-[10px] font-black text-slate-550 block mb-1.5 uppercase tracking-wider">16. Indikator Kerentanan Sosial Ekonomi (Pilih Semua yang Sesuai)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200 max-h-52 overflow-y-auto">
                          {KRITERIA_SOSIAL_EKONOMI.map((kriteria) => {
                            const isChecked = wargaAddIndikatorSosialEkonomi.includes(kriteria);
                            return (
                              <label key={kriteria} className="flex items-start gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-950 transition-colors py-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setWargaAddIndikatorSosialEkonomi([...wargaAddIndikatorSosialEkonomi, kriteria]);
                                    } else {
                                      setWargaAddIndikatorSosialEkonomi(wargaAddIndikatorSosialEkonomi.filter(k => k !== kriteria));
                                    }
                                  }}
                                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 shrink-0 transition-all cursor-pointer"
                                />
                                <span>{kriteria}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* MULTI-SELECT CHECKBOXES FOR KELAYAKAN HUNI */}
                      <div className="col-span-1 sm:col-span-2 md:col-span-3">
                        <label className="text-[10px] font-black text-slate-550 block mb-1.5 uppercase tracking-wider">17. Kondisi Fisik Hunian / Kelayakan Rumah (Pilih Semua yang Sesuai)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200 max-h-52 overflow-y-auto">
                          {KRITERIA_KELAYAKAN_HUNI.map((kriteria) => {
                            const isChecked = wargaAddKelayakanHuni.includes(kriteria);
                            return (
                              <label key={kriteria} className="flex items-start gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-950 transition-colors py-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setWargaAddKelayakanHuni([...wargaAddKelayakanHuni, kriteria]);
                                    } else {
                                      setWargaAddKelayakanHuni(wargaAddKelayakanHuni.filter(k => k !== kriteria));
                                    }
                                  }}
                                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 shrink-0 transition-all cursor-pointer"
                                />
                                <span>{kriteria}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* SECTION C - ADUAN */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col gap-4">
                    <h4 className="text-[11px] font-black text-amber-700 uppercase tracking-widest pb-1 border-b border-rose-200/50">
                      C. Substansi Penyaluran Pengaduan
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">18. Rincian Pengaduan / Keluhan Klien *</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Jelaskan kondisi ekonomi rumahtangga dan bantuan apa saja yang ingin diajukan (misal: PKH, Bedah Rumah, dll)..."
                          value={wargaAddPengaduan}
                          onChange={(e) => setWargaAddPengaduan(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 resize-none leading-relaxed font-sans"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">19. Jenis Layanan Yang Diinginkan / Diusulkan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Reaktivasi KIS PBI, Bedah Rumah RTLH, Beasiswa PIP..."
                          value={wargaAddJenisLayanan}
                          onChange={(e) => setWargaAddJenisLayanan(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-none focus:border-amber-600 text-slate-805 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md cursor-pointer transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 border border-amber-650"
                  >
                    <span>🚀</span> Kirim Laporan Aduan Mandiri
                  </button>
                </form>
              </div>
            </div>

            {/* PORTAL WARGA RIGHT: TRACK STATUS */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-indigo-600">🔍</span> TRACKER LAYANAN SLRT KITO
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal font-sans">
                    Ketiklah Nama, NIK, atau No. Handphone/WhatsApp pendaftar yang didaftarkan untuk melacak status kunjungan (survei langsung) fasilitator SLRT.
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Masukkan nama atau nomor HP/WA untuk mencari..."
                    value={wargaSearchQuery}
                    onChange={(e) => setWargaSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs py-3 pl-10 pr-4 rounded-xl placeholder-slate-450 focus:outline-none focus:border-indigo-600 font-bold text-slate-800 font-sans"
                  />
                  {wargaSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setWargaSearchQuery('')}
                      className="absolute right-3.5 top-2.5 text-[10px] bg-slate-250 hover:bg-slate-350 text-slate-600 px-2 py-1 rounded-md font-mono"
                    >
                      Batal
                    </button>
                  )}
                </div>

                {/* TRACKER LOGIC SEARCH RESULTS AND TIMELINE */}
                {(() => {
                  const cleanedQuery = wargaSearchQuery.trim().toLowerCase();
                  if (!cleanedQuery) {
                    return (
                      <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center text-slate-450 flex flex-col items-center justify-center gap-2.5 font-sans">
                        <Building2 className="w-10 h-10 text-slate-300" />
                        <h4 className="text-xs font-bold text-slate-705">Menunggu Input Kata Kunci</h4>
                        <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                          Gunakan kolom pencarian di atas untuk memasukkan identitas pendaftar rujukan.
                        </p>
                        <div className="bg-white p-3 rounded-xl border border-slate-150 text-[10px] mt-1.5 self-stretch">
                          <p className="text-slate-500 font-bold text-center">Contoh Data Berjalan (Klik untuk Melacak Langsung):</p>
                          <div className="flex gap-2 justify-center mt-2.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setWargaSearchQuery('Sahrial')}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition-colors"
                            >
                              🔎 Sahrial (Belum Dikunjungi)
                            </button>
                            <button
                              type="button"
                              onClick={() => setWargaSearchQuery('Siti Nur')}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition-colors"
                            >
                              🔎 Siti Nur (Sudah Dikunjungi)
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Find matching records
                  const matches = records.filter(rec => 
                    rec.namaKlien.toLowerCase().includes(cleanedQuery) ||
                    (rec.noTelpon && rec.noTelpon.includes(cleanedQuery)) ||
                    (rec.alamatKlien && rec.alamatKlien.toLowerCase().includes(cleanedQuery)) ||
                    (rec.dokumen && rec.dokumen.toLowerCase().includes(cleanedQuery)) ||
                    rec.id.toLowerCase().includes(cleanedQuery)
                  );

                  if (matches.length === 0) {
                    return (
                      <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl text-center text-rose-800 flex flex-col items-center justify-center gap-1.5 animate-fadeIn font-sans">
                        <span className="text-2xl">⚠️</span>
                        <h4 className="text-xs font-bold text-rose-900">Data Tidak Ditemukan!</h4>
                        <p className="text-[11px] text-rose-600 max-w-sm leading-normal">
                          Harap pastikan ejaan Nama atau nomor HP/WA yang ditulis sudah sesuai. Jika Anda baru saja mendaftar, silakan hubungi fungsional kota.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-6 animate-fadeIn font-sans">
                      
                      {/* List of matched items if more than one */}
                      {matches.length > 1 && (
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 flex flex-col gap-1.5">
                          <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest pl-1">Ditemukan {matches.length} Klien Terkait:</span>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {matches.map(m => (
                              <button
                                type="button"
                                key={m.id}
                                onClick={() => setWargaSearchQuery(m.namaKlien)}
                                className="bg-white border border-slate-200 hover:border-indigo-600 p-2.5 rounded-xl text-left shadow-2xs cursor-pointer min-w-44 select-none shrink-0 transition-all"
                              >
                                <p className="text-xs font-black text-slate-800 truncate leading-none">{m.namaKlien}</p>
                                <p className="text-[9px] text-slate-500 mt-1">Kel. {m.kelurahan}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Display the detailed tracker timeline for the first match */}
                      {(() => {
                        const rec = matches[0];
                        const isVisited = rec.statusKunjungan === 'Sudah Dikunjungi';
                        
                        return (
                          <div className="bg-slate-50 rounded-2xl border border-slate-180 p-4 md:p-5 flex flex-col gap-5">
                            
                            {/* Summary Dossier */}
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between flex-wrap gap-3 shadow-xs">
                              <div>
                                <p className="text-[10px] text-indigo-600 font-extrabold uppercase leading-none tracking-wider">IDENTITAS KLIEN KEPEMILIHAN</p>
                                <h4 className="text-sm font-black text-slate-900 mt-1.5">{rec.namaKlien}</h4>
                                <p className="text-[11px] text-slate-550 mt-1">Alamat: {rec.alamatKlien}</p>
                              </div>
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border ${
                                rec.statusKunjungan === 'Sudah Dikunjungi' 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-250' 
                                  : 'bg-amber-100 text-amber-850 border-amber-250 animate-pulse'
                              }`}>
                                {rec.statusKunjungan === 'Sudah Dikunjungi' ? 'Selesai Diaudit ✓' : 'Mengantre Survei'}
                              </span>
                            </div>

                            {/* TIMELINE TRACKING */}
                            <div className="relative pl-7 border-l-2 border-slate-200 flex flex-col gap-8 py-2">
                              
                               {/* STEP 1: REGISTERED */}
                              <div className="relative">
                                <div className="absolute -left-[37px] top-0.5 w-4.5 h-4.5 rounded-full bg-slate-900 border-4 border-white flex items-center justify-center shadow-xs"></div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h5 className="text-xs font-black text-slate-850 uppercase tracking-wide">1. Perekaman Database SLRT</h5>
                                    <span className="bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 rounded">Sukses Database</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                                    Pendaftaran data pengaduan rujukan rumahtangga terekam secara aman pada sistem SLRT KITO Kota Tanjungbalai.
                                  </p>
                                  <div className="mt-2 bg-white p-2 rounded-xl border border-slate-200 inline-block font-mono text-[9px] text-slate-650">
                                    Tanggal Masuk: <b>{rec.hariTanggal}</b> • Diinput oleh: <b>{rec.diinputOleh || 'Admin'}</b>
                                  </div>
                                </div>
                              </div>

                              {/* STEP 2: ASSIGNED FASILITATOR */}
                              <div className="relative">
                                <div className="absolute -left-[37px] top-0.5 w-4.5 h-4.5 rounded-full bg-indigo-600 border-4 border-white flex items-center justify-center shadow-xs"></div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h5 className="text-xs font-black text-slate-850 uppercase tracking-wide">2. Penunjukan Petugas Lapangan</h5>
                                    <span className="bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 rounded">Petugas Siap</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                                    Dinas Sosial menugaskan fasilitator pendamping wilayah untuk melakukan survei visitasi instrumen 18 kriteria kelayakan ke rumah.
                                  </p>
                                  <div className="mt-2">
                                    <div className="bg-white p-2 rounded-xl border border-slate-200 inline-flex items-center gap-2 text-[10px] text-slate-700 font-bold">
                                      <span>Petugas Lapangan Wilayah Anda:</span>
                                      <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 py-0.5 px-2 rounded-md font-extrabold">
                                        👤 {rec.namaFasilitator}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* STEP 3: INSPECTION AND VERIFICATION */}
                              <div className="relative">
                                <div className={`absolute -left-[37px] top-0.5 w-4.5 h-4.5 rounded-full border-4 border-white flex items-center justify-center shadow-xs ${
                                  isVisited ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
                                }`}></div>
                                
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h5 className="text-xs font-black text-slate-850 uppercase tracking-wide">3. Kunjungan Lapangan &amp; Verifikasi</h5>
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                      isVisited ? 'bg-emerald-500 text-white font-mono' : 'bg-amber-500 text-white font-mono'
                                    }`}>
                                      {isVisited ? 'Sudah Dikunjungi (Verified)' : 'Dalam Antrean Survei'}
                                    </span>
                                  </div>

                                  {!isVisited ? (
                                    <div className="mt-2.5 bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl">
                                      <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
                                        🕒 Fasilitator SLRT <b>{rec.namaFasilitator}</b> segera berkunjung ke domisili rumahtangga Anda untuk verifikasi 18 indikator kelayakan.
                                      </p>
                                      <p className="text-[10px] text-slate-450 mt-1.5 leading-relaxed">
                                        Mohon siapkan dokumen fotokopi <b>Kartu Keluarga (KK)</b>, <b>KTP</b>, atau <b>rekening listrik</b> Anda saat petugas berkunjung untuk mempercepat rujukan.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="mt-3 bg-white p-4 rounded-xl border border-emerald-200 flex flex-col gap-3 shadow-2xs">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-slate-150 pb-2">
                                        <div>
                                          <p className="text-[9px] text-slate-400 font-bold uppercase">TANGGAL VERIFIKASI SELESAI</p>
                                          <p className="text-xs font-bold text-slate-800 mt-0.5">🗓️ {rec.tanggalPemeriksaan}</p>
                                        </div>
                                        <div>
                                          <p className="text-[9px] text-slate-400 font-bold uppercase">REKOMENDASI AUDIT SEJAHTERA</p>
                                          <p className="text-xs font-bold text-emerald-700 mt-0.5">🏆 {rec.status} (Memenuhi Syarat)</p>
                                        </div>
                                      </div>

                                      {rec.catatanPemeriksa && (
                                        <div>
                                          <p className="text-[9px] text-slate-400 font-bold uppercase">CATATAN KHUSUS FASILITATOR</p>
                                          <p className="text-[11px] italic text-slate-650 mt-1 leading-relaxed">
                                            "{rec.catatanPemeriksa}"
                                          </p>
                                        </div>
                                      )}

                                      {rec.dokumentasiBukti && (
                                        <div>
                                          <p className="text-[9px] text-slate-400 font-bold uppercase mb-1.5 font-mono">DOKUMENTASI FOTO SURVEI (UNGGAHAN FASILITATOR)</p>
                                          <div className="relative max-w-sm rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                            <img
                                              src={rec.dokumentasiBukti}
                                              referrerPolicy="no-referrer"
                                              alt="Dokumentasi Kunjungan"
                                              className="w-full h-32 object-cover"
                                            />
                                            <div className="absolute bottom-2 left-2 bg-slate-900/80 text-white font-mono text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest font-black">
                                              VERIFIED GPS-STAMPED
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100 mt-1 text-[10px] text-emerald-800 leading-normal font-medium">
                                        <b>Usulan Rujukan Layanan:</b> Diusulkan untuk disalurkan ke <b>{rec.jenisLayanan}</b>.
                                      </div>
                                    </div>
                                  )}
                                  
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  );
                })()}

              </div>
            </div>

          </div>
        </main>
      ) : (userRole === 'admin' && session?.role !== 'admin') || (userRole === 'facilitator' && session?.role !== 'facilitator') ? (
        <main className="flex-1 p-4 md:p-10 max-w-xl mx-auto w-full flex flex-col justify-center animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xl flex flex-col gap-6 relative">
            
            <div className="absolute -top-3 left-6 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
              Sistem Jaminan Sosial • SLRT KITO
            </div>

            <div className="text-center mt-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-white text-xl font-bold mb-3 shadow-inner">
                {userRole === 'admin' ? '💻' : '👥'}
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight uppercase font-display">
                {userRole === 'admin' ? 'Gerbang Masuk Admin' : isRegisterMode ? 'Daftar Fasilitator Baru' : 'Masuk Fasilitator Lapangan'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal max-w-xs mx-auto">
                {userRole === 'admin' 
                  ? 'Halaman otorisasi khusus Administrator Dinsos SLRT KITO Tanjungbalai.' 
                  : isRegisterMode 
                    ? 'Buat akun fasilitator lapangan baru untuk audit data sosial rujukan daerah.' 
                    : 'Gunakan surel dan password terverifikasi Anda untuk mengakses penugasan lapangan.'}
              </p>
            </div>

            {regSuccess && (
              <div className="bg-emerald-50 border border-emerald-250 text-emerald-850 text-xs p-4 rounded-xl font-medium leading-relaxed">
                <p className="font-extrabold text-emerald-950 flex items-center gap-1.5 mb-1">
                  <span>✅</span> REGISTRASI BERHASIL!
                </p>
                {regSuccess}
                <p className="text-[9px] text-emerald-600 font-mono font-bold mt-2 uppercase tracking-wide">
                  Status: PENDING_APPROVAL (Menunggu Persetujuan Admin)
                </p>
              </div>
            )}

            {authError && (
              <div className="bg-rose-50 border border-rose-220 text-rose-800 text-xs p-3.5 rounded-xl font-bold flex items-center gap-2">
                <span className="text-sm">⚠️</span> 
                <span className="leading-relaxed">{authError}</span>
              </div>
            )}

            {userRole === 'admin' && (
              <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider font-display">Username Utama *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan Username Admin..."
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider font-display">Password Pengaman *</label>
                  <div className="relative font-sans">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Masukkan Password rujukan..."
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl pr-10 text-slate-800 focus:outline-none focus:border-indigo-605 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold"
                    >
                      {showPassword ? '✕ Sembunyi' : '👁️ Tampilkan'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md mt-1 cursor-pointer uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                >
                  <span>🔐</span> Masuk Sebagai Admin
                </button>
              </form>
            )}

            {userRole === 'facilitator' && !isRegisterMode && (
              <form onSubmit={handleFacilitatorLogin} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider font-display">Alamat Email Terdaftar *</label>
                  <input
                    type="email"
                    required
                    placeholder="contoh: budi@slrt.id..."
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider font-display">Kata Sandi (Password) *</label>
                  <div className="relative font-sans">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Masukkan kata sandi..."
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl pr-10 text-slate-800 focus:outline-none focus:border-emerald-605 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold"
                    >
                      {showPassword ? '✕ Sembunyi' : '👁️ Tampilkan'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-750 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md mt-1 cursor-pointer uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                >
                  <span>🔐</span> Masuk Sebagai Fasilitator
                </button>

                <div className="text-center pt-2 border-t border-slate-100 text-xs">
                  <p className="text-slate-500">
                    Belum punya akun?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsRegisterMode(true); setAuthError(null); setRegSuccess(null); }}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Daftar Fasilitator Baru ➔
                    </button>
                  </p>
                </div>
              </form>
            )}

            {userRole === 'facilitator' && isRegisterMode && (
              <form onSubmit={handleFacilitatorRegister} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider font-display">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama lengkap..."
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-650"
                    />
                  </div>

                  <div className="relative">
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider font-display font-black">NIK / ID Pegawai (16 Digit) *</label>
                    <input
                      type="text"
                      required
                      maxLength={16}
                      placeholder="Nomor NIK KTP..."
                      value={regNik}
                      onChange={(e) => setRegNik(e.target.value.replace(/\D/g, ''))}
                      onFocus={() => setIsRegNikFocused(true)}
                      onBlur={() => setIsRegNikFocused(false)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-650 font-mono tracking-widest"
                    />
                    <NikValidationOverlay
                      nik={regNik}
                      type="facilitator"
                      facilitators={facilitators}
                      isVisible={isRegNikFocused || regNik.trim().length > 0}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider font-display">No. HP / WA Aktif *</label>
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 0812XXXXXXXX..."
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-650"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider font-display">Email (Guna Log Masuk) *</label>
                    <input
                      type="email"
                      required
                      placeholder="alamat@email.com..."
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-650"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <div>
                    <label className="text-[9px] font-black text-slate-50 block mb-1 uppercase tracking-wider font-display text-slate-500">Wilayah Kecamatan Tugas *</label>
                    <select
                      value={regKec}
                      onChange={(e) => setRegKec(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg text-slate-850"
                    >
                      {Object.keys(TANJUNGBALAI_LOCATIONS).map(kec => (
                        <option key={kec} value={kec}>{kec}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-50 block mb-1 uppercase tracking-wider font-display text-slate-500">Wilayah Kelurahan Tugas *</label>
                    <select
                      value={regKel}
                      onChange={(e) => setRegKel(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg text-slate-850"
                    >
                      {TANJUNGBALAI_LOCATIONS[regKec]?.map(kel => (
                        <option key={kel} value={kel}>{kel}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider font-display">Sandi Baru *</label>
                    <input
                      type="password"
                      required
                      placeholder="Kata Sandi..."
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-650 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider font-display font-black">Ulangi Sandi *</label>
                    <input
                      type="password"
                      required
                      placeholder="Ulang Sandi..."
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-650 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md cursor-pointer uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 border border-emerald-650"
                >
                  <span>📝</span> Kirim Formulir Registrasi
                </button>

                <div className="text-center pt-1 border-t border-slate-100 text-[11px]">
                  <p className="text-slate-500">
                    Sudah mendaftar sebelumnya?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsRegisterMode(false); setAuthError(null); }}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Silakan Masuk ➔
                    </button>
                  </p>
                </div>
              </form>
            )}

            <div className="text-center font-mono text-[9px] uppercase font-bold text-slate-400 border-t border-slate-100 pt-3">
              Dinas Sosial Kota Tanjungbalai &bull; SLRT KITO
            </div>

          </div>
        </main>
      ) : (
        <main className="flex-1 p-4 md:p-6 grid grid-cols-12 gap-6 overflow-hidden">
        
        {/* SIDEBAR NAVIGATION & LIST */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-5 self-start h-full">
          
          {/* Bento Navigation Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-1 shrink-0 font-sans">
            <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest px-2 pb-2 border-b border-slate-150 mb-2">MENU DASBOR</h4>
            
            <button
              onClick={() => setActiveTab('all-records')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'all-records' 
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-905'
              }`}
            >
              <span>📂 Database Kunjungan</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${activeTab === 'all-records' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-550 font-bold'}`}>
                {records.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard-summary')}
              id="dashboard-tab-trigger"
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'dashboard-summary' 
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-905'
              }`}
            >
              <span>📊 Ringkasan Statistik</span>
              <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-indigo-200">
                Baru
              </span>
            </button>

            <button
              onClick={() => { resetForm(); setActiveTab('add-record'); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'add-record' && !editingId
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-905'
              }`}
            >
              <span>➕ Input Kunjungan Baru</span>
              {editingId && (
                <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md animate-pulse">
                  EDITING
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('smart-parser')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'smart-parser' 
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-905'
              }`}
            >
              <span>🪄 Asisten Parser WhatsApp</span>
              <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-200">
                Praktis
              </span>
            </button>

            <button
              onClick={() => setActiveTab('help')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'help' 
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-905'
              }`}
            >
              <span>📖 Panduan 18 Lapangan</span>
            </button>

            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('facilitators')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === 'facilitators' 
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-905'
                }`}
              >
                <span className="flex items-center gap-1.5">👥 Verifikasi Petugas</span>
                {facilitators.filter(f => f.status === 'PENDING_APPROVAL').length > 0 ? (
                  <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md animate-pulse">
                    {facilitators.filter(f => f.status === 'PENDING_APPROVAL').length} BARU
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400 font-mono font-bold">
                    {facilitators.length} Total
                  </span>
                )}
              </button>
            )}
          </div>

          {/* ACTIVE RECORD SELECTOR & FILTERS (Only visible and useful on database screen) */}
          {activeTab === 'all-records' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-h-[640px]">
              
              {/* Filter Headline */}
              <div className="p-4 border-b border-slate-150 bg-slate-50/50 flex flex-col gap-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-xs text-slate-800 tracking-wide">DAFTAR ANTRIAN</h2>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-mono font-bold">
                    {filteredRecords.length} Data
                  </span>
                </div>

                {/* compact search entries */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama klien..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs py-2 pl-8 pr-3 rounded-lg placeholder-slate-400 focus:outline-none focus:border-indigo-500 text-slate-800 transition-all cursor-pointer"
                  />
                </div>

                {/* mini filters selectors */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={filterKecamatan}
                    onChange={(e) => { setFilterKecamatan(e.target.value); setFilterKelurahan(''); }}
                    className="bg-white border border-slate-200 rounded-lg text-[10px] p-1.5 focus:border-indigo-500 text-slate-755 outline-none"
                  >
                    <option value="">Kecamatan (Semua)</option>
                    {Object.keys(TANJUNGBALAI_LOCATIONS).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  <select
                    value={filterKelurahan}
                    onChange={(e) => setFilterKelurahan(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-[10px] p-1.5 focus:border-indigo-500 text-slate-755 outline-none font-bold cursor-pointer"
                  >
                    <option value="">Kelurahan (Semua)</option>
                    {filterKecamatan ? (
                      TANJUNGBALAI_LOCATIONS[filterKecamatan as keyof typeof TANJUNGBALAI_LOCATIONS]?.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))
                    ) : (
                      Array.from(new Set(Object.values(TANJUNGBALAI_LOCATIONS).flat())).map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* filter by visitation status */}
                <div>
                  <select
                    value={filterKunjungan}
                    onChange={(e) => setFilterKunjungan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-[10px] p-1.5 focus:border-indigo-500 text-slate-705 outline-none font-semibold text-slate-700"
                  >
                    <option value="">Status Kunjungan (Semua)</option>
                    <option value="Belum Dikunjungi">🕒 Belum Dikunjungi (Pending)</option>
                    <option value="Sudah Dikunjungi">✅ Sudah Dikunjungi (Verified)</option>
                  </select>
                </div>

                {/* filter by facilitator / petugas */}
                <div>
                  <span className="text-[9px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Fasilitator Lapangan :</span>
                  <select
                    value={selectedFacilitatorFilter}
                    onChange={(e) => setSelectedFacilitatorFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-[10px] p-1.5 focus:border-indigo-500 text-slate-700 outline-none font-semibold hover:border-slate-300 transition-colors"
                  >
                    <option value="all">Semua Fasilitator Lapangan</option>
                    {facilitators.filter(f => f.status === 'APPROVED').map(f => (
                      <option key={f.id} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* filter by pendata / verifier */}
                <div>
                  <span className="text-[9px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Nama Pendata (Verifier) :</span>
                  <select
                    value={selectedPendataFilter}
                    onChange={(e) => setSelectedPendataFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-[10px] p-1.5 focus:border-indigo-500 text-slate-700 outline-none font-semibold hover:border-slate-300 transition-colors"
                  >
                    <option value="all">Semua Petugas Pendata (Verifier)</option>
                    {facilitators.filter(f => f.status === 'APPROVED').map(f => (
                      <option key={f.id} value={f.name}>{f.name}</option>
                    ))}
                    <option value="Admin Dinsos">Admin Dinsos</option>
                  </select>
                </div>

                {/* filter by month & year range */}
                <div className="border-t border-slate-200/65 pt-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-indigo-500" /> RENTANG BULAN &amp; TAHUN
                    </span>
                    {(filterStartMonth || filterStartYear || filterEndMonth || filterEndYear) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterStartMonth('');
                          setFilterStartYear('');
                          setFilterEndMonth('');
                          setFilterEndYear('');
                        }}
                        className="text-[9px] font-black text-rose-600 hover:text-rose-800 uppercase tracking-widest cursor-pointer hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Mulai Periode:</span>
                      <div className="grid grid-cols-2 gap-1">
                        <select
                          value={filterStartMonth}
                          onChange={(e) => setFilterStartMonth(e.target.value)}
                          className="bg-white border border-slate-200 rounded-md text-[9px] p-1 text-slate-700 focus:border-indigo-500 outline-none font-medium cursor-pointer"
                        >
                          <option value="">Bulan</option>
                          <option value="1">Jan</option>
                          <option value="2">Feb</option>
                          <option value="3">Mar</option>
                          <option value="4">Apr</option>
                          <option value="5">Mei</option>
                          <option value="6">Jun</option>
                          <option value="7">Jul</option>
                          <option value="8">Agu</option>
                          <option value="9">Sep</option>
                          <option value="10">Okt</option>
                          <option value="11">Nov</option>
                          <option value="12">Des</option>
                        </select>
                        <select
                          value={filterStartYear}
                          onChange={(e) => setFilterStartYear(e.target.value)}
                          className="bg-white border border-slate-200 rounded-md text-[9px] p-1 text-slate-700 focus:border-indigo-500 outline-none font-semibold cursor-pointer"
                        >
                          <option value="">Tahun</option>
                          <option value="2024">2024</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                          <option value="2028">2028</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Akhir Periode:</span>
                      <div className="grid grid-cols-2 gap-1">
                        <select
                          value={filterEndMonth}
                          onChange={(e) => setFilterEndMonth(e.target.value)}
                          className="bg-white border border-slate-200 rounded-md text-[9px] p-1 text-slate-700 focus:border-indigo-500 outline-none font-medium cursor-pointer"
                        >
                          <option value="">Bulan</option>
                          <option value="1">Jan</option>
                          <option value="2">Feb</option>
                          <option value="3">Mar</option>
                          <option value="4">Apr</option>
                          <option value="5">Mei</option>
                          <option value="6">Jun</option>
                          <option value="7">Jul</option>
                          <option value="8">Agu</option>
                          <option value="9">Sep</option>
                          <option value="10">Okt</option>
                          <option value="11">Nov</option>
                          <option value="12">Des</option>
                        </select>
                        <select
                          value={filterEndYear}
                          onChange={(e) => setFilterEndYear(e.target.value)}
                          className="bg-white border border-slate-200 rounded-md text-[9px] p-1 text-slate-700 focus:border-indigo-500 outline-none font-semibold cursor-pointer"
                        >
                          <option value="">Tahun</option>
                          <option value="2024">2024</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                          <option value="2028">2028</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* filter by verification date range */}
                <div className="border-t border-slate-200/65 pt-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-emerald-600" /> RENTANG TANGGAL VERIFIKASI
                    </span>
                    {(filterVerifStartDate || filterVerifEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterVerifStartDate('');
                          setFilterVerifEndDate('');
                        }}
                        className="text-[9px] font-black text-rose-600 hover:text-rose-800 uppercase tracking-widest cursor-pointer hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wide">Mulai Verifikasi:</span>
                      <input
                        type="date"
                        value={filterVerifStartDate}
                        onChange={(e) => setFilterVerifStartDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-md text-[9px] p-1 text-slate-700 focus:border-indigo-500 outline-none font-medium cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wide">Sampai Verifikasi:</span>
                      <input
                        type="date"
                        value={filterVerifEndDate}
                        onChange={(e) => setFilterVerifEndDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-md text-[9px] p-1 text-slate-700 focus:border-indigo-500 outline-none font-medium cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* INTERACTIVE HUD: BULAN BERJALAN & PER KELURAHAN COVERS */}
              <div className="bg-slate-50 border-y border-slate-200 p-3.5 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    Saringan Bulan Berjalan (Juni 2026)
                  </span>
                  
                  {/* Toggle button for Bulan Berjalan Filter */}
                  <button
                    onClick={() => {
                      setFilterBulanBerjalan(!filterBulanBerjalan);
                      // If deactivated, reset kelurahan filter as well if chosen
                      if (filterBulanBerjalan) {
                        setFilterKelurahan('');
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      filterBulanBerjalan 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {filterBulanBerjalan ? 'Aktif' : 'Aktifkan'}
                  </button>
                </div>

                <p className="text-[9px] text-slate-450 leading-normal italic">
                  Informasi sebaran laporan masuk bulan berjalan per Kelurahan. Klik untuk menyaring secara instan:
                </p>

                {/* Grid of Kelurahan Chips */}
                {Object.keys(currentMonthKelurahanStats).length === 0 ? (
                  <div className="text-center p-2 text-slate-400 text-[9px] italic bg-white rounded-lg border border-slate-150">
                    Tidak ada berkas terdaftar untuk bulan berjalan.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-[145px] overflow-y-auto pr-0.5">
                    {(Object.entries(currentMonthKelurahanStats) as [string, { total: number; visited: number; unvisited: number }][])
                      .map(([kelName, stats]) => {
                        const isKelActive = filterBulanBerjalan && filterKelurahan.toLowerCase() === kelName.toLowerCase();
                        return (
                          <button
                            key={kelName}
                            type="button"
                            onClick={() => {
                              // Auto activate the Bulan Berjalan filter
                              setFilterBulanBerjalan(true);
                              
                              if (isKelActive) {
                                setFilterKelurahan('');
                              } else {
                                setFilterKelurahan(kelName);
                              }
                            }}
                            className={`p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                              isKelActive 
                                ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 text-indigo-950 shadow-2xs' 
                                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="text-[9.5px] font-bold truncate block w-full text-slate-800">
                              Kel. {kelName}
                            </span>
                            <div className="flex items-center justify-between mt-1 w-full text-[8.5px] font-mono leading-none">
                              <span className="text-slate-400">Berkas:</span>
                              <span className="font-bold text-slate-800">{stats.total}</span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5 w-full text-[8px] font-bold text-teal-600 leading-none">
                              <span>Selesai:</span>
                              <span>{stats.visited} / {stats.total}</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* Actionable status indicator */}
                {filterBulanBerjalan && (
                  <div className="flex justify-between items-center bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100 mt-0.5">
                    <span className="text-[8.5px] text-indigo-900 font-bold">
                      Menyaring {filterKelurahan ? `Kel. ${filterKelurahan}` : 'Semua Kelurahan'} (Juni 2026)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterBulanBerjalan(false);
                        setFilterKelurahan('');
                      }}
                      className="text-[8px] font-black text-rose-600 hover:text-rose-800 uppercase cursor-pointer"
                    >
                      Batal Saring
                    </button>
                  </div>
                )}
              </div>

              {/* Sidebar list visitors queue */}
              <div className="flex-1 overflow-y-auto">
                {cloudLoading ? (
                  <SidebarListSkeleton />
                ) : (
                  <motion.div
                    key={`${searchQuery}_${filterKecamatan}_${filterKelurahan}_${filterStatus}_${filterKunjungan}_${filterVerifStartDate}_${filterVerifEndDate}_${filteredRecords.length}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="divide-y divide-slate-100"
                  >
                    {filteredRecords.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        Tidak ada kunjungan cocok filter
                      </div>
                    ) : (
                    filteredRecords.map((rec) => {
                      const isSelected = selectedRecordId === rec.id;
                      const isSangatMiskin = rec.status.toLowerCase().includes('sangat');
                      const isRentan = rec.status.toLowerCase().includes('rentan');
                      return (
                        <div
                          key={rec.id}
                          onClick={() => setSelectedRecordId(rec.id)}
                          className={`p-3 cursor-pointer transition-colors relative group ${
                            isSelected 
                              ? 'bg-indigo-50 border-r-4 border-indigo-600' 
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <div>
                              <p className="text-[9px] font-black uppercase text-indigo-600/80 tracking-wide font-mono">
                                {rec.kecamatan}
                              </p>
                              <p className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                {rec.namaKlien}
                                {rec.isHighPriority && (
                                  <span className="text-[7.5px] font-black px-1 py-0.5 rounded-md bg-rose-600 text-white uppercase tracking-wider animate-pulse inline-block">
                                    🚨 PRIORITAS
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-sans font-medium">
                                Saran: <span className="text-indigo-900 font-extrabold">{rec.status}</span>
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase bg-emerald-50 text-emerald-800 border border-emerald-250 font-mono tracking-tight shrink-0 whitespace-nowrap">
                                {rec.kelurahan}
                              </span>
                              
                              <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded-full uppercase border tracking-wide whitespace-nowrap shrink-0 flex items-center gap-1 ${
                                rec.statusKunjungan === 'Sudah Dikunjungi'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${
                                  rec.statusKunjungan === 'Sudah Dikunjungi' ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
                                }`}></span>
                                {rec.statusKunjungan === 'Sudah Dikunjungi' ? 'Sudah Dikunjungi' : 'Belum Dikunjungi'}
                              </span>
                              
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEditRecordSetup(rec); }}
                                  className="p-1 hover:bg-slate-200 hover:text-indigo-600 rounded"
                                  title="Ubah data"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                {userRole === 'admin' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(rec.id); }}
                                    className="p-1 hover:bg-slate-200 hover:text-rose-600 rounded"
                                    title="Hapus data"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  </motion.div>
                )}
              </div>

              {/* Sidebar trigger to add new */}
              <div className="p-3 border-t border-slate-100">
                <button 
                  onClick={() => { resetForm(); setActiveTab('add-record'); }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer text-center block uppercase tracking-wide"
                >
                  + Tambah Data Baru
                </button>
              </div>
            </div>
          )}

          {/* SYSTEM UTILITY CADANGAN PANEL */}
          <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 font-sans shrink-0">
            <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-1">
              <Download className="w-3.5 h-3.5 text-indigo-600 animate-bounce" /> OPTIMASI EKSPOR ADVANCED
            </h4>
            
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[10px] text-slate-650 flex flex-col gap-1.5 shadow-xs">
              <p className="font-extrabold text-slate-800 uppercase tracking-wider text-[8px] text-slate-500">Status Saringan Saat Ini:</p>
              <div className="flex flex-col gap-1 text-[9px] font-semibold font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-150">
                <div>• Fasilitator Lapangan: <b className="text-indigo-600">{selectedFacilitatorFilter === 'all' ? 'Semua Fasilitator' : selectedFacilitatorFilter}</b></div>
                <div>• Nama Pendata (Verifier): <b className="text-teal-600">{selectedPendataFilter === 'all' ? 'Semua Pendata' : selectedPendataFilter}</b></div>
                <div>• Periode: <b className="text-slate-700">
                  {filterStartMonth || filterStartYear || filterEndMonth || filterEndYear ? (
                    `${filterStartMonth ? `Bln ${filterStartMonth}` : ''} ${filterStartYear || ''} - ${filterEndMonth ? `Bln ${filterEndMonth}` : ''} ${filterEndYear || ''}`
                  ) : (
                    'Semua Periode'
                  )}
                </b></div>
                <div>• Status Kunjungan: <b className="text-slate-700">{filterKunjungan || 'Semua'}</b></div>
                <div>• Rentang Verifikasi: <b className="text-emerald-700">{filterVerifStartDate || filterVerifEndDate ? `${filterVerifStartDate || 'Awal'} s/d ${filterVerifEndDate || 'Akhir'}` : 'Semua Tanggal'}</b></div>
                <div className="border-t border-slate-200 pt-1 mt-1 font-bold text-emerald-700 font-sans flex justify-between items-center text-[10px]">
                  <span>✓ Siap Diekspor:</span>
                  <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-mono">{filteredRecords.length} Data</span>
                </div>
              </div>

              {/* Advanced Export Buttons */}
              <div className="flex flex-col gap-1.5 mt-1.5">
                <button 
                  onClick={() => handleAdvancedExport('xlsx')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-2.5 text-[9.5px] font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all uppercase tracking-wide shadow-md active:scale-[0.99]"
                  title="Unduh data terseleksi dalam format Excel dengan filter aktif"
                >
                  🟢 Ekspor Laporan Terpadu Petugas
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <span className="col-span-2 text-[8px] text-slate-400 text-center font-semibold">Unduh Format Alternatif:</span>
                  <button 
                    onClick={() => handleAdvancedExport('CSV')}
                    className="col-span-2 bg-slate-800 text-white hover:bg-slate-900 py-1.5 px-2 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all uppercase tracking-wide shadow-xs"
                    title="Unduh data terseleksi dalam format CSV"
                  >
                    📄 Unduh CSV Terpadu
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-2.5">
              <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest block mb-1.5">Backup JSON &amp; Impor Database</span>
              <div className="grid grid-cols-3 gap-1">
                <button 
                  onClick={handleExportJSON}
                  className="bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 py-1.5 px-0.5 text-[8px] font-bold rounded-lg flex items-center justify-center gap-0.5 cursor-pointer transition-all text-slate-700 hover:text-indigo-700 font-sans"
                  title="Ekspor seluruh data ke format JSON"
                >
                  <Download className="w-3 h-3 text-slate-400 shrink-0" /> Ekspor JSON
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 py-1.5 px-0.5 text-[8px] font-bold rounded-lg flex items-center justify-center gap-0.5 cursor-pointer transition-all text-slate-700 hover:text-indigo-700 font-sans"
                  title="Impor pangkalan data dari berkas JSON"
                >
                  <Upload className="w-3 h-3 text-slate-400 shrink-0" /> Impor JSON
                </button>
                <button 
                  onClick={() => csvFileInputRef.current?.click()}
                  className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 py-1.5 px-0.5 text-[8px] font-bold rounded-lg flex items-center justify-center gap-0.5 cursor-pointer transition-all text-slate-700 hover:text-emerald-700 font-sans"
                  title="Impor records rujukan SLRT dari berkas CSV"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-500 shrink-0" /> Impor CSV
                </button>
              </div>
              
              <button 
                type="button"
                onClick={handleDownloadCSVTemplate}
                className="w-full mt-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-850 hover:text-emerald-900 py-1.5 px-2 text-[8.5px] font-extrabold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all uppercase tracking-wider shadow-xs"
                title="Unduh contoh template kolom CSV resmi SLRT Tanjungbalai"
              >
                📥 Unduh Template CSV SLRT
              </button>
            </div>

            {/* Pusat Sinkronisasi Real-Time (Active Web App) */}
            <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                🔄 PUSAT SINKRONISASI REAL-TIME
              </span>
              
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 flex flex-col gap-1.5 text-[10px]">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-650">
                  <span>Status Koneksi:</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] flex items-center gap-1 uppercase tracking-wider font-mono ${
                    cloudLoading 
                      ? 'bg-amber-100 text-amber-850 animate-pulse' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-150 font-bold'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    Terhubung
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-650">
                  <span>Modifikasi Luring:</span>
                  {unsyncedCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-amber-500 text-white font-black animate-bounce">
                      {unsyncedCount} Kiriman Luring
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-slate-100 text-slate-400 font-medium">
                      Sudah Sinkron
                    </span>
                  )}
                </div>

                <div className="text-[8px] text-slate-400 leading-normal italic">
                  Data kunjungan disinkronisasikan multi-perangkat secara otomatis setiap <b className="text-slate-600 font-mono">12 detik</b> antara akun Admin Dinsos dan Fasilitator Lapangan.
                </div>
              </div>

              {unsyncedCount > 0 ? (
                <button
                  type="button"
                  onClick={handleSyncAllOfflineChanges}
                  disabled={cloudLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-350 text-white font-black py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px] transition-all cursor-pointer shadow-md select-none uppercase tracking-wider active:scale-[0.98]"
                  title="Klik untuk menyinkronisasikan perubahan data luring Anda langsung ke Google Sheets"
                >
                  🚀 Sinkronkan {unsyncedCount} Data Sekarang
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => refreshFromCloud(true)}
                  disabled={cloudLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px] transition-all cursor-pointer shadow-xs select-none uppercase tracking-wider"
                  title="Klik untuk memaksa tarik data terbaru dari Google Sheets sekarang"
                >
                  📡 {cloudLoading ? 'Menyinkronkan...' : 'Refresh Tarik Cloud'}
                </button>
              )}

              {/* Force Sync Option */}
              <button
                type="button"
                onClick={handleForceSynchronizeFromCloud}
                disabled={cloudLoading}
                className="w-full mt-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 hover:text-rose-900 py-2.5 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all uppercase tracking-wider text-[9.5px] font-extrabold select-none shadow-xs"
                title="Bersihkan semua cache luring di browser ini dan sinkronisasikan murni dari Google Sheets (Gunakan jika data di PC ini berbeda / tidak sinkron dengan PC lain)"
              >
                🧹 Sinkron Paksa &amp; Hapus Cache Browser
              </button>

              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={handleBulkSyncToGoogleSheets}
                  disabled={syncingRecordId !== null}
                  className="w-full bg-slate-800 hover:bg-slate-900 border border-slate-700 disabled:bg-slate-350 text-white font-extrabold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[9px] transition-all cursor-pointer shadow-xs select-none uppercase tracking-wide mt-1"
                  title="Khusus Admin: Ekspor seluruh data rujukan lokal untuk ditulis secara massal ke Google Sheets"
                >
                  📊 {syncingRecordId === 'all' ? 'Ekspor Massal...' : 'Ekspor Massal Central Ke Sheets'}
                </button>
              )}
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportJSON} 
              accept=".json" 
              className="hidden" 
            />
            <input 
              type="file" 
              ref={csvFileInputRef} 
              onChange={handleImportCSV} 
              accept=".csv" 
              className="hidden" 
            />
            <div className="flex flex-col gap-2.5 mt-2.5 pt-2 border-t border-slate-100">
              <button 
                onClick={handleResetToDemo}
                className="text-[10px] text-slate-400 hover:text-indigo-600 text-left cursor-pointer transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Atur Ulang Data Simulasi
              </button>
              <button 
                onClick={handleClearDatabase}
                className="text-[10px] text-slate-400 hover:text-rose-600 text-left cursor-pointer transition-colors flex items-center gap-1 font-bold"
              >
                <Trash2 className="w-2.5 h-2.5 text-rose-500" /> Kosongkan Semua Data Inputan
              </button>
            </div>
          </div>

        </section>

        {/* WORKSPACE DETAILED CONTENTS */}
        <section className="col-span-12 lg:col-span-9 flex flex-col gap-6">
          
          {/* 1. VIEW DATABASE VIEW TAB */}
          {activeTab === 'all-records' && (
            <div className="flex flex-col gap-6 font-sans">
              
              {cloudLoading ? (
                <BentoDetailsSkeleton />
              ) : selectedRecord ? (
                <BentoRecordDetails
                  rec={selectedRecord}
                  onPrint={handlePrintSlip}
                  onDownloadPDF={handleDownloadPDF}
                  onCopyFormatList={() => handleCopyToClipboard(generateListText(selectedRecord), 'list')}
                  copiedRecordId={copiedRecordId}
                  listText={generateListText(selectedRecord)}
                  userRole={userRole}
                  onVerifyVisit={handleOpenVerifierModal}
                  onSyncSheets={handleSyncToGoogleSheets}
                  isSyncingSheets={syncingRecordId === selectedRecord.id}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center text-slate-450 flex flex-col items-center justify-center gap-3 shadow-xs">
                  <FileText className="w-12 h-12 text-slate-200" />
                  <p className="text-sm font-bold">Belum Ada Data Kunjungan Terpilih</p>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                    Silakan pilih salah satu kartu antrean kunjungan di sebelah kiri untuk meninjau 18 lapangan data, mencetak formulir kualifikasi, atau mengedit laporan pendataan rujukan fasilitator.
                  </p>
                </div>
              )}

              {/* D3 OR BULK MARKDOWN TABLE GENERATOR AT THE BOTTOM */}
              <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-xl mt-2 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-400" /> RINGKASAN TABEL MARKDOWN (HASIL FILTER)
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal mt-1 pr-6 italic">
                      Salin output tabel Markdown ini untuk langsung Anda tempelkan pada arsip laporan bulanan, format pengisian dokumen, atau email Dinas Sosial Kota Tanjungbalai.
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(generateMarkdownTable(filteredRecords), 'tbl')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer self-start sm:self-center uppercase tracking-wide border border-slate-700"
                  >
                    {copiedRecordId === 'tbl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedRecordId === 'tbl' ? 'Tabel Tersalin!' : 'Salin Tabel'}</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="max-h-56 overflow-y-auto font-mono text-[9px] bg-slate-950 p-4 rounded-xl text-indigo-200/90 border border-slate-850 select-all overflow-x-auto whitespace-pre leading-relaxed tracking-tight">
                    {generateMarkdownTable(filteredRecords)}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 2. FORM ADD OR EDIT DATA TAB */}
          {activeTab === 'add-record' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    {editingId ? 'Form SUNTING Data Laporan Klien' : 'Form INPUT Data Rujukan Baru (18 Lapangan Kerja)'}
                  </h3>
                  <p className="text-[10px] text-slate-550 mt-1 uppercase tracking-wide">Kota Tanjungbalai - Sistem Rujukan Terpadu</p>
                </div>
                
                <button
                  onClick={() => { resetForm(); setActiveTab('all-records'); }}
                  className="text-xs text-slate-550 hover:text-slate-800 bg-white border border-slate-250 py-1.5 px-3 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Kembali ke Database
                </button>
              </div>

              <form onSubmit={handleSubmitRecord} className="p-6 flex flex-col gap-6 text-xs">
                
                {/* SECTION A */}
                <div className="bg-slate-100/40 p-4 rounded-xl border border-slate-150">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3 pb-1 border-b border-slate-200/50">
                    A. Profil Pendata &amp; Lokasi Dinsos
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">1. Nama Penginput Data Rujukan *</label>
                      <input
                        type="text"
                        placeholder="Nama penginput data rujukan..."
                        value={formFasilitator}
                        onChange={(e) => setFormFasilitator(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">3. Kecamatan Penugasan *</label>
                      <select
                        value={formKecamatan}
                        onChange={(e) => setFormKecamatan(e.target.value)}
                        className="w-full bg-white border border-slate-205 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      >
                        {Object.keys(TANJUNGBALAI_LOCATIONS).map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">2. Kelurahan Penugasan *</label>
                      <select
                        value={formKelurahan}
                        onChange={(e) => setFormKelurahan(e.target.value)}
                        className="w-full bg-white border border-slate-205 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      >
                        {TANJUNGBALAI_LOCATIONS[formKecamatan]?.map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Automatic Location Geotagging telemetry status */}
                  <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest font-mono">
                          DETEKSI LOKASI OTOMATIS (GPS ADVANCED)
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        Koordinat GPS klien terdeteksi otomatis saat formulir ini dibuka guna memastikan data spasial real-time yang akurat.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700 flex gap-2">
                        <span>Lat: <strong>{formLatitude !== null ? formLatitude.toFixed(6) : "Mencari..."}</strong></span>
                        <span className="text-slate-300">|</span>
                        <span>Lng: <strong>{formLongitude !== null ? formLongitude.toFixed(6) : "Mencari..."}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const geo = await getGeotagCoordinates();
                          setFormLatitude(geo.latitude);
                          setFormLongitude(geo.longitude);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        🔄 Segarkan GPS
                      </button>
                    </div>
                  </div>
                </div>

                {/* SECTION B */}
                <div className="bg-slate-100/45 p-4 rounded-xl border border-slate-150">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3 pb-1 border-b border-slate-200/50">
                    B. Profil Identitas Kepala Keluarga &amp; Klien
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">4. Hari, Tanggal Kunjungan</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Hari, 01 Juni 2026"
                          value={formHariTanggal}
                          onChange={(e) => setFormHariTanggal(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800 font-medium"
                        />
                        <input
                          type="date"
                          helper-text="Pilih otomatis"
                          onChange={(e) => handleAutoDate(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-xs px-2 rounded-lg cursor-pointer hover:bg-slate-100 font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">5. Nama Klien Utama *</label>
                      <input
                        type="text"
                        placeholder="Nama lengkap klien..."
                        value={formNamaKlien}
                        onChange={(e) => setFormNamaKlien(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                        required
                      />
                    </div>

                    <div className="relative">
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">5.1. NIK Klien (16 Digit) *</label>
                      <input
                        type="text"
                        maxLength={16}
                        placeholder="Masukkan 16 digit NIK..."
                        value={formNik}
                        onChange={(e) => setFormNik(e.target.value.replace(/\D/g, ''))}
                        onFocus={() => setIsFormNikFocused(true)}
                        onBlur={() => setIsFormNikFocused(false)}
                        className={`w-full bg-white text-xs px-3 py-2 rounded-lg outline-none font-mono tracking-widest border-2 transition-all duration-200 ${
                          formNik.trim().length > 0 && formNik.trim().length < 16
                            ? 'border-amber-400 focus:border-amber-600 bg-amber-50/10'
                            : formNik.trim().length === 16 && records.some(r => r.nik === formNik.trim() && r.id !== editingId)
                            ? 'border-rose-500 bg-rose-50/25 focus:border-rose-600'
                            : formNik.trim().length === 16
                            ? 'border-emerald-500 bg-emerald-50/10 focus:border-emerald-600'
                            : 'border-slate-200 focus:border-indigo-500 text-slate-800'
                        }`}
                        required
                      />
                      <NikValidationOverlay
                        nik={formNik}
                        type="client"
                        records={records}
                        editingId={editingId}
                        isVisible={isFormNikFocused || formNik.trim().length > 0}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">6. Pekerjaan Pokok KRT</label>
                      <input
                        type="text"
                        placeholder="Contoh: Nelayan, Buruh Tani, dll..."
                        value={formPekerjaanKrt}
                        onChange={(e) => setFormPekerjaanKrt(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">7. Nama Kuasa (Isi '-' jika langsung)</label>
                      <input
                        type="text"
                        value={formNamaKuasa}
                        onChange={(e) => setFormNamaKuasa(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">9. No Telpon / HP Aktif *</label>
                      <input
                        type="text"
                        placeholder="Contoh: 0812xxxxxxxx"
                        value={formNoTelpon}
                        onChange={(e) => setFormNoTelpon(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">10. Dokumen Yang Dibawa Klien</label>
                      <input
                        type="text"
                        placeholder="Contoh: KK, KTP, Surat SKTM..."
                        value={formDokumen}
                        onChange={(e) => setFormDokumen(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">8. Alamat Klien Lengkap</label>
                      <textarea
                        rows={2}
                        placeholder="Sertakan nama jalan, gang, nomor rumah, dan nomor lingkungan..."
                        value={formAlamatKlien}
                        onChange={(e) => setFormAlamatKlien(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800 resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION C */}
                <div className="bg-slate-100/40 p-4 rounded-xl border border-slate-150">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3 pb-1 border-b border-slate-200/50">
                    C. Indikator Sosial Ekonomi &amp; Kelayakan Hunian
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">11. Status Kesejahteraan Klien</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      >
                        <option value="Sangat Miskin">Sangat Miskin</option>
                        <option value="Miskin">Miskin</option>
                        <option value="Rentan">Rentan</option>
                        <option value="Hampir Sejahtera">Hampir Sejahtera</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">13. Status Kepemilikan Rumah</label>
                      <select
                        value={formStatusRumah}
                        onChange={(e) => setFormStatusRumah(e.target.value)}
                        className="w-full bg-white border border-slate-205 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      >
                        <option value="Milik Sendiri">Milik Sendiri</option>
                        <option value="Sewa">Sewa / Kontrak</option>
                        <option value="Menumpang">Menumpang (Keluarga)</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">14. Jenis Penerangan Utama</label>
                      <select
                        value={formJenisPenerangan}
                        onChange={(e) => setFormJenisPenerangan(e.target.value)}
                        className="w-full bg-white border border-slate-205 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      >
                        <option value="PLN Bersubsidi 450W">PLN Bersubsidi (450W / 900W)</option>
                        <option value="PLN Non-Subsidi">PLN Non-Subsidi (&gt;= 1300W)</option>
                        <option value="Listrik Numpang Tetangga">Listrik Numpang Tetangga</option>
                        <option value="Tanpa Listrik">Tanpa Listrik</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">15. Kondisi Fasilitas MCK</label>
                      <select
                        value={formMck}
                        onChange={(e) => setFormMck(e.target.value)}
                        className="w-full bg-white border border-slate-205 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      >
                        <option value="Sendiri Layak">Sendiri Layak</option>
                        <option value="Sendiri Kurang Layak">Sendiri Kurang Layak</option>
                        <option value="MCK Umum / Bersama">MCK Umum / Bersama</option>
                        <option value="Tidak Layak / Tidak Ada Toilet">Tidak Layak / Tidak Ada Toilet</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">16. Est. Pendapatan KRT Perbulan</label>
                      <input
                        type="text"
                        placeholder="Contoh: Rp 600.000"
                        value={formPendapatanPerbulan}
                        onChange={(e) => setFormPendapatanPerbulan(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      />
                    </div>

                    {/* ADMIN MULTI-SELECT CHECKBOXES FOR BANTUAN YANG SUDAH DIPEROLEH */}
                    <div className="col-span-1 sm:col-span-3">
                      <label className="text-[10px] font-black text-slate-550 block mb-1.5 uppercase tracking-wider">12. Program Bantuan Sosial yang Pernah Diterima (Pilih Semua yang Sesuai)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                        {KRITERIA_BANTUAN_SOSIAL.map((bantuan) => {
                          const isChecked = formBantuanDiterimaList.includes(bantuan);
                          return (
                            <label key={bantuan} className="flex items-start gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-indigo-650 transition-colors py-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormBantuanDiterimaList([...formBantuanDiterimaList, bantuan]);
                                  } else {
                                    setFormBantuanDiterimaList(formBantuanDiterimaList.filter(b => b !== bantuan));
                                  }
                                }}
                                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0 transition-all cursor-pointer"
                              />
                              <span>{bantuan}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* ADMIN MULTI-SELECT CHECKBOXES FOR INDIKATOR SOSIAL EKONOMI */}
                    <div className="col-span-1 sm:col-span-3">
                      <label className="text-[10px] font-black text-slate-550 block mb-1.5 uppercase tracking-wider">Indikator Kerentanan Sosial Ekonomi (Pilih Semua yang Sesuai)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-200 max-h-52 overflow-y-auto">
                        {KRITERIA_SOSIAL_EKONOMI.map((kriteria) => {
                          const isChecked = formIndikatorSosialEkonomi.includes(kriteria);
                          return (
                            <label key={kriteria} className="flex items-start gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-indigo-650 transition-colors py-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormIndikatorSosialEkonomi([...formIndikatorSosialEkonomi, kriteria]);
                                  } else {
                                    setFormIndikatorSosialEkonomi(formIndikatorSosialEkonomi.filter(k => k !== kriteria));
                                  }
                                }}
                                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0 transition-all cursor-pointer"
                              />
                              <span>{kriteria}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* ADMIN MULTI-SELECT CHECKBOXES FOR KELAYAKAN HUNI */}
                    <div className="col-span-1 sm:col-span-3">
                      <label className="text-[10px] font-black text-slate-550 block mb-1.5 uppercase tracking-wider">Kondisi Fisik Hunian / Kelayakan Rumah (Pilih Semua yang Sesuai)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-200 max-h-52 overflow-y-auto">
                        {KRITERIA_KELAYAKAN_HUNI.map((kriteria) => {
                          const isChecked = formKelayakanHuni.includes(kriteria);
                          return (
                            <label key={kriteria} className="flex items-start gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-indigo-650 transition-colors py-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormKelayakanHuni([...formKelayakanHuni, kriteria]);
                                  } else {
                                    setFormKelayakanHuni(formKelayakanHuni.filter(k => k !== kriteria));
                                  }
                                }}
                                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0 transition-all cursor-pointer"
                              />
                              <span>{kriteria}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>

                {/* SECTION D */}
                <div className="bg-slate-100/40 p-4 rounded-xl border border-slate-150">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3 pb-1 border-b border-slate-200/50">
                    D. Substansi Penyaluran Pengaduan
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">17. Jenis Pengaduan / Uraian Masalah Klien *</label>
                      <textarea
                        rows={3}
                        placeholder="Tulis keluhan pemohon di lapangan lengkap untuk pertimbangan validator..."
                        value={formJenisPengaduan}
                        onChange={(e) => setFormJenisPengaduan(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800 resize-none leading-relaxed"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">18. Jenis Layanan Yang Diinginkan / Diusulkan</label>
                      <input
                        type="text"
                        placeholder="Contoh: Reaktivasi KIS PBI, Bedah Rumah RTLH, Beasiswa PIP..."
                        value={formJenisLayanan}
                        onChange={(e) => setFormJenisLayanan(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Submition Row */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 flex-wrap">
                  <button
                    type="button"
                    onClick={() => { resetForm(); setActiveTab('all-records'); }}
                    className="px-5 py-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-md hover:shadow transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  >
                    <CheckCircle2 className="w-4 h-4" /> 
                    {editingId ? 'Simpan Laporan' : 'Simpan ke Database'}
                  </button>
                </div>
                
              </form>
            </div>
          )}

          {/* 3. PARSER CHAT TAB */}
          {activeTab === 'smart-parser' && (
            <SmartParserTab
              rawText={rawText}
              setRawText={setRawText}
              parsedPreview={parsedPreview}
              parseStatusMsg={parseStatusMsg}
              onParse={handleParseRawText}
              onApply={applyParsedDataToForm}
              samples={SMART_PARSER_SAMPLES}
            />
          )}

          {/* 4. HELP PANDUAN GUIDE TAB */}
          {activeTab === 'help' && (
            <HelpTab />
          )}

          {/* 4.5. DASHBOARD STATISTICAL SUMMARY TAB */}
          {activeTab === 'dashboard-summary' && (
            <DashboardSummary 
              records={records} 
              onSelectRecord={(id) => {
                setSelectedRecordId(id);
                setActiveTab('all-records');
              }}
            />
          )}

          {/* 5. FACILITATOR MANAGEMENT TAB (ONLY ADMIN ACCESS) */}
          {activeTab === 'facilitators' && userRole === 'admin' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6 font-sans">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight font-display">Verifikasi Registrasi &amp; Persetujuan Petugas Lapangan</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Sesuai prosedur keamanan GovTech, semua pendaftar petugas survei dikunci sampai Administrator memberikan status Aktif (Approved).
                  </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => refreshFromCloud(true)}
                    disabled={cloudLoading}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      cloudLoading
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed scale-98'
                        : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-650 text-white hover:shadow-xs active:scale-97'
                    }`}
                  >
                    🔄 {cloudLoading ? 'Menyinkronkan...' : 'Sinkron Akun Baru'}
                  </button>
                  <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl text-[11px] text-slate-650 flex items-center gap-2 font-semibold font-sans">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                    <span>Menunggu Verifikasi: <b>{facilitators.filter(f => f.status === 'PENDING_APPROVAL').length} Orang</b></span>
                  </div>
                </div>
              </div>

              {/* Alert Box untuk Solusi Bug Google Apps Script */}
              <div className="bg-amber-50 border border-amber-300 p-4.5 rounded-2xl flex gap-3 text-xs text-amber-900 leading-relaxed shadow-xs font-sans">
                <span className="text-base mt-0.5">⚠️</span>
                <div>
                  <p className="font-extrabold text-amber-950 uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                    <span>SOLUSI STATUS AKUN KEMBALI MENUNGGU TINJAUAN (BUG GOOGLE APPS SCRIPT)</span>
                    <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">PENTING!</span>
                  </p>
                  <p className="mt-1">
                    Saat kami memeriksa koneksi, kami mendeteksi sistem Google Sheets Anda mengalami error internal saat memperbarui status (penerimaan/penolakan petugas). Versi lama script Google Sheets Anda memiliki baris kode <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-rose-700">sheet.getCell(...)</code> yang menyebabkan error <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-rose-700">"TypeError: sheet.getCell is not a function"</code> di server. Akibatnya, persetujuan admin gagal disimpan secara permanen di database online.
                  </p>
                  <p className="mt-2 font-bold text-amber-950">
                    Cara memperbaiki masalah ini secara tuntas:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 mt-1 pl-1 font-semibold text-slate-800">
                    <li>Klik tab menu <span className="underline cursor-pointer font-black text-indigo-700 hover:text-indigo-900" onClick={() => setActiveTab('help')}>📖 Panduan 18 Lapangan / Google Apps Script</span>.</li>
                    <li>Masuk ke tab <b>Google Apps Script</b> di kanan atas halaman tersebut dan klik tombol <b>Salin Kode</b>.</li>
                    <li>Buka Spreadsheet Google Sheets Anda &gt; klik menu <b>Ekstensi</b> &gt; <b>Apps Script</b>.</li>
                    <li>Hapus seluruh kode lama yang ada di sana, tempelkan kode baru yang barusan Anda salin, lalu klik <b>Simpan</b> (ikon disket).</li>
                    <li>Klik <b>Terapkan (Deploy)</b> di kanan atas &gt; pilih <b>Penerapan Baru (New Deployment)</b> &gt; pastikan Akses diset ke <b>"Siapa Saja / Anyone"</b>, lalu klik <b>Deploy</b>.</li>
                    <li>Salin URL Web App yang baru dihasilkan dan ganti URL di kode aplikasi Anda jika berubah.</li>
                  </ol>
                  <p className="mt-2 text-[10px] text-amber-800 font-medium font-sans">
                    💡 <i>*Catatan: Segera setelah kode Apps Script baru dipasang di Google Sheets, semua perubahan status dari Admin akan tersimpan selamanya secara instan tanpa kembali menunggu tinjauan.*</i>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-250 text-slate-550 font-black uppercase tracking-wider text-[10px]">
                      <th className="p-4">Identitas Petugas</th>
                      <th className="p-4">Kontak / HP / WhatsApp</th>
                      <th className="p-4 animate-pulse">Kredensial / Sandi</th>
                      <th className="p-4">Wilayah Tugas Administratif</th>
                      <th className="p-4">Status Akun</th>
                      <th className="p-4 text-center">Tindakan Otorisasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {facilitators.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                          Belum ada petugas lapangan terdaftar dalam sistem.
                        </td>
                      </tr>
                    ) : (
                      facilitators.map((fac) => (
                        <tr key={fac.id} className="hover:bg-slate-50/55 transition-colors">
                          <td className="p-4">
                            <p className="font-extrabold text-slate-905">{fac.name}</p>
                            <p className="text-[10px] text-slate-450 font-mono mt-0.5">NIK: {fac.nik}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-slate-800">{fac.phone}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{fac.email}</p>
                          </td>
                          <td className="p-4 font-sans select-none">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 py-1 px-2 rounded-lg max-w-[125px] justify-between shadow-xs">
                              <span className="text-[10px] font-extrabold text-slate-700 tracking-wider font-mono">
                                {visiblePasswords[fac.id] ? (fac.password || '••••••••') : '••••••••'}
                              </span>
                              <button 
                                type="button"
                                onClick={() => setVisiblePasswords(prev => ({ ...prev, [fac.id]: !prev[fac.id] }))}
                                className="text-slate-400 hover:text-indigo-600 font-bold focus:outline-none transition-colors cursor-pointer text-xs p-0.5 mt-0.5 block"
                                title={visiblePasswords[fac.id] ? "Sembunyikan Sandi" : "Tampilkan Sandi"}
                              >
                                {visiblePasswords[fac.id] ? '👁️' : '🙈'}
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="bg-indigo-50 border border-indigo-100 text-indigo-800 text-[9px] font-black px-2 py-0.5 rounded-md self-start">
                                Kec. {fac.regionKecamatan}
                              </span>
                              <span className="text-[10px] text-slate-550 font-semibold pl-1.5 mt-1">
                                📍 Kel. {fac.regionKelurahan}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-sans">
                            {fac.status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-250 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> AKTIF / DISETUJUI
                              </span>
                            ) : fac.status === 'REJECTED' ? (
                              <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-250 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> DITOLAK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-850 border border-amber-250 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full animate-pulse">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span> MENUNGGU TINJAUAN
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center items-center gap-2">
                              {fac.status !== 'APPROVED' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateFacilitatorStatus(fac.id, 'APPROVED')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-1.5 px-3 rounded-lg text-[10px] cursor-pointer transition-colors shadow-xs"
                                >
                                  Terima
                                </button>
                              )}
                              {fac.status !== 'REJECTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateFacilitatorStatus(fac.id, 'REJECTED')}
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-1.5 px-3 rounded-lg text-[10px] cursor-pointer transition-colors shadow-xs"
                                >
                                  Tolak
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setShowDeleteFacilitatorConfirm(fac.id)}
                                className="text-[10px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-extrabold py-1.5 px-2.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                title="Hapus Akun Permanen"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </section>

      </main>
    )}

      {/* FOOTER BAR WITH METADATA AS SPECIFIED */}
      <footer className="h-9 bg-slate-900 border-t border-slate-850 text-slate-450 font-mono text-[10px] flex items-center justify-between px-6 md:px-8 mt-auto shrink-0 select-none uppercase tracking-widest leading-none">
        <div className="flex gap-4">
          <span>Sistem: v1.1.4-STABLE</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Server: Tg-Balai-02</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> System Online</span>
          <span>|</span>
          <span>Dinsos Tanjungbalai</span>
        </div>
      </footer>

      {/* CONFIRMATION OVERLAYS */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-scaleIn font-sans">
            <h4 className="text-sm font-extrabold text-slate-900 uppercase">Hapus Kunjungan Klien?</h4>
            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
              Apakah Anda benar-benar yakin ingin menghapus data kunjungan klien ini? Tindak lanjut ini bersih permanen dari database.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteRecord(showDeleteConfirm)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteFacilitatorConfirm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-scaleIn font-sans">
            <h4 className="text-sm font-extrabold text-slate-900 uppercase">Hapus Akun Petugas?</h4>
            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
              Apakah Anda benar-benar yakin ingin menghapus akun Fasilitator/Petugas Lapangan ini secara permanen dari database? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                onClick={() => setShowDeleteFacilitatorConfirm(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleDeleteFacilitator(showDeleteFacilitatorConfirm);
                  setShowDeleteFacilitatorConfirm(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {showVerifierModal && selectedVerifierRecord && (
        <div id="verifier-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">AUDIT LAPANGAN</span>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Verifikasi Kunjungan Fisik</h4>
              </div>
              <button
                type="button"
                onClick={() => { setShowVerifierModal(false); setSelectedVerifierRecord(null); }}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmVerifierVisit} className="flex flex-col gap-4 mt-4 text-slate-800">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">KLIEN KUNJUNGAN</p>
                <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedVerifierRecord.namaKlien}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Kelurahan {selectedVerifierRecord.kelurahan}, Kecamatan {selectedVerifierRecord.kecamatan}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Nama Pendata Lapangan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap Penjajak"
                    value={verifierNamaPendata}
                    onChange={(e) => setVerifierNamaPendata(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600 font-sans"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Tanggal Pemeriksaan Fisik *</label>
                  <input
                    type="text"
                    required
                    placeholder="Hari, Tanggal Bulan Tahun"
                    value={verifierDate}
                    onChange={(e) => setVerifierDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600 font-sans"
                  />
                </div>
              </div>

              {/* ⚙️ PENGATURAN RESOLUSI & STORAGE IMPACT */}
              <div id="camera-upload-settings" className="border border-slate-200/80 p-3.5 rounded-2xl bg-slate-50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">⚙️</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Konfigurasi Kamera &amp; Unggah</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                    Mode Aktif: {photoResolutionMode === 'high' ? 'HD' : 'Standard'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => changePhotoResolutionMode('standard')}
                    className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 text-left transition-all cursor-pointer ${
                      photoResolutionMode === 'standard'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-650'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      <span className="text-xs font-bold font-sans">Kualitas Standar</span>
                    </div>
                    <span className="text-[9px] font-normal leading-normal text-slate-500">
                      Resolusi 480px, Sangat Ringan (~28 KB/foto). Hemat kuota daerah minim sinyal.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => changePhotoResolutionMode('high')}
                    className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 text-left transition-all cursor-pointer ${
                      photoResolutionMode === 'high'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-655'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-bold font-sans">Klaritas Tinggi (HD)</span>
                    </div>
                    <span className="text-[9px] font-normal leading-normal text-slate-500">
                      Resolusi 960px, Super Tajam (~115 KB/foto). Teks KTP/KK terpantau jernih.
                    </span>
                  </button>
                </div>

                {/* STORAGE IMPACT INDICATOR BAR */}
                <div className="pt-2 border-t border-slate-150/50">
                  <div className="flex justify-between text-[9px] text-slate-500 font-semibold mb-1">
                    <span>Estimasi Beban Penyimpanan (Storage Impact):</span>
                    <span className={photoResolutionMode === 'high' ? 'text-amber-600 font-black' : 'text-emerald-600 font-black'}>
                      {photoResolutionMode === 'high' ? 'Sedang-Tinggi (~115 KB)' : 'Sangat Rendah (~28 KB)'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        photoResolutionMode === 'high' ? 'w-[75%] bg-amber-500' : 'w-[20%] bg-emerald-500'
                      }`}
                    ></div>
                  </div>
                  <p className="text-[8px] text-slate-450 italic mt-1 leading-normal">
                    * Sistem memproses gambar melalui canvas lokal pada browser perangkat petugas sebelum pengiriman database demi efisiensi tinggi.
                  </p>
                </div>
              </div>

              {/* KK/KTP Dokumen Section */}
              <div className="border border-slate-150 p-3 rounded-2xl bg-slate-50/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-650 uppercase tracking-wider block">📷 Ambil &amp; Upload Foto KK / KTP (Wajib) *</span>
                  {verifierFotoKkKtp && (
                    <button 
                      type="button" 
                      onClick={() => setVerifierFotoKkKtp('')} 
                      className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                
                {verifierFotoKkKtp ? (
                  <div className="relative h-28 rounded-xl overflow-hidden border border-slate-300">
                    <img src={memoizedVerifierFotoKkKtp} className="w-full h-full object-cover" alt="KK/KTP Preview" />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 p-1.5 text-center text-[10px] text-white font-bold leading-none">
                      Preview Berkas KK/KTP Siap Simpan
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Live Camera Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTargetName('Foto Kartu Keluarga / KTP');
                        setOnPhotoCapture(() => setVerifierFotoKkKtp);
                        setCameraModalOpen(true);
                        startLiveCamera(cameraFacingMode);
                      }}
                      className="h-14 border border-dashed border-emerald-300 rounded-xl flex flex-col items-center justify-center bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer text-emerald-800 text-[10px] font-medium animate-pulse"
                    >
                      <Camera className="w-4 h-4 mb-0.5 text-emerald-600" />
                      <span className="font-bold">Ambil &amp; Geotag (Live)</span>
                    </button>

                    {/* File Upload Option */}
                    <label className="h-14 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-white hover:bg-slate-100 transition-colors cursor-pointer text-slate-650 text-[10px] font-medium text-center">
                      <Upload className="w-4 h-4 mb-0.5 text-slate-450" />
                      <span>Upload &amp; Kompres</span>
                      <input
                        type="file"
                        accept="image/*"
                        required={!verifierFotoKkKtp}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUploadHelper(file, setVerifierFotoKkKtp);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Foto Depan Rumah Section */}
              <div className="border border-slate-150 p-3 rounded-2xl bg-slate-50/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-655 uppercase tracking-wider block">🏠 Ambil &amp; Upload Foto Depan RUMAH (Wajib) *</span>
                  {verifierFotoDepanRumah && (
                    <button 
                      type="button" 
                      onClick={() => setVerifierFotoDepanRumah('')} 
                      className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                
                {verifierFotoDepanRumah ? (
                  <div className="relative h-28 rounded-xl overflow-hidden border border-slate-300">
                    <img src={memoizedVerifierFotoDepanRumah} className="w-full h-full object-cover" alt="Foto Depan Rumah Preview" />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 p-1.5 text-center text-[10px] text-white font-bold leading-none">
                      Preview Depan Rumah Siap Simpan
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Live Camera Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTargetName('Foto Depan Rumah Utama');
                        setOnPhotoCapture(() => setVerifierFotoDepanRumah);
                        setCameraModalOpen(true);
                        startLiveCamera(cameraFacingMode);
                      }}
                      className="h-14 border border-dashed border-emerald-300 rounded-xl flex flex-col items-center justify-center bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer text-emerald-800 text-[10px] font-medium animate-pulse"
                    >
                      <Camera className="w-4 h-4 mb-0.5 text-emerald-600" />
                      <span className="font-bold">Ambil &amp; Geotag (Live)</span>
                    </button>

                    {/* File Upload Option */}
                    <label className="h-14 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-white hover:bg-slate-100 transition-colors cursor-pointer text-slate-650 text-[10px] font-medium text-center">
                      <Upload className="w-4 h-4 mb-0.5 text-slate-450" />
                      <span>Upload &amp; Kompres</span>
                      <input
                        type="file"
                        accept="image/*"
                        required={!verifierFotoDepanRumah}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUploadHelper(file, setVerifierFotoDepanRumah);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Foto Kontrol Lapangan Section */}
              <div className="border border-slate-150 p-3 rounded-2xl bg-slate-50/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-650 uppercase tracking-wider block">📷 Ambil &amp; Upload Foto Kontrol Kunjungan (Opsional)</span>
                  {verifierPhoto && (
                    <button 
                      type="button" 
                      onClick={() => setVerifierPhoto('')} 
                      className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                
                {verifierPhoto ? (
                   <div className="relative h-28 rounded-xl overflow-hidden border border-slate-300">
                     <img src={memoizedVerifierPhoto} className="w-full h-full object-cover" alt="Foto Kontrol Lapangan Preview" />
                     <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 p-1.5 text-center text-[10px] text-white font-bold leading-none">
                       Preview Kontrol Kunjungan Siap Simpan
                     </div>
                   </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Live Camera Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTargetName('Foto Kontrol Lapangan');
                        setOnPhotoCapture(() => setVerifierPhoto);
                        setCameraModalOpen(true);
                        startLiveCamera(cameraFacingMode);
                      }}
                      className="h-14 border border-dashed border-emerald-300 rounded-xl flex flex-col items-center justify-center bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer text-emerald-800 text-[10px] font-medium animate-pulse"
                    >
                      <Camera className="w-4 h-4 mb-0.5 text-emerald-600" />
                      <span className="font-bold">Ambil &amp; Geotag (Live)</span>
                    </button>

                    {/* File Upload Option */}
                    <label className="h-14 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-white hover:bg-slate-100 transition-colors cursor-pointer text-slate-650 text-[10px] font-medium text-center">
                      <Upload className="w-4 h-4 mb-0.5 text-slate-450" />
                      <span>Upload &amp; Kompres</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUploadHelper(file, setVerifierPhoto);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                <div className="mt-2 pt-1 border-t border-slate-150/40">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight block mb-1">Rujukan Cepat / Pilihan Preset Lapangan:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'img1', url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=400', label: 'Studi Poverty' },
                      { id: 'img2', url: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=400', label: 'Arsip Dokumen' },
                      { id: 'img3', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400', label: 'Dinding Papan' },
                      { id: 'img4', url: 'https://images.unsplash.com/photo-1516880711640-ef7db81be3e1?auto=format&fit=crop&q=80&w=400', label: 'Rumah Sederhana' }
                    ].map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setVerifierPhoto(img.url)}
                        className={`relative overflow-hidden h-10 rounded-lg border-2 transition-all cursor-pointer ${
                          verifierPhoto === img.url ? 'border-emerald-650 shadow-md scale-102' : 'border-slate-150 hover:border-slate-300'
                        }`}
                      >
                        <img src={img.url} className="w-full h-full object-cover" alt={img.label} referrerPolicy="no-referrer" />
                        {verifierPhoto === img.url && (
                          <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center text-white text-[10px] font-bold font-sans">
                            ✓
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[9px] text-slate-445 italic mt-1 leading-normal font-sans">
                  * Gambar di atas mewakili rujukan audit ops geospasial opsional oleh Dinsos Kota Tanjungbalai atau hasil pengambilan lapangan.
                </p>
              </div>

              {/* Real-time Surveyor Geolocation Coordinates HUD */}
              <div className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1.5 font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                    TELEMETRI GEOLOKASI (KUNJUNGAN FISIK LAPANGAN)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[8.5px] bg-emerald-500/15 text-emerald-400 font-black px-2 py-0.5 rounded-md border border-emerald-500/30 uppercase tracking-wider animate-pulse flex items-center gap-1">
                      📡 Auto-GPS Aktif
                    </span>
                    <button 
                      type="button"
                      onClick={async () => {
                        const geo = await getGeotagCoordinates();
                        setVerifierLat(geo.latitude);
                        setVerifierLng(geo.longitude);
                      }}
                      className="text-[9px] text-sky-400 hover:text-sky-300 font-extrabold hover:underline font-sans cursor-pointer uppercase tracking-tight"
                    >
                      Segarkan GPS
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[8px] text-slate-450 block uppercase tracking-wider font-sans mb-0.5">📍 Latitude Fisik</span>
                    <span className="text-white font-bold text-xs tracking-wider">{verifierLat !== null ? verifierLat.toFixed(6) : 'Mencari...'}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[8px] text-slate-450 block uppercase tracking-wider font-sans mb-0.5">🌐 Longitude Fisik</span>
                    <span className="text-white font-bold text-xs tracking-wider">{verifierLng !== null ? verifierLng.toFixed(6) : 'Mencari...'}</span>
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 leading-normal italic font-sans">
                  💡 <b>Fisik vs KK:</b> Koordinat ini diambil presisi saat pengambilan gambar / upload dokumen langsung di lokasi rumah warga. Hal ini memastikan posisi rumah diidentifikasi secara akurat meskipun berbeda dari alamat KTP/Kartu Keluarga.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Catatan Kualifikasi &amp; Field Report *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tulis uraian kondisi fisik rumah, kelayakan, serta persetujuan ke DTKS..."
                  value={verifierNotes}
                  onChange={(e) => setVerifierNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600 resize-none font-sans leading-relaxed"
                />
                
                {/* Quick notes chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "Kondisi rumah sesuai instrumen kualifikasi kemiskinan (lantai kayu, dinding papan lapuk).",
                    "Klien lansia sebatang kara dan sangat layak mendapat rujukan Bantuan Sosial DTKS.",
                    "Validasi geospasial cocok, beralas tanah liat tanpa fasilitas sanitasi higienis."
                  ].map((chipValue, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setVerifierNotes(chipValue)}
                      className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-650 px-2 py-1 rounded-lg text-left transition-colors font-sans truncate max-w-full font-bold cursor-pointer"
                    >
                      💡 Chip {index + 1}: {chipValue.substring(0, 35)}...
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-150 shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowVerifierModal(false); setSelectedVerifierRecord(null); }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-bold transition-all cursor-pointer uppercase tracking-tight"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shadow-md"
                >
                  📝 Simpan &amp; Verifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📷 MODAL KAMERA GEOTAGGING REAL-TIME */}
      {cameraModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-5 text-white animate-scaleIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">LIVE INSTANT CAM</span>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">{cameraTargetName || 'Ambil Dokumentasi'}</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopLiveCamera();
                  setCameraModalOpen(false);
                }}
                className="text-slate-400 hover:text-white font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Video preview container */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              {cameraError ? (
                <div className="p-4 text-center space-y-3">
                  <p className="text-xs text-rose-400 font-semibold">{cameraError}</p>
                  <p className="text-[10px] text-slate-400">
                    Sistem akan mengizinkan Anda mengambil foto dari rol kamera atau berkas lokal perangkat.
                  </p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Camera overlays for visual alignment */}
                  <div className="absolute inset-4 border border-white/20 pointer-events-none rounded-xl"></div>
                  <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-white/10 pointer-events-none"></div>
                  <div className="absolute left-1/2 top-4 bottom-4 w-[1px] bg-white/10 pointer-events-none"></div>
                  <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[8px] font-bold py-0.5 px-1.5 rounded animate-pulse">
                    LIVE STREAMING
                  </span>
                </>
              )}
            </div>

            {/* Live resolution selection in camera modal */}
            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">RESOLUSI BIDIK:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => changePhotoResolutionMode('standard')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
                    photoResolutionMode === 'standard'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-400'
                  }`}
                >
                  Standard (~28KB)
                </button>
                <button
                  type="button"
                  onClick={() => changePhotoResolutionMode('high')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
                    photoResolutionMode === 'high'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-400'
                  }`}
                >
                  HD (~115KB)
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3">
              {!cameraError && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={switchFacingMode}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    🔄 Ganti Kamera ({cameraFacingMode === 'user' ? 'Depan' : 'Belakang'})
                  </button>
                  <button
                    type="button"
                    onClick={captureLivePhoto}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide shadow-md"
                  >
                    📸 Ambil Foto
                  </button>
                </div>
              )}

              {/* Native camera capture or upload fallback */}
              <div className="pt-2 border-t border-slate-850 flex flex-col items-center gap-2">
                <p className="text-[10px] text-slate-400 text-center leading-normal">
                  Jika kamera video tidak terbuka (masalah browser/iframe), gunakan kamera bawaan HP (Native) di bawah:
                </p>
                <label className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                  📱 Buka Kamera Bawaan HP / Gambar
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onPhotoCapture) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === 'string') {
                            const rawResult = reader.result;
                            stopLiveCamera();
                            setCameraModalOpen(false);
                            // Process Geotag and compress
                            processGeotagAndCompression(rawResult, true, onPhotoCapture);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BACKGROUND AUTO-SYNC TOAST NOTIFICATION */}
      {backgroundSyncStatus !== 'idle' && (
        <div className="fixed bottom-12 right-6 bg-slate-900 border border-slate-800 text-white p-3.5 rounded-2xl shadow-2xl z-50 flex items-center gap-3 font-sans max-w-sm transition-all duration-350 transform scale-100 animate-slideUp">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
            {backgroundSyncStatus === 'syncing' && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
            {backgroundSyncStatus === 'success' && (
              <span className="text-white text-xs font-bold font-sans">✓</span>
            )}
            {backgroundSyncStatus === 'error' && (
              <span className="text-red-300 text-xs font-bold font-sans">✕</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-[10px] font-black tracking-wider uppercase text-slate-400 leading-none">Sinkronisasi Database Cloud</h5>
            <p className="text-[11px] font-bold text-slate-100 mt-1 leading-tight truncate">
              {backgroundSyncStatus === 'syncing' && `Mengirim data "${syncingTargetName}" ke Google Sheets...`}
              {backgroundSyncStatus === 'success' && `Data "${syncingTargetName}" tersimpan otomatis!`}
              {backgroundSyncStatus === 'error' && `Koneksi Google Sheets terputus!`}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
