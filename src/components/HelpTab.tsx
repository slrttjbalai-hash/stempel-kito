import React from 'react';
import { HelpCircle, Info, BookOpen } from 'lucide-react';

export default function HelpTab() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6 font-sans">
      <div>
        <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 font-display">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          Kamus Panduan 18 Lapangan Kerja SLRT KITO
        </h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Agar pengumpulan data oleh fasilitator se-Kota Tanjungbalai valid dan sinkron saat disalurkan ke sistem rujukan Kemensos RI (DTKS), gunakan acuan pengisian bidang di bawah ini:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 shadow-inner flex flex-col gap-2.5">
          <h4 className="font-bold text-indigo-900 flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">A</span>
            Parameter 1 - 5: Identitas Kunjungan
          </h4>
          <ul className="space-y-2 text-slate-600 pl-1">
            <li><strong>1. Nama Fasilitator</strong>: Petugas SLRT Dinas Sosial yang mendata langsung (contoh: <i>Ahmad Fauzi</i>).</li>
            <li><strong>2. Kelurahan</strong>: Kelurahan tempat tinggal pemohon di Tanjungbalai (contoh: <i>Pahang</i>).</li>
            <li><strong>3. Kecamatan</strong>: Kecamatan pemohon di Tanjungbalai (contoh: <i>Datuk Bandar</i>).</li>
            <li><strong>4. Hari/Tanggal</strong>: Hari pelaksanaan kunjungan langsung (contoh: <i>Senin, 01 Juni 2026</i>).</li>
            <li><strong>5. Nama Klien</strong>: Nama representasi penerima manfaat utama (contoh: <i>Ibu Mariam</i>).</li>
          </ul>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 shadow-inner flex flex-col gap-2.5">
          <h4 className="font-bold text-indigo-900 flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">B</span>
            Parameter 6 - 10: Profil &amp; Legalistas
          </h4>
          <ul className="space-y-2 text-slate-600 pl-1">
            <li><strong>6. Pekerjaan KRT</strong>: Pekerjaan aktif Kepala Rumah Tangga (Nelayan, Buruh Cuci, Pedagang).</li>
            <li><strong>7. Nama Kuasa</strong>: Diisi nama anak atau kerabat jika klien tidak dapat hadir langsung. Isi '-' jika tidak diwakili.</li>
            <li><strong>8. Alamat Klien</strong>: Alamat detail agar tim Dinsos mudah mendatangi ulang lokasi (Jl., Gg., Lingkungan, RT/RW).</li>
            <li><strong>9. No Telpon/HP</strong>: Kontak telepon aktif pemohon yang tersambung WhatsApp.</li>
            <li><strong>10. Dokumen</strong>: Jenis berkas fotokopi penunjang yang dipersiapkan (KK, KTP-el, SKTM).</li>
          </ul>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 shadow-inner flex flex-col gap-2.5">
          <h4 className="font-bold text-indigo-900 flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">C</span>
            Parameter 11 - 15: Sosio-Ekonomi &amp; Hunian
          </h4>
          <ul className="space-y-2 text-slate-600 pl-1">
            <li><strong>11. Status Klien</strong>: Klasifikasi kerentanan (Sangat Miskin, Miskin, Rentan).</li>
            <li><strong>12. Bantuan Sudah Diperoleh</strong>: Sebutkan bantuan aktif saat ini (BPNT, PKH, KIS, atau belum ada).</li>
            <li><strong>13. Status Rumah</strong>: Hak milik hunian saat ini (Milik Sendiri, Sewa, Menumpang).</li>
            <li><strong>14. Jenis Penerangan</strong>: Kapasitas daya listrik (PLN Bersubsidi 450W, PLN Non-Subsidi, Sambungan Numpang).</li>
            <li><strong>15. MCK</strong>: Keadaan kelayakan toilet sanitasi klien (Sendiri Layak, Sendiri Kurang Layak, MCK Umum).</li>
          </ul>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 shadow-inner flex flex-col gap-2.5">
          <h4 className="font-bold text-indigo-900 flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">D</span>
            Parameter 16 - 18: Pengaduan &amp; Layanan
          </h4>
          <ul className="space-y-2 text-slate-600 pl-1 font-sans">
            <li><strong>16. Pendapatan Perbulan</strong>: Penghasilan KRT sebulan (contoh: <i>Rp 650.000</i>).</li>
            <li><strong>17. Jenis Pengaduan</strong>: Penjelasan rinci masalah klien (sakit kronis denda BPJS menumpuk, rawan sekolah).</li>
            <li><strong>18. Jenis Layanan</strong>: Nama usulan perbaikan (contoh: <i>Reaktivasi KIS PBI, Beasiswa KIP, Renovasi RTLH</i>).</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
