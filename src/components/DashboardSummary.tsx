import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { SLRTRecord } from '../types';
import { 
  Building2, 
  CheckCircle, 
  HelpCircle, 
  AlertTriangle, 
  Users, 
  TrendingUp, 
  PieChart as PieIcon, 
  Map
} from 'lucide-react';
import GeotagHeatmapMap from './GeotagHeatmapMap';

interface DashboardSummaryProps {
  records: SLRTRecord[];
  onSelectRecord?: (recordId: string) => void;
}

export default function DashboardSummary({ records, onSelectRecord }: DashboardSummaryProps) {
  // 1. Calculate General Metrics
  const metrics = useMemo(() => {
    const total = records.length;
    const visited = records.filter(r => r.statusKunjungan === 'Sudah Dikunjungi').length;
    const pending = total - visited;
    const highPriority = records.filter(r => r.isHighPriority || (r.status === 'Sangat Miskin' && r.statusKunjungan !== 'Sudah Dikunjungi')).length;
    const percentageVisited = total > 0 ? Math.round((visited / total) * 100) : 0;

    return { total, visited, pending, highPriority, percentageVisited };
  }, [records]);

  // 2. Data grouped by Kecamatan for BarChart
  const kecamatanData = useMemo(() => {
    const counts: { [key: string]: { nama: string; 'Belum Dikunjungi': number; 'Sudah Dikunjungi': number; Total: number } } = {
      'Tanjungbalai Selatan': { nama: 'TB Selatan', 'Belum Dikunjungi': 0, 'Sudah Dikunjungi': 0, Total: 0 },
      'Tanjungbalai Utara': { nama: 'TB Utara', 'Belum Dikunjungi': 0, 'Sudah Dikunjungi': 0, Total: 0 },
      'Sei Tualang Raso': { nama: 'Sei Tualang Raso', 'Belum Dikunjungi': 0, 'Sudah Dikunjungi': 0, Total: 0 },
      'Teluk Nibung': { nama: 'Teluk Nibung', 'Belum Dikunjungi': 0, 'Sudah Dikunjungi': 0, Total: 0 },
      'Datuk Bandar': { nama: 'Datuk Bandar', 'Belum Dikunjungi': 0, 'Sudah Dikunjungi': 0, Total: 0 },
      'Datuk Bandar Timur': { nama: 'Datuk Bandar Timur', 'Belum Dikunjungi': 0, 'Sudah Dikunjungi': 0, Total: 0 }
    };

    records.forEach(r => {
      const rawKec = r.kecamatan ? r.kecamatan.trim() : '';
      if (!rawKec) return;
      
      const foundKey = Object.keys(counts).find(k => k.toLowerCase() === rawKec.toLowerCase());
      const kec = foundKey || rawKec;

      if (counts[kec]) {
        if (r.statusKunjungan === 'Sudah Dikunjungi') {
          counts[kec]['Sudah Dikunjungi'] += 1;
        } else {
          counts[kec]['Belum Dikunjungi'] += 1;
        }
        counts[kec].Total += 1;
      } else {
        counts[kec] = {
          nama: kec,
          'Belum Dikunjungi': r.statusKunjungan === 'Sudah Dikunjungi' ? 0 : 1,
          'Sudah Dikunjungi': r.statusKunjungan === 'Sudah Dikunjungi' ? 1 : 0,
          Total: 1
        };
      }
    });

    return Object.values(counts);
  }, [records]);

  // 3. Status Kesejahteraan distribution for PieChart
  const statusData = useMemo(() => {
    const counts: { [key: string]: number } = {
      'Sangat Miskin': 0,
      'Miskin': 0,
      'Rentan': 0
    };

    records.forEach(r => {
      let stObj = r.status || 'Miskin';
      // normalize key
      if (stObj.toLowerCase().includes('sangat')) {
        counts['Sangat Miskin'] += 1;
      } else if (stObj.toLowerCase().includes('rentan')) {
        counts['Rentan'] += 1;
      } else {
        counts['Miskin'] += 1;
      }
    });

    return [
      { name: 'Sangat Miskin', value: counts['Sangat Miskin'], color: '#ef4444' }, // Rose 500
      { name: 'Miskin', value: counts['Miskin'], color: '#f97316' }, // Orange 500
      { name: 'Rentan', value: counts['Rentan'], color: '#eab308' }   // Yellow 500
    ].filter(item => item.value > 0);
  }, [records]);

  // 4. Source of report distribution (Admin Input vs Citizen/Warga Input)
  const sourceData = useMemo(() => {
    const counts = { Admin: 0, Warga: 0 };
    records.forEach(r => {
      if (r.diinputOleh === 'Warga') counts.Warga += 1;
      else counts.Admin += 1;
    });
    return [
      { name: 'Master Admin', value: counts.Admin, color: '#6366f1' }, // Indigo 500
      { name: 'Portal Warga', value: counts.Warga, color: '#10b981' }  // Emerald 500
    ].filter(item => item.value > 0);
  }, [records]);

  // 5. Grid detail breakdown by Kecamatan and Kelurahan
  const breakdownByLocation = useMemo(() => {
    const map: { [kec: string]: { [kel: string]: { total: number; visited: number } } } = {};
    records.forEach(r => {
      const kec = r.kecamatan || 'Belum Terdefinisi';
      const kel = r.kelurahan || 'Belum Terdefinisi';
      if (!map[kec]) map[kec] = {};
      if (!map[kec][kel]) map[kec][kel] = { total: 0, visited: 0 };
      
      map[kec][kel].total += 1;
      if (r.statusKunjungan === 'Sudah Dikunjungi') {
        map[kec][kel].visited += 1;
      }
    });

    const flatList: Array<{ kecamatan: string; kelurahan: string; total: number; visited: number; percent: number }> = [];
    Object.keys(map).forEach(kec => {
      Object.keys(map[kec]).forEach(kel => {
        const item = map[kec][kel];
        flatList.push({
          kecamatan: kec,
          kelurahan: kel,
          total: item.total,
          visited: item.visited,
          percent: item.total > 0 ? Math.round((item.visited / item.total) * 100) : 0
        });
      });
    });

    return flatList.sort((a, b) => b.total - a.total);
  }, [records]);

  // 6. Monthly trend data calculation
  const monthlyTrendData = useMemo(() => {
    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const stats: { [key: string]: { bulan: string; 'Jumlah Aduan': number; 'Selesai Verifikasi': number } } = {};
    monthsIndo.forEach(m => {
      stats[m] = { bulan: m, 'Jumlah Aduan': 0, 'Selesai Verifikasi': 0 };
    });

    records.forEach(r => {
      let detectedMonth = '';
      if (r.hariTanggal) {
        const foundMonth = monthsIndo.find(m => r.hariTanggal.toLowerCase().includes(m.toLowerCase()));
        if (foundMonth) {
          detectedMonth = foundMonth;
        }
      }
      
      if (!detectedMonth && r.hariTanggal) {
        const dateObj = new Date(r.hariTanggal);
        if (!isNaN(dateObj.getTime())) {
          detectedMonth = monthsIndo[dateObj.getMonth()];
        }
      }

      if (!detectedMonth) {
        detectedMonth = 'Juni'; 
      }

      if (stats[detectedMonth]) {
        stats[detectedMonth]['Jumlah Aduan'] += 1;
        if (r.statusKunjungan === 'Sudah Dikunjungi') {
          stats[detectedMonth]['Selesai Verifikasi'] += 1;
        }
      }
    });

    const activeMonths = monthsIndo.map(m => stats[m]).filter(m => m['Jumlah Aduan'] > 0);
    
    if (activeMonths.length === 0) {
      return [
        { bulan: 'Mei', 'Jumlah Aduan': 0, 'Selesai Verifikasi': 0 },
        { bulan: 'Juni', 'Jumlah Aduan': 0, 'Selesai Verifikasi': 0 },
        { bulan: 'Juli', 'Jumlah Aduan': 0, 'Selesai Verifikasi': 0 }
      ];
    }
    
    return activeMonths;
  }, [records]);

  const [pieFocusTab, setPieFocusTab] = useState<'kesejahteraan' | 'sumber'>('kesejahteraan');

  return (
    <div className="flex flex-col gap-6 animate-fade-in font-sans">
      
      {/* Dynamic Jumbotron Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -ml-10 -mb-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 mb-2 font-mono">
              <TrendingUp className="w-3 h-3 text-indigo-400" /> Analitik Integratif SLRT KITO
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Dasbor Manajemen & Ringkasan Statistik
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed mt-1 max-w-2xl">
              Memantau status kualifikasi kesejahteraan warga dan performa verifikasi lapangan fasilitator di 6 kecamatan se-Kota Tanjungbalai secara real-time.
            </p>
          </div>
          
          <div className="bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50 flex flex-col items-center justify-center min-w-[140px] shrink-0">
            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider font-mono">Persentase Audit</span>
            <span className="text-3xl font-black text-emerald-400 tracking-tighter mt-1">{metrics.percentageVisited}%</span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 mt-1">Selesai Dikunjungi</span>
          </div>
        </div>
      </div>

      {/* Grid of Key Analytical Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Pemohon</span>
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900 leading-tight mt-0.5 block">
              {metrics.total}
            </span>
            <span className="text-[9px] text-slate-500 mt-1 block">Tercatat di data pusat</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sudah Kunjungan</span>
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900 leading-tight mt-0.5 block">
              {metrics.visited}
            </span>
            <span className="text-[9px] text-emerald-600 font-bold mt-1 block">Laporan valid terbit</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <HelpCircle className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Mengantre Audit</span>
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900 leading-tight mt-0.5 block">
              {metrics.pending}
            </span>
            <span className="text-[9px] text-amber-700 font-bold mt-1 block">Proses survei petugas</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Prioritas Tinggi</span>
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900 leading-tight mt-0.5 block">
              {metrics.highPriority}
            </span>
            <span className="text-[9px] text-rose-600 font-bold mt-1 block">Sangat Miskin / Mendesak</span>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Side Chart - Bar Chart per Kecamatan */}
        <div className="col-span-12 lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">
                Jumlah Pengaduan Per Kecamatan
              </h2>
            </div>
            <span className="text-[9px] text-slate-400 font-medium italic">Kota Tanjungbalai</span>
          </div>

          <div className="h-[280px] w-full" id="chart-kecamatan-container">
            {kecamatanData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={kecamatanData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="nama" 
                    tick={{ fill: '#64748b', fontSize: 9, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 9, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '12px', 
                      color: '#fff', 
                      border: 'none',
                      fontFamily: 'sans-serif',
                      fontSize: '11px',
                      padding: '8px 12px',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontWeight: 'bold' }}
                    iconType="circle"
                  />
                  <Bar 
                    dataKey="Sudah Dikunjungi" 
                    stackId="a" 
                    fill="#10b981" 
                    name="Selesai Dikunjungi" 
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar 
                    dataKey="Belum Dikunjungi" 
                    stackId="a" 
                    fill="#94a3b8" 
                    name="Mengantre Kunjungan" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                Belum ada data pengaduan untuk divisualisasikan.
              </div>
            )}
          </div>
        </div>

        {/* Right Side Chart - Pie Distribution */}
        <div className="col-span-12 lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">
                Distribusi Data Nasional & Daerah
              </h2>
            </div>
            
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setPieFocusTab('kesejahteraan')}
                className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                  pieFocusTab === 'kesejahteraan' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Kesejahteraan
              </button>
              <button
                onClick={() => setPieFocusTab('sumber')}
                className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                  pieFocusTab === 'sumber' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Sumber
              </button>
            </div>
          </div>

          <div className="h-[210px] w-full flex items-center justify-center relative">
            {pieFocusTab === 'kesejahteraan' ? (
              statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${value} Klien`, 'Jumlah']}
                      contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '10px', fontSize: '10px', border: 'none' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-xs text-center">Tidak ada klasifikasi data.</div>
              )
            ) : (
              sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${value} Laporan`, 'Jumlah']}
                      contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '10px', fontSize: '10px', border: 'none' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-xs text-center">Tidak ada pembagian sumber.</div>
              )
            )}
            
            {/* Center label inside Doughnut */}
            <div className="absolute text-center flex flex-col pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Total</span>
              <span className="text-xl font-black text-slate-800 leading-none mt-0.5">{metrics.total}</span>
            </div>
          </div>

          {/* Custom Labels Legend Grid */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-150">
            {pieFocusTab === 'kesejahteraan' ? (
              statusData.map((st) => (
                <div key={st.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: st.color }}></div>
                  <span className="text-[9px] font-bold text-slate-600 truncate">{st.name}: <span className="text-slate-900 font-mono font-extrabold">{st.value}</span></span>
                </div>
              ))
            ) : (
              sourceData.map((st) => (
                <div key={st.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: st.color }}></div>
                  <span className="text-[9px] font-bold text-slate-600 truncate">{st.name}: <span className="text-slate-900 font-mono font-extrabold">{st.value}</span></span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CARD 3: TREN PENGADUAN BULANAN (Monthly trend of complaints to monitor facilitator workload) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-sans">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4.5 h-4.5 text-indigo-650" />
            <div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">
                Tren Pengaduan &amp; Beban Kerja Bulanan
              </h2>
              <p className="text-[10px] text-slate-400 leading-normal mt-1 italic">
                Memantau fluktuasi aduan masuk vs kontribusi penyelesaian verifikasi fisik fasilitator lapangan
              </p>
            </div>
          </div>
          <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded-lg font-black uppercase font-mono">
            Tahun 2026
          </span>
        </div>

        <div className="h-[250px] w-full" id="chart-trend-bulanan-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyTrendData}
              margin={{ top: 10, right: 30, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="bulan" 
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 650 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 650 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  borderRadius: '12px', 
                  color: '#fff', 
                  border: 'none',
                  fontFamily: 'sans-serif',
                  fontSize: '11px',
                  padding: '8px 12px',
                }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontWeight: 'bold' }}
                iconType="circle"
              />
              <Line 
                type="monotone" 
                dataKey="Jumlah Aduan" 
                stroke="#4f46e5" 
                strokeWidth={3} 
                activeDot={{ r: 6 }} 
                name="Aduan Baru Masuk"
              />
              <Line 
                type="monotone" 
                dataKey="Selesai Verifikasi" 
                stroke="#10b981" 
                strokeWidth={3} 
                name="Selesai Kunjungan Lapangan"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Map Heatmap of Incoming complaints with captured coordinate Geotags */}
      <GeotagHeatmapMap records={records} onSelectRecord={onSelectRecord} />

      {/* Grid Row Breakdown list by Kelurahan & Percentage coverage */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Map className="w-4.5 h-4.5 text-indigo-600" />
            <div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                Breakdown Sebaran & Capaian Kelurahan
              </h2>
              <p className="text-[10px] text-slate-400 leading-normal mt-0.5 italic">
                Rincian persebaran laporan masuk dan total pencapaian survei fisik oleh fasilitator daerah
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-black uppercase font-mono self-start sm:self-auto shrink-0">
            📡 Pemetaan Terpantau: {breakdownByLocation.length} Kelurahan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left" id="summary-breakdown-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                <th className="py-2.5 px-4">Kecamatan</th>
                <th className="py-2.5 px-4">Kelurahan</th>
                <th className="py-2.5 px-4 text-center">Total Klien</th>
                <th className="py-2.5 px-4 text-center">Dikunjungi</th>
                <th className="py-2.5 px-4">Persentase Capaian</th>
                <th className="py-2.5 px-4 text-right">Status Wilayah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs font-sans text-slate-700">
              {breakdownByLocation.length > 0 ? (
                breakdownByLocation.map((loc, i) => {
                  const barColor = loc.percent === 100 
                    ? 'bg-emerald-500' 
                    : loc.percent > 40 
                    ? 'bg-indigo-500' 
                    : 'bg-amber-500';

                  return (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 text-slate-900 font-extrabold">{loc.kecamatan}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-medium">Kel. {loc.kelurahan}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">{loc.total}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-700">{loc.visited}</td>
                      <td className="py-2.5 px-4 select-none">
                        <div className="flex items-center gap-2 max-w-[120px]">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor}`} style={{ width: `${loc.percent}%` }}></div>
                          </div>
                          <span className="font-mono text-[10px] font-black text-slate-600 shrink-0 w-8 text-right">{loc.percent}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right select-none">
                        {loc.percent === 100 ? (
                          <span className="text-[8px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md uppercase">Tuntas ✓</span>
                        ) : (
                          <span className="text-[8px] font-black bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase">Berjalan</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    Tidak ada persebaran data wilayah.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
