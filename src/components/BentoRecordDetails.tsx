import React from 'react';
import { SLRTRecord, getSafeBase64Url } from '../types';
import { Printer, Calendar, FileText, Clipboard, Check, HelpCircle, ShieldCheck, HeartPulse, Camera, Clock, CheckCircle2, UserCheck, Download, Home } from 'lucide-react';

interface BentoRecordDetailsProps {
  rec: SLRTRecord;
  onPrint: () => void;
  onDownloadPDF?: () => void;
  onCopyFormatList: () => void;
  copiedRecordId: 'list' | 'tbl' | null;
  listText: string;
  userRole?: 'admin' | 'facilitator' | 'warga';
  onVerifyVisit?: (rec: SLRTRecord) => void;
  onSyncSheets?: (rec: SLRTRecord) => void;
  isSyncingSheets?: boolean;
}

export default function BentoRecordDetails({
  rec,
  onPrint,
  onDownloadPDF,
  onCopyFormatList,
  copiedRecordId,
  listText,
  userRole = 'admin',
  onVerifyVisit,
  onSyncSheets,
  isSyncingSheets = false
}: BentoRecordDetailsProps) {
  
  // Custom helper for status coloring
  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('sangat')) {
      return {
        bg: 'bg-rose-50 border-rose-100 text-rose-700',
        dot: 'bg-rose-500',
        badge: 'bg-rose-600 text-white'
      };
    }
    if (s.includes('rentan')) {
      return {
        bg: 'bg-amber-50 border-amber-100 text-amber-800',
        dot: 'bg-amber-500',
        badge: 'bg-amber-500 text-white'
      };
    }
    if (s.includes('miskin')) {
      return {
        bg: 'bg-orange-50 border-orange-100 text-orange-700',
        dot: 'bg-orange-500',
        badge: 'bg-orange-600 text-white'
      };
    }
    return {
      bg: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-600 text-white'
    };
  };

  const statusStyle = getStatusStyle(rec.status);

  const fotoKk = rec.fotoKkKtp || rec.foto_ktp_url || '';
  const fotoRumah = rec.fotoDepanRumah || rec.foto_hunian_url || '';
  const fotoOps = rec.dokumentasiBukti || '';
  const catatan = rec.catatanPemeriksa || rec.catatan_pendata || '';

  // Dynamically calculate verify photo count and reactive status checklist
  const countPhotos = [fotoKk, fotoRumah, fotoOps].filter(Boolean).length;
  const photoStatusText = countPhotos > 0 ? `Tersedia (${countPhotos} Foto)` : 'Belum Ada Foto';

  // Split documents string into badges
  const docList = rec.dokumen
    .split(',')
    .map(doc => doc.trim())
    .filter(doc => doc.length > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-auto">
      
      {/* CARD 1: PROFILE BLOCK (2 Column Space) */}
      <div id="bento-profile" className="col-span-1 md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50/30 rounded-bl-full pointer-events-none" />
        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner select-none shrink-0 scale-100 hover:scale-105 transition-all">
          👤
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 truncate font-display">
                {rec.namaKlien}
              </h3>
              {rec.isHighPriority && (
                <span className="px-2 py-0.5 text-[9px] font-black rounded-lg bg-rose-600 text-white uppercase tracking-wider inline-flex items-center animate-pulse shadow-xs">
                  🚨 PRIORITAS TINGGI
                </span>
              )}
            </div>
            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider shrink-0 inline-flex items-center gap-1.5 self-start sm:self-center ${statusStyle.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-white`} />
              {rec.status}
            </span>
          </div>
          
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">{rec.pekerjaanKrt || 'Tidak Bekerja'}</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs bg-slate-100 py-0.5 px-2 rounded">{rec.noTelpon}</span>
          </p>
          
          <p className="text-xs text-slate-450 mt-2 flex items-start gap-1 p-2 bg-slate-50/50 rounded-lg border border-slate-100">
            <span className="mt-0.5">📍</span>
            <span className="italic leading-relaxed">
              {rec.alamatKlien}, Kel. {rec.kelurahan}, Kec. {rec.kecamatan}
            </span>
          </p>
        </div>
      </div>

      {/* CARD 2: METADATA INDIGO BLOCK */}
      <div id="bento-metadata" className="col-span-1 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-6 rounded-2xl flex flex-col justify-between shadow-md shadow-indigo-100 relative overflow-hidden group">
        <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/20 rounded-full scale-110 group-hover:scale-125 transition-transform" />
        <div>
          <p className="text-[10px] text-indigo-200 uppercase font-black tracking-widest flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-300" /> Fasilitator Lapangan
          </p>
          <p className="text-xl font-bold mt-1.5 font-display tracking-wide">{rec.namaFasilitator}</p>
        </div>
        <div className="mt-6 pt-4 border-t border-indigo-500/40">
          <p className="text-[10px] text-indigo-200 uppercase font-black tracking-widest flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Waktu Kunjungan
          </p>
          <p className="text-sm font-medium italic mt-1 text-indigo-100">{rec.hariTanggal}</p>
        </div>
      </div>

      {/* NEW BENTO CARD: STATUS VERIFIKASI & DOKUMENTASI LAPANGAN (Col Span 3) */}
      <div id="bento-visit-verification" className="col-span-1 md:col-span-3 bg-white p-6 rounded-2xl border border-slate-205/90 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-6 items-stretch">
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-2 pb-3 border-b border-slate-100 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">VII. DOCUMENTASI HASIL VERIFIKASI</span>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight font-display mt-0.5">
                  DOKUMENTASI DARI PENDATA
                </h4>
              </div>
              
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider inline-flex items-center gap-1.5 self-start sm:self-center ${
                rec.statusKunjungan === 'Sudah Dikunjungi' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/50' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200/50'
              }`}>
                {rec.statusKunjungan === 'Sudah Dikunjungi' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    SUDAH DIKUNJUNGKUNJUNGI (VERIFIED)
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-amber-650 animate-pulse" />
                    Belum Dikunjungi (Pending)
                  </>
                )}
              </span>
            </div>

            {/* Reactive Status Checklist panel */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 mb-4 flex flex-col gap-2 text-xs">
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block">CHECKLIST VERIFIKASI INSTAN</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    rec.statusKunjungan === 'Sudah Dikunjungi' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {rec.statusKunjungan === 'Sudah Dikunjungi' ? '✓' : '•'}
                  </div>
                  <span>Status Kunjungan: <b className={rec.statusKunjungan === 'Sudah Dikunjungi' ? "text-emerald-700" : "text-amber-700 font-bold"}>{rec.statusKunjungan || 'Belum Dikunjungi'}</b></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    countPhotos >= 2 ? 'bg-emerald-500 text-white' : countPhotos > 0 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {countPhotos > 0 ? '✓' : '•'}
                  </div>
                  <span>Dokumentasi Hasil Verifikasi: <b className="text-indigo-700 underline font-extrabold">{photoStatusText}</b></span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
               {rec.statusKunjungan === 'Sudah Dikunjungi' ? (
                 <div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                     <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Verifikasi</p>
                       <p className="text-slate-800 font-semibold mt-0.5">{rec.tanggalPemeriksaan || rec.hariTanggal}</p>
                     </div>
                     <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Pendata</p>
                       <p className="text-emerald-700 font-extrabold mt-0.5">{rec.namaPendata || rec.namaFasilitator || 'Petugas SLRT'}</p>
                     </div>
                     <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metode Registrasi</p>
                       <p className="text-slate-800 font-semibold mt-0.5">
                         {rec.diinputOleh === 'Warga' ? (
                           <span className="text-amber-700 font-bold">📝 Mandiri Warga</span>
                         ) : (
                           <span className="text-indigo-750 font-bold">💻 Admin Dinsos</span>
                         )}
                       </p>
                     </div>
                   </div>

                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catatan Auditor Lapangan / Fasilitator:</p>
                     <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                       <p className="text-slate-700 text-xs italic leading-relaxed">
                         "{catatan || 'Telah diverifikasi sesuai standar operational SLRT Dinsos Kota Tanjungbalai.'}"
                       </p>
                     </div>
                   </div>
                 </div>
               ) : (
                 <div className="py-2">
                   <p className="text-slate-655 text-xs leading-relaxed">
                     Klien ini dideklarasikan oleh <strong className="text-slate-800">{rec.diinputOleh === 'Warga' ? 'Keluarga Warga' : 'Admin Dinsos'}</strong> dan memiliki status <strong className="text-amber-800 leading-none">Belum Dikunjungi Lapangan</strong>.
                   </p>
                   <p className="text-slate-455 text-[11px] mt-1 italic leading-normal">
                     Fasilitator pendata harus melakukan verifikasi kependudukan langsung ke alamat rumah klien untuk membuktikan kondisi 18 instrumen kualifikasi kemiskinan dan melampirkan dokumentasi KK/KTP serta Foto Depan Rumah.
                   </p>
                 </div>
               )}
             </div>
           </div>

           {/* Facilitator role inspection button display */}
           {rec.statusKunjungan !== 'Sudah Dikunjungi' && userRole === 'facilitator' && onVerifyVisit && (
             <div className="mt-4 pt-3 border-t border-slate-100">
               <button
                 onClick={() => onVerifyVisit(rec)}
                 className="w-full sm:w-auto py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-display cursor-pointer animate-pulse"
               >
                 <Camera className="w-4 h-4" /> Mulai Verifikasi &amp; Ambil Gambar KK/KTP &amp; Rumah
               </button>
             </div>
           )}
           
           {rec.statusKunjungan !== 'Sudah Dikunjungi' && userRole !== 'facilitator' && (
             <div className="mt-4 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 italic block">
               💡 <strong>Tips Peran:</strong> Masuk sebagai peran <strong>Fasilitator</strong> untuk melakukan kunjungan rumah, mengunggah foto bukti, dan menyelesaikan verifikasi lapangan klien ini.
             </div>
           )}
         </div>

         {/* PHOTO PROOF AND ATTACHMENTS (Visually displayed on the right of bento) */}
         <div className="w-full md:w-[220px] shrink-0 bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-start gap-3.5 relative overflow-hidden items-stretch">
           <h5 className="text-[10px] font-black text-slate-550 uppercase tracking-wider text-center border-b border-slate-200 pb-2">
             📂 Berkas &amp; Foto Verifikasi
           </h5>

           {/* 1. Foto KK / KTP */}
           <div className="space-y-1">
             <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-tight block">1. Bukti Gambar KK / KTP</span>
             {fotoKk ? (
               <div className="h-16 bg-slate-200 rounded-lg overflow-hidden border border-slate-300 relative group cursor-zoom-in">
                 <img 
                   src={getSafeBase64Url(fotoKk)} 
                   alt="Foto KK / KTP" 
                   referrerPolicy="no-referrer"
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                 />
                 <span className="absolute bottom-1 right-1 bg-slate-900/65 text-[7px] font-black text-white px-1 py-0.5 rounded uppercase">
                   Dokumen
                 </span>
               </div>
             ) : (
               <div className="h-12 bg-slate-100 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-[8px] leading-tight font-sans">
                 <FileText className="w-4 h-4 text-slate-300 mb-0.5" />
                 <span>Belum ada KK/KTP</span>
               </div>
             )}
           </div>

           {/* 2. Foto Depan Rumah */}
           <div className="space-y-1">
             <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-tight block">2. Foto Depan Rumah</span>
             {fotoRumah ? (
               <div className="h-16 bg-slate-200 rounded-lg overflow-hidden border border-slate-300 relative group cursor-zoom-in">
                 <img 
                   src={getSafeBase64Url(fotoRumah)} 
                   alt="Foto Depan Rumah" 
                   referrerPolicy="no-referrer"
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                 />
                 <span className="absolute bottom-1 right-1 bg-slate-900/65 text-[7px] font-black text-white px-1 py-0.5 rounded uppercase">
                   Depan Rumah
                 </span>
               </div>
             ) : (
               <div className="h-12 bg-slate-100 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-[8px] leading-tight font-sans">
                 <Home className="w-4 h-4 text-slate-300 mb-0.5" />
                 <span>Belum ada Foto Rumah</span>
               </div>
             )}
           </div>

           {/* 3. Foto Ops Kunjungan */}
           <div className="space-y-1">
             <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-tight block">3. Foto Kontrol Kunjungan</span>
             {fotoOps ? (
               <div className="h-16 bg-slate-200 rounded-lg overflow-hidden border border-slate-300 relative group cursor-zoom-in">
                 <img 
                   src={getSafeBase64Url(fotoOps)} 
                   alt="Foto Kontrol Lapangan" 
                   referrerPolicy="no-referrer"
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                 />
                 <span className="absolute bottom-1 right-1 bg-slate-900/65 text-[7px] font-black text-white px-1 py-0.5 rounded uppercase">
                   Ops Lapangan
                 </span>
               </div>
             ) : (
               <div className="h-12 bg-slate-100 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-[8px] leading-tight font-sans">
                 <Camera className="w-4 h-4 text-slate-300 mb-0.5" />
                 <span>Belum ada Foto Kontrol</span>
               </div>
             )}
           </div>
         </div>
      </div>

      {/* CARD 3: SOCIAL & ECONOMY */}
      <div id="bento-economy" className="col-span-1 md:row-span-2 bg-white p-6 rounded-2xl border border-slate-200/95 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Status Ekonomi &amp; Hunian
            </h4>
            <span className="text-indigo-600 text-xs font-bold font-mono">18 Poin</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-xs text-slate-400">Rataan Penghasilan</span>
              <span className="text-xs font-bold text-slate-800">{rec.pendapatanPerbulan}</span>
            </div>
            
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-xs text-slate-400">Kepemilikan Rumah</span>
              <span className="text-xs font-bold text-slate-800">{rec.statusRumah}</span>
            </div>
            
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-xs text-slate-400">Instalasi Listrik</span>
              <span className="text-xs font-bold text-slate-800 truncate pl-3 text-right max-w-[150px]" title={rec.jenisPenerangan}>
                {rec.jenisPenerangan}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-slate-400">Kondisi MCK</span>
              <span className="text-xs font-bold text-slate-800 truncate pl-3 text-right max-w-[150px]" title={rec.mck}>
                {rec.mck}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Mewakili Kuasa</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">{rec.namaKuasa || '-'}</p>
          </div>
        </div>
      </div>

      {/* CARD 4: COMPLAINT DETAILS (2 Column space, 2 Row Height) */}
      <div id="bento-complaint" className="col-span-1 md:col-span-2 md:row-span-2 bg-white p-6 rounded-2xl border border-slate-200/95 shadow-sm flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <span className="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg text-sm select-none">
              ⚠️
            </span>
            <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">
              Uraian Pengaduan &amp; Masalah Klien
            </h4>
          </div>
          
          <div className="mb-4">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">
              Keluhan Pemohon (Hasil Tanya Jawab):
            </p>
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap italic">
                "{rec.jenisPengaduan || 'Tidak ada keluhan tertulis.'}"
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-indigo-500" /> Layanan yang Diusulkan / Diinginkan:
          </p>
          <div className="flex gap-2 flex-wrap">
            {rec.jenisLayanan.split(',').map((layanan, i) => (
              <span 
                key={i} 
                className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-semibold whitespace-normal leading-normal"
              >
                {layanan.trim()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CARD 5: DOCUMENTATION CHECK (2 Column Space, 1 Row Height) */}
      <div id="bento-documents" className="col-span-1 md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/95 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
        <div className="flex-1 min-w-0">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-650" /> Lampiran Berkas Kependudukan
          </h4>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {docList.length === 0 ? (
              <span className="text-xs text-slate-400 italic">Tidak ada lampiran dokumen</span>
            ) : (
              docList.map((doc, idx) => (
                <span 
                  key={idx} 
                  className="flex items-center gap-1 text-xs font-bold bg-indigo-50/50 text-indigo-650 px-2.5 py-1 rounded-lg border border-indigo-100/30"
                >
                  ✓ {doc}
                </span>
              ))
            )}
          </div>
        </div>
        
        <div className="hidden sm:block w-px h-12 bg-slate-100 shrink-0" />
        
        <div className="flex-1 min-w-0">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Bantuan Sosial Aktif Terdaftar
          </h4>
          <p className="text-slate-700 font-bold text-sm mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            {rec.bantuanDiterima || 'Belum terdaftar bansos'}
          </p>
        </div>
      </div>

      {/* CARD 6: ACTION SLIP BUTTONS */}
      <div id="bento-actions" className="col-span-1 bg-white p-5 rounded-2xl border border-slate-200/95 shadow-sm flex flex-col gap-2.5 justify-center">
        <button 
          onClick={onPrint}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-display shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Cetak Slip Formulir
        </button>
        
        {onDownloadPDF && (
          <button 
            onClick={onDownloadPDF}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold rounded-xl shadow-lg shadow-rose-150 hover:shadow-rose-250 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-display shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Unduh Laporan PDF
          </button>
        )}
        
        {onSyncSheets && (
          <button 
            type="button"
            onClick={() => onSyncSheets(rec)}
            disabled={isSyncingSheets}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed select-none"
          >
            <span>📊</span>
            <span>{isSyncingSheets ? 'Mengirim...' : 'Kirim ke Google Sheets'}</span>
          </button>
        )}

        <button 
          onClick={onCopyFormatList}
          className="w-full py-2 border border-slate-250 bg-white text-slate-650 hover:bg-slate-50 hover:text-slate-800 font-bold rounded-xl transition-all text-[11px] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          {copiedRecordId === 'list' ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Clipboard className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>{copiedRecordId === 'list' ? 'Format Tersalin!' : 'Salin 18-Format List'}</span>
        </button>
      </div>

      {/* DETAILED HIDDEN LIST PREVIEW LOG */}
      <div className="col-span-1 md:col-span-3 mt-1.5">
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Simulasi Format List 18 Lapangan Kerja (Untuk Verifikasi Cepat):</p>
        <div className="max-h-24 bg-slate-900 border border-slate-850 rounded-xl p-3 overflow-y-auto block font-mono text-[9px] text-slate-350 select-all whitespace-pre leading-relaxed">
          {listText}
        </div>
      </div>

    </div>
  );
}
