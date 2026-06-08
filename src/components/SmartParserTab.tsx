import React from 'react';
import { SLRTRecord } from '../types';
import { Wand2, Sparkles, Check, CheckCircle2, AlertCircle } from 'lucide-react';

interface SmartParserTabProps {
  rawText: string;
  setRawText: (text: string) => void;
  parsedPreview: Partial<SLRTRecord> | null;
  parseStatusMsg: string;
  onParse: () => void;
  onApply: () => void;
  samples: { label: string; text: string }[];
}

export default function SmartParserTab({
  rawText,
  setRawText,
  parsedPreview,
  parseStatusMsg,
  onParse,
  onApply,
  samples
}: SmartParserTabProps) {
  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* INPUT BENTO CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-905 flex items-center gap-2 font-display">
            <Wand2 className="w-5 h-5 text-amber-500 animate-pulse" />
            Asisten Ekstraktor Whatsapp &amp; Laporan Chat
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Sering menerima salinan laporan kunjungan acak atau pesan tidak beraturan dari WA group? Tempel pesan tersebut di bawah ini, dan sistem heuristics parser kami akan memetakan ke-18 koordinat parameter secara otomatis!
          </p>
        </div>

        {/* Dynamic samples triggers */}
        <div>
          <span className="text-xs font-bold text-slate-600 block mb-2">
            Klik Contoh Laporan Latih (Uji Heuristik):
          </span>
          <div className="flex gap-2 flex-wrap">
            {samples.map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRawText(sample.text)}
                className="bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-850 text-xs px-3 py-2 rounded-lg font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <div>
          <label className="text-xs font-bold text-slate-655 block mb-1">
            Tempel Pesan Mentah Anda di Sini:
          </label>
          <textarea
            rows={8}
            placeholder="Contoh: 1. Nama Fasilitator: Ahmad Fauzi, Kelurahan: Sijambi ..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full bg-slate-50 border border-slate-205 text-xs p-4 rounded-xl outline-none font-mono focus:border-indigo-500 focus:bg-white text-slate-800 transition-all shadow-inner leading-relaxed resize-y"
          />
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100">
          {parseStatusMsg && (
            <span className="text-xs font-semibold text-indigo-750 bg-indigo-50/75 py-1.5 px-3.5 rounded-lg border border-indigo-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" /> {parseStatusMsg}
            </span>
          )}
          <button
            type="button"
            onClick={onParse}
            className="ml-auto bg-slate-900 hover:bg-indigo-950 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-300" />
            Ekstrak Hasil
          </button>
        </div>
      </div>

      {/* EXTRACTED PREVIEW BENTO CARD */}
      {parsedPreview && (
        <div className="bg-white rounded-2xl shadow-sm border-t-4 border-indigo-600 border-x border-b border-slate-200 p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase font-display tracking-wide">
                Hasil Pratinjau Ekstraksi Mentah
              </h4>
              <p className="text-xs text-slate-400">
                Silakan verifikasi isi data di bawah ini sebelum memindahkannya ke sistem edit database aktif.
              </p>
            </div>
            
            <button
              type="button"
              onClick={onApply}
              className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> Masukkan ke Formulir Sunting
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-xs bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-inner">
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">1. Nama Fasilitator</span>
              <span className="text-slate-800 font-medium text-xs truncate block">{parsedPreview.namaFasilitator || '⚠️ Belum terdeteksi'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">2. Kelurahan</span>
              <span className="text-slate-800 font-medium text-xs truncate block">{parsedPreview.kelurahan || '⚠️ Belum terdeteksi'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">3. Kecamatan</span>
              <span className="text-slate-800 font-medium text-xs truncate block">{parsedPreview.kecamatan || '⚠️ Belum terdeteksi'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">4. Hari/Tanggal</span>
              <span className="text-slate-800 font-medium text-xs truncate block">{parsedPreview.hariTanggal || '⚠️ Belum terdeteksi'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">5. Nama Klien</span>
              <span className="text-indigo-900 font-bold text-sm truncate block">{parsedPreview.namaKlien || '⚠️ Belum terdeteksi'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">6. Pekerjaan KRT</span>
              <span className="text-slate-800 font-medium text-xs truncate block">{parsedPreview.pekerjaanKrt || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">7. Nama Kuasa</span>
              <span className="text-slate-800 font-medium text-xs truncate block">{parsedPreview.namaKuasa || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">8. Alamat Klien</span>
              <span className="text-slate-850 font-medium text-xs block leading-relaxed">{parsedPreview.alamatKlien || '⚠️ Belum terdeteksi'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">9. No Telpon</span>
              <span className="text-slate-800 font-mono text-xs">{parsedPreview.noTelpon || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">10. Dokumen</span>
              <span className="text-slate-800 font-medium text-xs">{parsedPreview.dokumen || 'KK, KTP'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">11. Status Klien</span>
              <span className="text-rose-700 font-black text-xs uppercase">{parsedPreview.status || 'Miskin'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">12. Bantuan Diperoleh</span>
              <span className="text-slate-800 font-medium text-xs">{parsedPreview.bantuanDiterima || 'Belum Ada'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">13. Status Rumah</span>
              <span className="text-slate-800 font-medium text-xs">{parsedPreview.statusRumah || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">14. Penerangan/Listrik</span>
              <span className="text-slate-800 font-medium text-xs">{parsedPreview.jenisPenerangan || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">15. MCK</span>
              <span className="text-slate-800 font-medium text-xs">{parsedPreview.mck || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">16. Pendapatan</span>
              <span className="text-indigo-950 font-bold text-xs">{parsedPreview.pendapatanPerbulan || 'Tidak Tetap'}</span>
            </div>
            
            <div className="md:col-span-2 border-t border-slate-200/50 pt-2.5 mt-2">
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">17. Jenis Pengaduan</span>
              <span className="text-slate-700 block leading-relaxed italic pr-2">"{parsedPreview.jenisPengaduan || '⚠️ Belum terdeteksi'}"</span>
            </div>
            
            <div className="md:col-span-1 border-t border-slate-200/50 pt-2.5 mt-2">
              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">18. Jenis Layanan</span>
              <span className="text-indigo-700 font-bold block">{parsedPreview.jenisLayanan || '⚠️ Belum terdeteksi'}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex justify-end">
            <button
              onClick={onApply}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" /> Masukkan ke Formulir Utama
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
