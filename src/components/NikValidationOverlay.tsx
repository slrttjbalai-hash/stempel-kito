import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, AlertTriangle, HelpCircle, ShieldAlert } from 'lucide-react';
import { SLRTRecord, FacilitatorUser } from '../types';

interface NikValidationOverlayProps {
  nik: string;
  type: 'client' | 'facilitator';
  records?: SLRTRecord[];
  facilitators?: FacilitatorUser[];
  editingId?: string | null;
  isVisible: boolean;
}

export default function NikValidationOverlay({
  nik,
  type,
  records = [],
  facilitators = [],
  editingId = null,
  isVisible
}: NikValidationOverlayProps) {
  const cleanNik = (nik || '').trim();
  const digitCount = cleanNik.length;
  
  // Rule 1: Exactly 16 digits
  const hasSixteenDigits = digitCount === 16;
  
  // Rule 2: Numeric only
  const isNumericOnly = useMemo(() => {
    if (digitCount === 0) return false;
    return /^\d+$/.test(cleanNik);
  }, [cleanNik, digitCount]);

  // Rule 3: Duplication Check
  const duplicateOwner = useMemo(() => {
    if (!hasSixteenDigits) return null;
    
    if (type === 'client') {
      const dup = records.find(r => r.nik === cleanNik && r.id !== editingId);
      if (dup) {
        return {
          name: dup.namaKlien || 'Tanpa Nama',
          location: `Kel. ${dup.kelurahan || '-'}, Kec. ${dup.kecamatan || '-'}`,
          status: dup.statusKunjungan || 'Belum Dikunjungi',
          isClient: true
        };
      }
    } else {
      const dup = facilitators.find(f => f.nik === cleanNik);
      if (dup) {
        return {
          name: dup.name || 'Tanpa Nama',
          location: dup.email || '-',
          status: 'Fasilitator Lapangan',
          isClient: false
        };
      }
    }
    return null;
  }, [cleanNik, hasSixteenDigits, type, records, facilitators, editingId]);

  const isUnique = !duplicateOwner;
  const progressPercent = Math.min((digitCount / 16) * 105, 100);

  // Determine feedback states
  const checkList = [
    {
      label: `Panjang Digit: ${digitCount} / 16`,
      isValid: hasSixteenDigits,
      description: digitCount < 16 ? `Kurang ${16 - digitCount} digit lagi` : digitCount > 16 ? 'Kelebihan digit' : 'Panjang tepat 16 digit'
    },
    {
      label: 'Hanya Karakter Angka',
      isValid: digitCount > 0 && isNumericOnly,
      description: isNumericOnly ? 'Valid numerik' : digitCount === 0 ? 'Harus angka saja' : 'Mengandung huruf/simbol!'
    },
    {
      label: 'Unik & Belum Terdaftar',
      isValid: isUnique,
      description: isUnique ? 'Belum terdaftar di database' : 'NIK sudah digunakan di sistem!'
    }
  ];

  const overallStatus = useMemo(() => {
    if (digitCount === 0) return 'empty';
    if (!isNumericOnly) return 'invalid-chars';
    if (!hasSixteenDigits) return 'typing';
    if (duplicateOwner) return 'duplicate';
    return 'valid';
  }, [digitCount, isNumericOnly, hasSixteenDigits, duplicateOwner]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute left-0 right-0 z-40 mt-1"
        >
          <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-4 shadow-xl text-left font-sans text-xs">
            {/* Header with real-time status */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                Validasi NIK Real-time
              </span>
              
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                overallStatus === 'valid'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : overallStatus === 'typing'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono animate-pulse'
                  : overallStatus === 'duplicate'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-450'
              }`}>
                {overallStatus === 'valid' && '✓ Lolos Validasi'}
                {overallStatus === 'typing' && '⌛ Mengetik...'}
                {overallStatus === 'duplicate' && '❌ Duplikat Terdeteksi'}
                {overallStatus === 'invalid-chars' && '⚠️ Salah Format'}
                {overallStatus === 'empty' && 'Wajib 16 digit'}
              </span>
            </div>

            {/* Digit counter trackbar */}
            <div className="mb-3.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span>Progres Digit KTP</span>
                <span className="font-mono font-bold text-slate-200">{digitCount} / 16</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className={`h-full transition-all duration-300 ${
                    hasSixteenDigits && isUnique
                      ? 'bg-emerald-500'
                      : duplicateOwner
                      ? 'bg-rose-500'
                      : 'bg-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* Checklist of rules */}
            <div className="flex flex-col gap-2">
              {checkList.map((item, id) => (
                <div key={id} className="flex gap-2.5 items-start">
                  <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                    item.isValid 
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                      : 'bg-slate-850 text-slate-500 border-slate-800'
                  }`}>
                    {item.isValid ? (
                      <Check className="w-2.5 h-2.5" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    )}
                  </div>
                  <div>
                    <p className={`font-bold text-[11px] ${item.isValid ? 'text-slate-100' : 'text-slate-400'}`}>
                      {item.label}
                    </p>
                    <p className="text-[9.5px] text-slate-450 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Duplicate Alert card */}
            {duplicateOwner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3.5 p-3 bg-rose-950/25 border border-rose-900/40 rounded-xl flex gap-2.5 items-start"
              >
                <ShieldAlert className="w-5 h-5 text-rose-450 shrink-0" />
                <div className="leading-snug">
                  <p className="font-semibold text-rose-350 text-[10.5px]">Identitas Konflik Terdaftar:</p>
                  <p className="text-slate-105 font-bold mt-1 text-[11.5px]">{duplicateOwner.name}</p>
                  <p className="text-slate-400 text-[10px]">{duplicateOwner.location}</p>
                  <p className="text-slate-450 text-[10px] mt-1 italic">
                    Peran / Status: <strong className="text-amber-500 font-semibold">{duplicateOwner.status}</strong>
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
