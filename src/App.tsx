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

import { SLRTRecord, TANJUNGBALAI_LOCATIONS, INITIAL_RECORDS } from './types';
import BentoRecordDetails from './components/BentoRecordDetails';
import SmartParserTab from './components/SmartParserTab';
import HelpTab from './components/HelpTab';

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

export default function App() {
  // State for database records
  const [records, setRecords] = useState<SLRTRecord[]>(() => {
    const saved = localStorage.getItem('slrt_records');
    return saved ? JSON.parse(saved) : INITIAL_RECORDS;
  });

  // User Authentication & Role Perspective
  const [userRole, setUserRole] = useState<'admin' | 'facilitator' | 'warga'>(() => {
    const saved = localStorage.getItem('slrt_user_role');
    return (saved as 'admin' | 'facilitator' | 'warga') || 'admin';
  });

  // Verification dialog & form states
  const [selectedVerifierRecord, setSelectedVerifierRecord] = useState<SLRTRecord | null>(null);
  const [showVerifierModal, setShowVerifierModal] = useState(false);
  const [verifierNotes, setVerifierNotes] = useState('');
  const [verifierPhoto, setVerifierPhoto] = useState('https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=400');
  const [verifierDate, setVerifierDate] = useState('');
  const [selectedFacilitatorFilter, setSelectedFacilitatorFilter] = useState<string>('all');

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

  // Selected Record state
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>('rec-1');

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

  // Handler helper to initiate verification from facilitator perspective
  const handleOpenVerifierModal = (rec: SLRTRecord) => {
    setSelectedVerifierRecord(rec);
    setVerifierNotes('');
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

    const updatedRecords = records.map(rec => {
      if (rec.id === selectedVerifierRecord.id) {
        return {
          ...rec,
          statusKunjungan: 'Sudah Dikunjungi' as const,
          tanggalPemeriksaan: verifierDate.trim() || 'Hari Ini',
          catatanPemeriksa: verifierNotes.trim() || 'Kunjungan fisik lapangan dan pemeriksaan 18 indikator selesai diverifikasi tanpa catatan khusus.',
          dokumentasiBukti: verifierPhoto
        };
      }
      return rec;
    });

    setRecords(updatedRecords);
    setSelectedRecordId(selectedVerifierRecord.id);
    setShowVerifierModal(false);
    setSelectedVerifierRecord(null);
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

    // Select randomly from the default list of facilitators to assign this ticket
    const activeFacilitatingStaff = ['Ahmad Fauzi', 'Siti Rahma', 'Budi Hartono'];
    const assignedFasil = activeFacilitatingStaff[Math.floor(Math.random() * activeFacilitatingStaff.length)];

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

      const matchesFasilitatorFilter = selectedFacilitatorFilter && selectedFacilitatorFilter !== 'all'
        ? rec.namaFasilitator === selectedFacilitatorFilter
        : true;

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

      return matchesSearch && matchesKecamatan && matchesKelurahan && matchesStatus && matchesKunjungan && matchesFasilitatorFilter && matchesDateRange;
    });
  }, [
    records, 
    searchQuery, 
    filterKecamatan, 
    filterKelurahan, 
    filterStatus, 
    filterKunjungan, 
    selectedFacilitatorFilter,
    filterStartMonth,
    filterStartYear,
    filterEndMonth,
    filterEndYear
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
            body { font-family: 'Courier New', Courier, monospace; padding: 30px; color: #333; line-height: 1.5; }
            .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 12px; margin-bottom: 24px; }
            .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
            .header h2 { margin: 5px 0 0; font-size: 15px; font-weight: normal; }
            .content-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 15px; }
            .field-row { display: flex; border-bottom: 1px dashed #ccc; padding: 6px 0; }
            .label { width: 330px; font-weight: bold; }
            .val { flex: 1; }
            .footer { margin-top: 50px; text-align: right; font-size: 13px; }
            .sig-space { height: 70px; }
            .btn-print { background: #4f46e5; color: #fff; border: 0; padding: 8px 16px; border-radius: 4px; font-family: sans-serif; cursor: pointer; margin-bottom: 20px; }
            @media print {
              .btn-print { display: none; }
            }
          </style>
        </head>
        <body>
          <button class="btn-print" onclick="window.print()">Cetak Slip Dokumen (Ctrl + P)</button>
          
          <div class="header">
            <h1>PELAYANAN DAN PENGADUAN SLRT KITO</h1>
            <h2>KOTA TANJUNGBALAI - SUMATERA UTARA</h2>
            <p style="margin: 3px 0 0; font-size: 11px;">Sistem Layanan dan Rujukan Terpadu (Pencegahan Kemiskinan & Kerentanan Sosial)</p>
          </div>
          
          <div class="content-grid">
            <div class="field-row"><div class="label">1. Nama Fasilitator</div><div class="val">: ${selectedRecord.namaFasilitator}</div></div>
            <div class="field-row"><div class="label">2. Kelurahan</div><div class="val">: ${selectedRecord.kelurahan}</div></div>
            <div class="field-row"><div class="label">3. Kecamatan</div><div class="val">: ${selectedRecord.kecamatan}</div></div>
            <div class="field-row"><div class="label">4. Hari/Tanggal</div><div class="val">: ${selectedRecord.hariTanggal}</div></div>
            <div class="field-row"><div class="label">5. Nama Klien</div><div class="val">: <strong>${selectedRecord.namaKlien}</strong></div></div>
            <div class="field-row"><div class="label">6. Pekerjaan KRT</div><div class="val">: ${selectedRecord.pekerjaanKrt}</div></div>
            <div class="field-row"><div class="label">7. Nama Kuasa</div><div class="val">: ${selectedRecord.namaKuasa}</div></div>
            <div class="field-row"><div class="label">8. Alamat Klien</div><div class="val">: ${selectedRecord.alamatKlien}</div></div>
            <div class="field-row"><div class="label">9. No Telpon</div><div class="val">: ${selectedRecord.noTelpon}</div></div>
            <div class="field-row"><div class="label">10. Dokumen Dibawa</div><div class="val">: ${selectedRecord.dokumen}</div></div>
            <div class="field-row"><div class="label">11. Status Sosial</div><div class="val">: ${selectedRecord.status}</div></div>
            <div class="field-row"><div class="label">12. Bantuan yang Sudah Diperoleh</div><div class="val">: ${selectedRecord.bantuanDiterima}</div></div>
            <div class="field-row"><div class="label">13. Status Kepemilikan Rumah</div><div class="val">: ${selectedRecord.statusRumah}</div></div>
            <div class="field-row"><div class="label">14. Jenis Penerangan</div><div class="val">: ${selectedRecord.jenisPenerangan}</div></div>
            <div class="field-row"><div class="label">15. MCK</div><div class="val">: ${selectedRecord.mck}</div></div>
            <div class="field-row"><div class="label">16. Pendapatan Perbulan</div><div class="val">: ${selectedRecord.pendapatanPerbulan}</div></div>
            <div class="field-row"><div class="label">17. Jenis Pengaduan</div><div class="val">: ${selectedRecord.jenisPengaduan}</div></div>
            <div class="field-row"><div class="label">18. Jenis Layanan yang Diinginkan</div><div class="val">: ${selectedRecord.jenisLayanan}</div></div>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-top: 65px;">
            <div style="text-align: center; width: 230px;">
              <p>Masyarakat / Pemohon</p>
              <div class="sig-space"></div>
              <p>( ____________________ )</p>
            </div>
            <div style="text-align: center; width: 230px;">
              <p>Tanjungbalai, ${selectedRecord.hariTanggal.split(',')[1] || '_________________'}</p>
              <p>Fasilitator Pendata</p>
              <div class="sig-space"></div>
              <p><strong>( ${selectedRecord.namaFasilitator} )</strong></p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
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
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> EKSPOR DATABASE ADM</h4>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleExportJSON}
                className="bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 py-2 px-1 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all text-slate-700 hover:text-indigo-700"
              >
                <Download className="w-3 h-3 text-slate-400" /> Ekspor JSON
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 py-2 px-1 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all text-slate-700 hover:text-indigo-700"
              >
                <Upload className="w-3 h-3 text-slate-400" /> Impor JSON
              </button>
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
                  onCopyFormatList={() => handleCopyToClipboard(generateListText(selectedRecord), 'list')}
                  copiedRecordId={copiedRecordId}
                  listText={generateListText(selectedRecord)}
                  userRole={userRole}
                  onVerifyVisit={handleOpenVerifierModal}
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
                      <label className="text-[10px] font-black text-slate-550 block mb-1 uppercase tracking-wider">1. Nama Fasilitator Pendata *</label>
                      <input
                        type="text"
                        placeholder="Nama fasilitator pendata..."
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

              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Tanggal Pemeriksaan Fisik *</label>
                <input
                  type="text"
                  required
                  placeholder="Hari, Tanggal Bulan Tahun"
                  value={verifierDate}
                  onChange={(e) => setVerifierDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">Pilih Foto Bukti Dokumen Kunjungan (Verifikasi Fisik)</label>
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
                  * Gambar di atas mewakili skenario peninjauan foto metadata di lapangan untuk audit rujukan Dinas Sosial Tanjungbalai.
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
                      💡 Chip {index + 1}: {chipValue.substring(0, 30)}...
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

    </div>
  );
}
