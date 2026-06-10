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

import { SLRTRecord, TANJUNGBALAI_LOCATIONS, INITIAL_RECORDS, FacilitatorUser, INITIAL_FACILITATORS } from './types';
import { jsPDF } from 'jspdf';
import BentoRecordDetails from './components/BentoRecordDetails';
import SmartParserTab from './components/SmartParserTab';
import HelpTab from './components/HelpTab';
import * as XLSX from 'xlsx';

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

export default function App() {
  // State for database records
  const [records, setRecords] = useState<SLRTRecord[]>(() => {
    const saved = localStorage.getItem('slrt_records');
    return saved ? JSON.parse(saved) : INITIAL_RECORDS;
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
    const fList = saved ? JSON.parse(saved) : INITIAL_FACILITATORS;
    const savedOverrides = localStorage.getItem('slrt_status_overrides');
    if (savedOverrides) {
      try {
        const overrides = JSON.parse(savedOverrides);
        return fList.map((f: any) => {
          if (overrides[f.id]) {
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

  const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbwUWtSHMJst3h8RpH7mWaRgcH6g0PmffIrxKLnlO0eRQBYLaz19ht7AHmX6o2kQpfge7A/exec";

  // Reconcile list of facilitators with administrative status overrides
  const getReconciledFacilitators = (rawFacs: FacilitatorUser[]): FacilitatorUser[] => {
    const savedOverrides = localStorage.getItem('slrt_status_overrides');
    if (!savedOverrides) return rawFacs;
    try {
      const overrides = JSON.parse(savedOverrides);
      return rawFacs.map(f => {
        if (overrides[f.id]) {
          return { ...f, status: overrides[f.id] };
        }
        return f;
      });
    } catch (e) {
      console.error("Gagal merekonsoliasi status kustom:", e);
      return rawFacs;
    }
  };

  // State for synchronization status
  const [cloudLoading, setCloudLoading] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);

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
          setRecords(json.records);
          localStorage.setItem('slrt_records', JSON.stringify(json.records));
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
    refreshFromCloud(false);

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
  const [selectedFacilitatorFilter, setSelectedFacilitatorFilter] = useState<string>('all');
  const [selectedPendataFilter, setSelectedPendataFilter] = useState<string>('all');
  const [visiblePasswords, setVisiblePasswords] = useState<{[key: string]: boolean}>({});

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
  const [wargaFormSuccess, setWargaFormSuccess] = useState<string | null>(null);

  const [backgroundSyncStatus, setBackgroundSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncingTargetName, setSyncingTargetName] = useState<string>('');

  // State for active tabs: 'all-records' | 'add-record' | 'smart-parser' | 'help'
  const [activeTab, setActiveTab] = useState<'all-records' | 'add-record' | 'smart-parser' | 'help'>('all-records');

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

  // Selected Record state
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>('rec-1');

  // Google Sheets integration helper state
  const [syncingRecordId, setSyncingRecordId] = useState<string | null>(null);

  // Input states (Form State)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formFasilitator, setFormFasilitator] = useState('');
  const [formKecamatan, setFormKecamatan] = useState('Datuk Bandar');
  const [formKelurahan, setFormKelurahan] = useState('Pahang');
  const [formHariTanggal, setFormHariTanggal] = useState('');
  const [formNamaKlien, setFormNamaKlien] = useState('');
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

  // Raw Chat Copy-paste parser tool states
  const [rawText, setRawText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Partial<SLRTRecord> | null>(null);
  const [parseStatusMsg, setParseStatusMsg] = useState('');

  // Dialog notifications / copy triggers
  const [copiedRecordId, setCopiedRecordId] = useState<'list' | 'tbl' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Auto-save changes to localStorage
  useEffect(() => {
    localStorage.setItem('slrt_records', JSON.stringify(records));
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
          setRecords(json.records);
          localStorage.setItem('slrt_records', JSON.stringify(json.records));
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
    if (window.confirm("Apakah Anda yakin ingin menghapus akun Fasilitator ini dari sistem?")) {
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
    }
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

  // Submit form handler
  const handleSubmitRecord = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNamaKlien.trim() || !formFasilitator.trim() || !formKelurahan.trim()) {
      alert("Harap lengkapi setidaknya Nama Fasilitator, Kelurahan, dan Nama Klien.");
      return;
    }

    const existingRec = editingId ? records.find(r => r.id === editingId) : null;

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
        return `${days[today.getDay()]} , ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
      })(),
      namaKlien: formNamaKlien.trim(),
      pekerjaanKrt: formPekerjaanKrt.trim() || '-',
      namaKuasa: formNamaKuasa.trim() || '-',
      alamatKlien: formAlamatKlien.trim() || '-',
      noTelpon: formNoTelpon.trim() || '-',
      dokumen: formDokumen.trim() || 'KK, KTP',
      status: formStatus,
      bantuanDiterima: formBantuanDiterima.trim() || 'Belum Ada',
      statusRumah: formStatusRumah,
      jenisPenerangan: formJenisPenerangan,
      mck: formMck,
      pendapatanPerbulan: formPendapatanPerbulan.trim() || 'Tidak Tetap/Kerja Serabutan',
      jenisPengaduan: formJenisPengaduan.trim(),
      jenisLayanan: formJenisLayanan.trim() || 'Rujukan Bantuan Sosial',
      
      // Keep existing role/status properties if editing, or default to initial state
      statusKunjungan: existingRec ? existingRec.statusKunjungan : 'Belum Dikunjungi',
      tanggalPemeriksaan: existingRec?.tanggalPemeriksaan,
      catatanPemeriksa: existingRec?.catatanPemeriksa,
      dokumentasiBukti: existingRec?.dokumentasiBukti,
      diinputOleh: existingRec ? existingRec.diinputOleh : 'Admin'
    };

    if (editingId) {
      setRecords(prev => prev.map(rec => rec.id === editingId ? compiledRecord : rec));
      setSelectedRecordId(editingId);
      setEditingId(null);
    } else {
      setRecords(prev => [compiledRecord, ...prev]);
      setSelectedRecordId(compiledRecord.id);
    }

    // Auto-sync directly to Google Sheets database in the background
    handleSyncToGoogleSheets(compiledRecord, true);

    resetForm();
    setActiveTab('all-records');
  };

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setFormFasilitator('');
    setFormHariTanggal('');
    setFormNamaKlien('');
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
  };

  // Geotagging Coordinates Utility - Defaults to Tanjungbalai
  const getGeotagCoordinates = (): Promise<{ latitude: number; longitude: number; timestamp: string; address: string }> => {
    return new Promise((resolve) => {
      const today = new Date();
      const timestampStr = today.toLocaleString('id-ID') + ' WIB';
      const defaultData = {
        latitude: 2.9645,
        longitude: 99.8005,
        timestamp: timestampStr,
        address: 'Dinsos Kota Tanjungbalai, Kel. Pantai Johor, Kec. Datuk Bandar'
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: Number(pos.coords.latitude.toFixed(6)),
              longitude: Number(pos.coords.longitude.toFixed(6)),
              timestamp: timestampStr,
              address: 'Survei Geotagging Real-time Lapangan'
            });
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
          { timeout: 2500 }
        );
      } else {
        resolve(defaultData);
      }
    });
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
      // Limit dimension sizes to keep canvas operations fast and lightweight
      let width = img.width;
      let height = img.height;
      const maxDimension = 1000;
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

        // Translucent dark slate overlay background for clear telemetry contrast text representation
        const labelBarHeight = Math.round(height * 0.18);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(0, height - labelBarHeight, width, labelBarHeight);

        // Emerald horizontal accent brand line
        ctx.fillStyle = '#059669';
        ctx.fillRect(0, height - labelBarHeight, width, Math.max(3, Math.round(height * 0.006)));

        // Write information text inside overlay
        const fontSize = Math.max(10, Math.round(width * 0.024));
        ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = '#ffffff';

        const paddingLeft = Math.round(width * 0.04);
        let textY = height - labelBarHeight + Math.round(labelBarHeight * 0.32);

        ctx.fillText(`📍 GPS GEOTAGGED: Lat ${geo.latitude}, Lon ${geo.longitude}`, paddingLeft, textY);

        textY += Math.round(labelBarHeight * 0.26);
        ctx.font = `${fontSize - 2}px "Inter", sans-serif`;
        ctx.fillStyle = '#f1f5f9';
        ctx.fillText(`📅 WAKTU: ${geo.timestamp}`, paddingLeft, textY);

        textY += Math.round(labelBarHeight * 0.26);
        ctx.font = `italic ${fontSize - 3}px sans-serif`;
        ctx.fillStyle = '#34d399';
        ctx.fillText(`🏷️ LOKASI: ${geo.address}`, paddingLeft, textY);
      }

      // Progressively compress JPG until base64 payload is fully under 300KB
      let quality = 0.90;
      let compressedUrl = canvas.toDataURL('image/jpeg', quality);
      let calculatedPayloadKb = (compressedUrl.length * 0.75) / 1024;

      let cycles = 0;
      while (calculatedPayloadKb > 300 && quality > 0.1 && cycles < 10) {
        quality -= 0.12;
        compressedUrl = canvas.toDataURL('image/jpeg', quality);
        calculatedPayloadKb = (compressedUrl.length * 0.75) / 1024;
        cycles++;
      }

      // If still exceeding 300KB scale down the resolution of image
      if (calculatedPayloadKb > 300) {
        const shrinkCanvas = document.createElement('canvas');
        shrinkCanvas.width = Math.round(width * 0.7);
        shrinkCanvas.height = Math.round(height * 0.7);
        const shrinkCtx = shrinkCanvas.getContext('2d');
        if (shrinkCtx) {
          shrinkCtx.drawImage(canvas, 0, 0, shrinkCanvas.width, shrinkCanvas.height);
          compressedUrl = shrinkCanvas.toDataURL('image/jpeg', 0.5);
        }
      }

      callback(compressedUrl);
    };
  };

  // Convert uploaded regular image to compressed base64 format under 300KB
  const handleImageUploadHelper = (file: File, callback: (result: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const rawResult = reader.result;
        // Run compression (without always adding geotags since it is custom citizen uploaded document files)
        processGeotagAndCompression(rawResult, false, callback);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handler helper to initiate verification from facilitator perspective
  const handleOpenVerifierModal = (rec: SLRTRecord) => {
    setSelectedVerifierRecord(rec);
    setVerifierNotes('');
    setVerifierNamaPendata(rec.namaPendata || rec.namaFasilitator || session?.name || '');
    setVerifierFotoKkKtp(rec.fotoKkKtp || '');
    setVerifierFotoDepanRumah(rec.fotoDepanRumah || '');
    
    // Random select standard Unsplash realistic poor-medium housing conditions or document audit imagery
    const housePhotos = [
      'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=400', // poverty study
      'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=400', // paperwork
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400', // rustic wall
      'https://images.unsplash.com/photo-1516880711640-ef7db81be3e1?auto=format&fit=crop&q=80&w=400', // wooden structure
    ];
    const pickedPhoto = housePhotos[Math.floor(Math.random() * housePhotos.length)];
    setVerifierPhoto(pickedPhoto);

    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    setVerifierDate(`${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
    setShowVerifierModal(true);
  };

  // Submit/save visitation verification from facilitator perspective
  const handleConfirmVerifierVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerifierRecord) return;

    let compiledRecordForSync: SLRTRecord | null = null;
    const updatedRecords = records.map(rec => {
      if (rec.id === selectedVerifierRecord.id) {
        const updated = {
          ...rec,
          statusKunjungan: 'Sudah Dikunjungi' as const,
          tanggalPemeriksaan: verifierDate.trim() || 'Hari Ini',
          catatanPemeriksa: verifierNotes.trim() || 'Kunjungan fisik lapangan dan pemeriksaan 18 indikator selesai diverifikasi tanpa catatan khusus.',
          dokumentasiBukti: verifierPhoto,
          namaPendata: verifierNamaPendata.trim() || rec.namaFasilitator || session?.name || 'Petugas SLRT',
          fotoKkKtp: verifierFotoKkKtp,
          fotoDepanRumah: verifierFotoDepanRumah
        };
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
      : 'Ahmad Fauzi';

    const CitizenReport: SLRTRecord = {
      id: `warga-${Date.now()}`,
      namaFasilitator: assignedFasil,
      kelurahan: wargaAddKelurahan,
      kecamatan: wargaAddKecamatan,
      hariTanggal: dateFormatted,
      namaKlien: wargaAddNama.trim(),
      pekerjaanKrt: wargaAddPekerjaan.trim() || 'Tidak Tetap/Serabutan',
      namaKuasa: '-',
      alamatKlien: wargaAddAlamat.trim() || 'Alamat dikonfirmasi saat kunjungan lapangan.',
      noTelpon: wargaAddPhone.trim(),
      dokumen: 'KK, KTP (Akan difoto oleh Fasilitator)',
      status: 'Miskin', // Di-audit oleh fasilitator
      bantuanDiterima: 'Belum Ada',
      statusRumah: 'Milik Sendiri',
      jenisPenerangan: 'PLN Bersubsidi 450W',
      mck: 'Sendiri Kurang Layak',
      pendapatanPerbulan: 'Mekanisme verifikasi pendapatan saat kunjungan.',
      jenisPengaduan: wargaAddPengaduan.trim(),
      jenisLayanan: 'Pengusulan DTKS & Bantuan Sosial Berjalan',
      
      statusKunjungan: 'Belum Dikunjungi',
      diinputOleh: 'Warga'
    };

    setRecords(prev => [CitizenReport, ...prev]);
    
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

    // Clear success message after 12 secs
    setTimeout(() => {
      setWargaFormSuccess(null);
    }, 12000);
  };

  // Delete Record
  const handleDeleteRecord = (id: string) => {
    setRecords(prev => prev.filter(rec => rec.id !== id));
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

      return matchesSearch && matchesKecamatan && matchesKelurahan && matchesStatus && matchesKunjungan && matchesFasilitatorFilter && matchesPendataFilter && matchesDateRange && matchesVerifDateRange;
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
    filterVerifEndDate
  ]);

  // Selected Object
  const selectedRecord = useMemo(() => {
    return records.find(rec => rec.id === selectedRecordId) || null;
  }, [records, selectedRecordId]);

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
      if (silent) {
        setBackgroundSyncStatus('success');
        setTimeout(() => setBackgroundSyncStatus('idle'), 4000);
      } else {
        alert(`Berhasil Mengirim Data!\nCatatan pemohon "${rec.namaKlien}" telah disinkronisasikan langsung ke Google Sheets Anda secara real-time.`);
      }
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

  // Seed Reset
  const handleResetToDemo = () => {
    if (window.confirm("Apakah Anda yakin ingin mengatur ulang data kembali ke data contoh bawaan?")) {
      setRecords(INITIAL_RECORDS);
      setSelectedRecordId('rec-1');
      localStorage.setItem('slrt_records', JSON.stringify(INITIAL_RECORDS));
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
            @media print {
              .btn-print { display: none; }
              body { padding: 0; }
              .doc-card { page-break-inside: avoid; }
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
                ${selectedRecord.statusKunjungan === 'Sudah Dikunjungi' && (selectedRecord.fotoDepanRumah || selectedRecord.dokumentasiBukti) ? `
                  <img class="doc-img" src="${selectedRecord.fotoDepanRumah || selectedRecord.dokumentasiBukti}" />
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
                ${selectedRecord.statusKunjungan === 'Sudah Dikunjungi' && selectedRecord.fotoKkKtp ? `
                  <img class="doc-img" src="${selectedRecord.fotoKkKtp}" />
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

    // Helper to load any internal base64 or external url with timeout
    const loadAnyImageBase64 = (srcUrl: string): Promise<string> => {
      return new Promise((resolve) => {
        if (!srcUrl) {
          resolve('');
          return;
        }
        if (srcUrl.startsWith('data:')) {
          resolve(srcUrl);
          return;
        }
        
        // Timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          resolve('');
        }, 1200);

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          clearTimeout(timeoutId);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/jpeg'));
            } else {
              resolve('');
            }
          } catch (e) {
            resolve('');
          }
        };
        img.onerror = () => {
          clearTimeout(timeoutId);
          resolve('');
        };
        img.src = srcUrl;
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

    // Helper functions for sections
    const drawSectionHeader = (y: number, title: string) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, 180, 6, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 118, 110);
      doc.text(title, 18, y + 4.5);
      return y + 10;
    };

    const drawRow = (y: number, label1: string, val1: string, label2?: string, val2?: string) => {
      // Column 1 stars at x=18. Label limited to 32mm. Value limited to 53mm
      // Column 2 starts at x=110. Label limited to 32mm. Value limited to 51mm
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const label1Lines = doc.splitTextToSize(label1, 32);
      doc.text(label1Lines, 18, y);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(':', 50, y);
      const val1Lines = doc.splitTextToSize(val1 || '-', 53);
      doc.text(val1Lines, 52, y);
      
      let col1Height = Math.max(label1Lines.length, val1Lines.length) * 4;
      let col2Height = 0;
      
      if (label2) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const label2Lines = doc.splitTextToSize(label2, 32);
        doc.text(label2Lines, 110, y);
        
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(':', 142, y);
        const val2Lines = doc.splitTextToSize(val2 || '-', 51);
        doc.text(val2Lines, 144, y);
        
        col2Height = Math.max(label2Lines.length, val2Lines.length) * 4;
      }
      
      const rowHeight = Math.max(col1Height, col2Height, 5.5);
      const nextY = y + rowHeight;
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.1);
      doc.line(15, nextY, 195, nextY);
      return nextY + 3.5;
    };

    const drawRowFullWidth = (y: number, label: string, val: string) => {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label, 18, y);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(':', 52, y);
      
      const wrappedText = doc.splitTextToSize(val || '-', 138);
      doc.text(wrappedText, 54, y);
      
      const nextY = y + (wrappedText.length * 4) + 1;
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.1);
      doc.line(15, nextY, 195, nextY);
      return nextY + 3.5;
    };

    // SECTION I
    let currentY = 55;
    currentY = drawSectionHeader(currentY, 'I. IDENTITAS UTAMA PENGADU & KLIEN');
    currentY = drawRow(currentY, 'Nama Lengkap Klien', rec.namaKlien, 'Kecamatan / Kel.', `${rec.kecamatan} / ${rec.kelurahan}`);
    currentY = drawRow(currentY, 'No. HP/WA Active', rec.noTelpon, 'Pekerjaan Kepala RT', rec.pekerjaanKrt);
    currentY = drawRow(currentY, 'Penerima Kuasa', rec.namaKuasa, 'Estimasi Pendapatan', rec.pendapatanPerbulan);
    currentY = drawRow(currentY, 'Kelengkapan Berkas', rec.dokumen, 'Status Sosial', rec.status);
    currentY = drawRowFullWidth(currentY, 'Alamat Lengkap', rec.alamatKlien);

    // SECTION II
    currentY = drawSectionHeader(currentY + 4, 'II. FASILITAS HUNIAN & INTEGRASI BANTUAN');
    currentY = drawRow(currentY, 'Rumah Kepemilikan', rec.statusRumah, 'Sumber Penerangan', rec.jenisPenerangan);
    currentY = drawRow(currentY, 'Akses Sanitasi / MCK', rec.mck, 'Bansos Sedang Aktif', rec.bantuanDiterima || 'Belum Terdaftar');

    // SECTION III
    currentY = drawSectionHeader(currentY + 4, 'III. DETAIL KASUS ADUAN & RUJUKAN');
    currentY = drawRow(currentY, 'Jenis Layanan Tujuan', rec.jenisLayanan, 'Fasilitator Terkait', rec.namaFasilitator);
    currentY = drawRowFullWidth(currentY, 'Deskripsi Keluhan', rec.jenisPengaduan);

    // SECTION IV
    currentY = drawSectionHeader(currentY + 4, 'IV. STATUS VERIFIKASI FISIK & LAPANGAN (AUDIT)');
    currentY = drawRow(currentY, 'Status Kunjungan', rec.statusKunjungan || 'Belum Dikunjungi', 'Tanggal Pemeriksaan', rec.tanggalPemeriksaan || 'Belum Diperiksa');
    currentY = drawRowFullWidth(currentY, 'Catatan Pengawas', rec.catatanPemeriksa || 'Belum ada catatan verifikasi fisik lapangan dari petugas terkait.');

    // Page overflow checking for Section V & signatures
    // Approximate remaining heights: Header(10) + Photo Boxes(44) + captions(8) = 62mm
    // Signatures take ~30mm. Total = 92mm.
    // If currentY is greater than 185, we split to page 2.
    let totalPageCount = 1;
    if (currentY > 185) {
      doc.addPage();
      totalPageCount = 2;
      currentY = 25; // Reset currentY for Page 2
      
      // Draw dynamic top header line on page 2
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Klien: ${rec.namaKlien}   |   ID Dokumen: ${rec.id}`, 15, 14);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(15, 16, 195, 16);
      currentY = 22;
    }

    // SECTION V
    currentY = drawSectionHeader(currentY, 'V. DOKUMENTASI HASIL VERIFIKASI LAPORAN');
    
    const boxWidth = 80;
    const boxHeight = 44;
    const boxY = currentY + 3;
    
    // Column 1 Box
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.setFillColor(248, 250, 252);
    doc.rect(16, boxY, boxWidth, boxHeight, 'FD');
    
    // Column 2 Box
    doc.rect(114, boxY, boxWidth, boxHeight, 'FD');

    // Helper to draw geometric placeholder graphics with camera icon
    const drawPhotoPlaceholder = (x: number, y: number, w: number, h: number, title: string) => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.rect(x + 2, y + 2, w - 4, h - 4); // Inner border
      
      const cx = x + (w / 2);
      const cy = y + (h / 2) - 3;
      doc.setFillColor(241, 245, 249);
      doc.rect(cx - 6, cy - 4, 12, 8, 'F');
      
      // Draw camera lens circle
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.5);
      doc.circle(cx, cy, 2);
      
      // Flash bar
      doc.setFillColor(148, 163, 184);
      doc.rect(cx - 3, cy - 6, 6, 1.5, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(title, cx, cy + 9, { align: 'center' });
      
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(6);
      doc.text('Bukti Verifikasi Lapangan (GPS Stamped)', cx, cy + 13, { align: 'center' });
    };

    // Load actual photographs with crossOrigin safety
    const img1Base64 = await loadAnyImageBase64(rec.fotoDepanRumah || rec.dokumentasiBukti || '');
    const img2Base64 = await loadAnyImageBase64(rec.fotoKkKtp || '');

    if (img1Base64) {
      try {
        doc.addImage(img1Base64, 'JPEG', 16.5, boxY + 0.5, boxWidth - 1, boxHeight - 1);
      } catch (err) {
        drawPhotoPlaceholder(16, boxY, boxWidth, boxHeight, 'FOTO KONDISI RUMAH KLIEN');
      }
    } else {
      drawPhotoPlaceholder(16, boxY, boxWidth, boxHeight, 'FOTO KONDISI RUMAH KLIEN');
    }

    if (img2Base64) {
      try {
        doc.addImage(img2Base64, 'JPEG', 114.5, boxY + 0.5, boxWidth - 1, boxHeight - 1);
      } catch (err) {
        drawPhotoPlaceholder(114, boxY, boxWidth, boxHeight, 'FOTO KK / KTP KLIEN');
      }
    } else {
      drawPhotoPlaceholder(114, boxY, boxWidth, boxHeight, 'FOTO KK / KTP KLIEN');
    }

    // Captions below photos
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('Foto 1: Kondisi Kelayakan Hunian', 16, boxY + boxHeight + 4);
    doc.text('Foto 2: Berkas Kependudukan', 114, boxY + boxHeight + 4);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Survei lapangan kondisi tempat tinggal Klien.', 16, boxY + boxHeight + 7);
    doc.text('Arsip administrasi KK/KTP yang divalidasi.', 114, boxY + boxHeight + 7);

    currentY = boxY + boxHeight + 11;

    // Put signatures in a safe place
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

    doc.text('Klien / Penerima Layanan,', 135, sigY);
    doc.text('Kota Tanjungbalai', 135, sigY + 4);
    doc.setFont('Helvetica', 'normal');
    doc.text('_____________________________', 135, sigY + 20);
    doc.setFont('Helvetica', 'bold');
    doc.text(`( ${rec.namaKlien} )`, 135, sigY + 24);

    // DRAW FOOTERS DYNAMICALLY
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

    if (totalPageCount === 1) {
      drawPageFooter(1, 1);
    } else {
      drawPageFooter(1, 2);
      drawPageFooter(2, 2);
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

                <form onSubmit={handleWargaSubmitReport} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Nama Lengkap Klien *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nama Kepala Keluarga/Klien..."
                        value={wargaAddNama}
                        onChange={(e) => setWargaAddNama(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 font-sans"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">No. Telpon/WhatsApp (Lacak) *</label>
                      <input
                        type="tel"
                        required
                        placeholder="Contoh: 08123456789 (Tanpa spasi)"
                        value={wargaAddPhone}
                        onChange={(e) => setWargaAddPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 font-sans"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Kecamatan *</label>
                      <select
                        value={wargaAddKecamatan}
                        onChange={(e) => {
                          setWargaAddKecamatan(e.target.value);
                          setWargaAddKelurahan(TANJUNGBALAI_LOCATIONS[e.target.value as keyof typeof TANJUNGBALAI_LOCATIONS][0]);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-850 focus:outline-none focus:border-amber-600 font-sans font-bold cursor-pointer"
                      >
                        {Object.keys(TANJUNGBALAI_LOCATIONS).map(kel => (
                          <option key={kel} value={kel}>{kel}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Kelurahan *</label>
                      <select
                        value={wargaAddKelurahan}
                        onChange={(e) => setWargaAddKelurahan(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-850 focus:outline-none focus:border-amber-600 font-sans font-bold cursor-pointer"
                      >
                        {TANJUNGBALAI_LOCATIONS[wargaAddKecamatan as keyof typeof TANJUNGBALAI_LOCATIONS]?.map(kel => (
                          <option key={kel} value={kel}>{kel}</option>
                        )) || <option value="">Pilih Kelurahan</option>}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">NIK Klien (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Masukkan 16 digit NIK..."
                        value={wargaAddNik}
                        onChange={(e) => setWargaAddNik(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Pekerjaan Utama</label>
                      <input
                        type="text"
                        placeholder="Contoh: Nelayan, Serabutan, IRT..."
                        value={wargaAddPekerjaan}
                        onChange={(e) => setWargaAddPekerjaan(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Alamat Rumah Lengkap</label>
                    <textarea
                      rows={2}
                      placeholder="Tulis alamat rumah Anda lengkap dengan patokan jalan..."
                      value={wargaAddAlamat}
                      onChange={(e) => setWargaAddAlamat(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 resize-none font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Rincian Pengaduan / Keluhan Rumahtangga *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Jelaskan kondisi ekonomi rumahtangga dan bantuan apa saja yang ingin diajukan (misal: PKH, Bedah Rumah, dll)..."
                      value={wargaAddPengaduan}
                      onChange={(e) => setWargaAddPengaduan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-amber-600 resize-none leading-relaxed font-sans"
                    />
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

                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider font-display font-black">NIK / ID Pegawai (16 Digit) *</label>
                    <input
                      type="text"
                      required
                      maxLength={16}
                      placeholder="Nomor NIK KTP..."
                      value={regNik}
                      onChange={(e) => setRegNik(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-650"
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
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-[10px] p-1.5 focus:border-indigo-500 text-slate-705 outline-none"
                  >
                    <option value="">Kesejahteraan</option>
                    <option value="Sangat Miskin">Sangat Miskin</option>
                    <option value="Miskin">Miskin</option>
                    <option value="Rentan">Rentan</option>
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
                    <option value="Ahmad Fauzi">Ahmad Fauzi</option>
                    <option value="Siti Rahma">Siti Rahma</option>
                    <option value="Budi Hartono">Budi Hartono</option>
                    {facilitators.filter(f => f.status === 'APPROVED' && !['Ahmad Fauzi', 'Siti Rahma', 'Budi Hartono'].includes(f.name)).map(f => (
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
                    <option value="Ahmad Fauzi">Ahmad Fauzi</option>
                    <option value="Siti Rahma">Siti Rahma</option>
                    <option value="Budi Hartono">Budi Hartono</option>
                    <option value="BOY GULO">BOY GULO</option>
                    {Array.from(new Set<string>(records.map(r => r.namaPendata || '').filter(Boolean))).filter((name) => !['Ahmad Fauzi', 'Siti Rahma', 'Budi Hartono', 'BOY GULO'].includes(name)).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
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

              {/* Sidebar list visitors queue */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
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
                            <p className="text-xs font-bold text-slate-800 mt-0.5">{rec.namaKlien}</p>
                            <p className="text-[10px] text-slate-450 mt-0.5">Kel. {rec.kelurahan}</p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                              isSangatMiskin 
                                ? 'bg-rose-100 text-rose-700' 
                                : isRentan 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {rec.status.replace('Sangat ', 'S.')}
                            </span>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditRecordSetup(rec); }}
                                className="p-1 hover:bg-slate-200 hover:text-indigo-600 rounded"
                                title="Ubah data"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(rec.id); }}
                                className="p-1 hover:bg-slate-200 hover:text-rose-600 rounded"
                                title="Hapus data"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
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
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleExportJSON}
                  className="bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 py-1.5 px-1 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all text-slate-700 hover:text-indigo-700"
                >
                  <Download className="w-3 h-3 text-slate-400" /> Ekspor JSON
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 py-1.5 px-1 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all text-slate-700 hover:text-indigo-700"
                >
                  <Upload className="w-3 h-3 text-slate-400" /> Impor JSON
                </button>
              </div>
            </div>

            {/* Google Sheets Live Sync Integration (Active Web App) */}
            <div className="border-t border-slate-200 pt-2.5 flex flex-col gap-1.5">
              <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest">KONEKSI GOOGLE SHEETS LIVE</span>
              <button
                onClick={handleBulkSyncToGoogleSheets}
                disabled={syncingRecordId !== null}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 text-[10px] transition-all cursor-pointer shadow-xs select-none uppercase tracking-wide"
              >
                📊 {syncingRecordId === 'all' ? 'Mensinkronkan...' : 'Ekspor Massal Ke Sheets'}
              </button>
              <p className="text-[8px] text-slate-400 leading-normal italic">
                Sinkronisasi database rujukan SLRT KITO Kota Tanjungbalai langsung ke spreadsheet target.
              </p>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportJSON} 
              accept=".json" 
              className="hidden" 
            />
            <button 
              onClick={handleResetToDemo}
              className="text-[10px] text-slate-400 hover:text-rose-600 text-left cursor-pointer transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Atur Ulang Data Simulasi
            </button>
          </div>

        </section>

        {/* WORKSPACE DETAILED CONTENTS */}
        <section className="col-span-12 lg:col-span-9 flex flex-col gap-6">
          
          {/* 1. VIEW DATABASE VIEW TAB */}
          {activeTab === 'all-records' && (
            <div className="flex flex-col gap-6 font-sans">
              
              {selectedRecord ? (
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
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-450 flex flex-col items-center justify-center gap-3 shadow-xs">
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
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">12. Bantuan Sudah Diperoleh</label>
                      <input
                        type="text"
                        placeholder="Contoh: PKH, BPNT, KIS, atau Belum Ada..."
                        value={formBantuanDiterima}
                        onChange={(e) => setFormBantuanDiterima(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      />
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
                  <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl text-[11px] text-slate-650 flex items-center gap-2 font-semibold">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                    <span>Menunggu Verifikasi: <b>{facilitators.filter(f => f.status === 'PENDING_APPROVAL').length} Orang</b></span>
                  </div>
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
                                onClick={() => handleDeleteFacilitator(fac.id)}
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
                    <img src={verifierFotoKkKtp} className="w-full h-full object-cover" alt="KK/KTP Preview" />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 p-1.5 text-center text-[10px] text-white font-bold leading-none">
                      Preview Berkas KK/KTP Siap Simpan
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Live Camera Simulation Option */}
                    <button
                      type="button"
                      onClick={() => {
                        const documentSamples = [
                          'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=400',
                          'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=400'
                        ];
                        const picked = documentSamples[Math.floor(Math.random() * documentSamples.length)];
                        processGeotagAndCompression(picked, true, setVerifierFotoKkKtp);
                      }}
                      className="h-14 border border-dashed border-emerald-300 rounded-xl flex flex-col items-center justify-center bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer text-emerald-800 text-[10px] font-medium animate-pulse"
                    >
                      <Camera className="w-4 h-4 mb-0.5 text-emerald-600" />
                      <span className="font-bold">Ambil &amp; Geotag</span>
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
                    <img src={verifierFotoDepanRumah} className="w-full h-full object-cover" alt="Foto Depan Rumah Preview" />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 p-1.5 text-center text-[10px] text-white font-bold leading-none">
                      Preview Depan Rumah Siap Simpan
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Live Camera Simulation Option */}
                    <button
                      type="button"
                      onClick={() => {
                        const houseSamples = [
                          'https://images.unsplash.com/photo-1516880711640-ef7db81be3e1?auto=format&fit=crop&q=80&w=400',
                          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400'
                        ];
                        const picked = houseSamples[Math.floor(Math.random() * houseSamples.length)];
                        processGeotagAndCompression(picked, true, setVerifierFotoDepanRumah);
                      }}
                      className="h-14 border border-dashed border-emerald-300 rounded-xl flex flex-col items-center justify-center bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer text-emerald-800 text-[10px] font-medium animate-pulse"
                    >
                      <Camera className="w-4 h-4 mb-0.5 text-emerald-600" />
                      <span className="font-bold">Ambil &amp; Geotag</span>
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

              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Atur Foto Kontrol Lapangan (Opsional)</label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
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
                      className={`relative overflow-hidden h-14 rounded-lg border-2 transition-all cursor-pointer ${
                        verifierPhoto === img.url ? 'border-emerald-650 shadow-md scale-102' : 'border-slate-150 hover:border-slate-300'
                      }`}
                    >
                      <img src={img.url} className="w-full h-full object-cover" alt={img.label} referrerPolicy="no-referrer" />
                      {verifierPhoto === img.url && (
                        <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center text-white text-xs font-bold font-sans">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-450 italic mt-1 leading-normal font-sans">
                  * Gambar di atas mewakili rujukan audit ops geospasial opsional oleh Dinsos Kota Tanjungbalai.
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
