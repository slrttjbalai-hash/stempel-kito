import React, { useMemo, useState } from 'react';
import { SLRTRecord, KELURAHAN_COORDS } from '../types';
import { 
  Map, 
  Layers, 
  MapPin, 
  Compass, 
  Flame, 
  Info, 
  Target, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  X,
  Plus,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface GeotagHeatmapMapProps {
  records: SLRTRecord[];
  onSelectRecord?: (recordId: string) => void;
}

// Bounding box of Kota Tanjungbalai
const MAP_BOUNDS = {
  minLat: 2.935,
  maxLat: 3.008,
  minLng: 99.768,
  maxLng: 99.842
};

export default function GeotagHeatmapMap({ records, onSelectRecord }: GeotagHeatmapMapProps) {
  const [viewMode, setViewMode] = useState<'heatmap' | 'pins'>('heatmap');
  const [filterType, setFilterType] = useState<'all' | 'unvisited' | 'high_priority' | 'geotagged'>('all');
  const [selectedPin, setSelectedPin] = useState<SLRTRecord | null>(null);
  const [hoveredPin, setHoveredPin] = useState<SLRTRecord | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // Zoom level for visual comfort
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: (MAP_BOUNDS.minLat + MAP_BOUNDS.maxLat) / 2,
    lng: (MAP_BOUNDS.minLng + MAP_BOUNDS.maxLng) / 2
  });

  // Calculate percentage positions based on bounding box
  const getXYPercent = (lat: number, lng: number) => {
    const latSpan = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat;
    const lngSpan = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng;

    // Apply zoom and panning offsets relative to map center
    const x = ((lng - MAP_BOUNDS.minLng) / lngSpan) * 100;
    const y = 100 - ((lat - MAP_BOUNDS.minLat) / latSpan) * 100;

    return { x, y };
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Exclude deleted records
      if (r.isDeleted === true || r.isDeleted === 'true') return false;

      switch (filterType) {
        case 'unvisited':
          return r.statusKunjungan !== 'Sudah Dikunjungi';
        case 'high_priority':
          return r.isHighPriority || r.status?.toLowerCase().includes('sangat');
        case 'geotagged':
          return r.statusKunjungan === 'Sudah Dikunjungi' && r.dokumentasiBukti;
        default:
          return true;
      }
    });
  }, [records, filterType]);

  // Aggregate stats per Kelurahan for hotspot calculation
  const kelurahanHotspots = useMemo(() => {
    const counts: Record<string, { total: number; unvisited: number; lat: number; lng: number; kecamatan: string }> = {};
    
    records.forEach(r => {
      if (r.isDeleted === true || r.isDeleted === 'true') return;
      const kel = r.kelurahan || 'Tidak Diketahui';
      const kec = r.kecamatan || 'Tidak Diketahui';
      if (!counts[kel]) {
        const coords = KELURAHAN_COORDS[kel] || { lat: 2.9645, lng: 99.8005 };
        counts[kel] = { total: 0, unvisited: 0, lat: coords.lat, lng: coords.lng, kecamatan: kec };
      }
      counts[kel].total += 1;
      if (r.statusKunjungan !== 'Sudah Dikunjungi') {
        counts[kel].unvisited += 1;
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [records]);

  // Handle auto centering map on selected hotspot
  const handleSpotlightHotspot = (lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    // Find closest record near this kelurahan
    const nearRec = records.find(r => r.kelurahan && KELURAHAN_COORDS[r.kelurahan]?.lat === lat);
    if (nearRec) {
      setSelectedPin(nearRec);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col gap-0 select-none">
      
      {/* Title Header with status bar */}
      <div className="p-4 border-b border-slate-150 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 animate-pulse">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">
              Peta Sebaran &amp; Heatmap Kepadatan Aduan Geotagging
            </h2>
            <p className="text-[10px] text-slate-400 leading-normal mt-1 italic">
              Visualisasi persebaran spasial real-time berdasarkan titik koordinat GPS dari kunjungan lapangan verifikator
            </p>
          </div>
        </div>

        {/* Action Controls for Map display */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Display Map Mode */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'heatmap' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Aktifkan tampilan Heatmap Kepadatan Spasial"
            >
              <Flame className="w-3 h-3" /> Heatmap
            </button>
            <button
              onClick={() => setViewMode('pins')}
              className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'pins' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilkan pin marker individu pada koordinat"
            >
              <MapPin className="w-3 h-3" /> Pin Lokasi
            </button>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'unvisited', label: 'Antrean' },
              { id: 'high_priority', label: 'Prioritas' },
              { id: 'geotagged', label: 'Verified Geotag' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterType(btn.id as any)}
                className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
                  filterType === btn.id ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid containing Map canvas and Hotspot stats sidebar */}
      <div className="grid grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-150">
        
        {/* Left Side: Interactive GIS Map Canvas */}
        <div className="col-span-12 md:col-span-8 p-4 bg-slate-950 flex flex-col justify-between min-h-[440px] relative overflow-hidden">
          
          {/* Subtle radar scan background grid effect */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-15 pointer-events-none"></div>
          
          {/* Legend HUD overlay left */}
          <div className="absolute left-4 top-4 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 pointer-events-auto flex flex-col gap-2 shadow-xl shrink-0 max-w-[220px]">
            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-rose-500 animate-[spin_5s_linear_infinite]" /> PETA GIS TANJUNGBALAI
            </span>
            <hr className="border-slate-800" />
            <div className="text-[9px] text-slate-300 font-medium space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                <span>Prioritas / Sangat Miskin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
                <span>Miskin / Rentan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                <span>Selesai Geotag</span>
              </div>
              <hr className="border-slate-800 my-1" />
              <div className="text-[8px] text-slate-400 mt-1">
                Letak spasial dihitung dinamis dari data koordinat GPS pelaporan.
              </div>
            </div>
          </div>

          {/* Compass / Zoom Hud Right */}
          <div className="absolute right-4 top-4 z-20 flex flex-col gap-1.5">
            <div className="bg-slate-900/95 border border-slate-800 p-1.5 rounded-lg text-slate-400 text-center font-mono text-[8px] flex flex-col items-center">
              <span className="font-black text-rose-500">N</span>
              <span className="text-[6px]">▲</span>
            </div>
            
            <div className="flex flex-col bg-slate-900/95 border border-slate-800 rounded-lg overflow-hidden">
              <button 
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
                className="p-1 px-2 text-white hover:bg-slate-800 transition-colors text-[10px] font-black cursor-pointer border-b border-slate-800"
                title="Perbesar Peta"
              >
                +
              </button>
              <button 
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))}
                className="p-1 px-2 text-white hover:bg-slate-800 transition-colors text-[10px] font-black cursor-pointer"
                title="Perkecil Peta"
              >
                −
              </button>
            </div>
          </div>

          {/* Active coordinates of mouse tracking or center */}
          <div className="absolute left-4 bottom-4 z-20 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-md border border-slate-800 text-[8px] font-mono text-slate-400 space-x-2 flex">
            <span>📡 GPS CENTER: {mapCenter.lat.toFixed(5)}, {mapCenter.lng.toFixed(5)}</span>
            <span className="text-slate-600">|</span>
            <span>DATA TERMAPPING: {filteredRecords.length} TITIK</span>
          </div>

          {/* Hover popup micro tooltip */}
          {hoveredPin && (
            <div 
              className="absolute z-40 bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700 shadow-xl max-w-[200px] pointer-events-none transition-all duration-150"
              style={{
                left: `${getXYPercent(hoveredPin.latitude || 2.96, hoveredPin.longitude || 99.8).x}%`,
                top: `${getXYPercent(hoveredPin.latitude || 2.96, hoveredPin.longitude || 99.8).y - 8}%`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="text-[10px] font-black truncate">{hoveredPin.namaKlien}</div>
              <div className="text-[8px] text-indigo-400 font-semibold">{hoveredPin.kelurahan}, {hoveredPin.kecamatan}</div>
              <hr className="border-slate-800 my-1" />
              <div className="text-[8px] text-slate-300 line-clamp-2 leading-relaxed italic">
                "{hoveredPin.jenisPengaduan || 'No issues declared'}"
              </div>
              <div className="text-[7px] font-mono text-slate-500 mt-1">
                Lat: {hoveredPin.latitude?.toFixed(5)}, Lon: {hoveredPin.longitude?.toFixed(5)}
              </div>
            </div>
          )}

          {/* Plotting Canvas Stage Container */}
          <div 
            className="w-full h-full min-h-[380px] relative transition-transform duration-300"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center'
            }}
          >
            {/* Visual outlines representing Kecamatan core zones of Tanjungbalai */}
            {/* These are styled geometric landmarks to represent the real shape of Tanjungbalai on the coordinate map */}
            <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Datuk Bandar & Datuk Bandar Timur (South/West Areas) */}
              <path d="M 5,95 Q 25,65 30,50 T 60,35 T 85,35" fill="none" stroke="#312e81" strokeWidth="1" strokeDasharray="2 3" />
              <text x="20" y="75" className="fill-indigo-500/80 font-black text-[2px] tracking-widest uppercase">KEC. DATUK BANDAR</text>
              <text x="65" y="70" className="fill-indigo-500/80 font-black text-[2px] tracking-widest uppercase">DATUK BANDAR TIMUR</text>
              
              {/* Tanjungbalai Selatan & Utara (Center Area) */}
              <circle cx="50" cy="45" r="15" fill="none" stroke="#1e1b4b" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x="42" y="47" className="fill-indigo-400 font-extrabold text-[2.2px] uppercase">TB SELATAN</text>
              <text x="45" y="38" className="fill-indigo-400 font-extrabold text-[2.2px] uppercase">TB UTARA</text>
              
              {/* Sei Tualang Raso & Teluk Nibung (North Area) */}
              <path d="M 25,10 Q 50,20 65,10 T 95,5" fill="none" stroke="#312e81" strokeWidth="1" strokeDasharray="2 3" />
              <text x="35" y="22" className="fill-indigo-500/80 font-black text-[2px] tracking-widest uppercase">SEI TUALANG RASO</text>
              <text x="75" y="18" className="fill-indigo-500/80 font-black text-[2px] tracking-widest uppercase">TELUK NIBUNG</text>
            </svg>

            {/* Render Map Data Nodes */}
            {filteredRecords.map((rec) => {
              const lat = rec.latitude || 2.9645;
              const lng = rec.longitude || 99.8005;
              const pos = getXYPercent(lat, lng);

              // Determine color themes
              const isHighPriority = rec.isHighPriority || rec.status?.toLowerCase().includes('sangat');
              const isVisited = rec.statusKunjungan === 'Sudah Dikunjungi';

              let baseColor = 'bg-amber-500';
              let glowColor = 'shadow-amber-500/50';
              if (isHighPriority) {
                baseColor = 'bg-rose-500';
                glowColor = 'shadow-rose-500/50';
              }
              if (isVisited) {
                baseColor = 'bg-emerald-500';
                glowColor = 'shadow-emerald-500/50';
              }

              if (viewMode === 'heatmap') {
                // Return a beautiful concentric radial glow (Heatmap density representation)
                return (
                  <div
                    key={rec.id}
                    className="absolute rounded-full pointer-events-auto cursor-pointer transition-all hover:scale-125"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: isHighPriority ? '42px' : '30px',
                      height: isHighPriority ? '42px' : '30px',
                    }}
                    onMouseEnter={() => setHoveredPin(rec)}
                    onMouseLeave={() => setHoveredPin(null)}
                    onClick={() => {
                      setSelectedPin(rec);
                      setMapCenter({ lat, lng });
                    }}
                  >
                    {/* Concentric core heat layers */}
                    <div className="w-full h-full rounded-full bg-rose-600/10 blur-[1px] animate-[pulse_3s_ease-in-out_infinite] flex items-center justify-center">
                      <div className="w-3/4 h-3/4 rounded-full bg-rose-500/20 blur-[2px] flex items-center justify-center">
                        <div className="w-1/2 h-1/2 rounded-full bg-rose-500/40 blur-[1px] flex items-center justify-center">
                          <div className={`w-2 h-2 rounded-full ${baseColor} z-10`}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Return pinpoint markers
                return (
                  <button
                    key={rec.id}
                    onMouseEnter={() => setHoveredPin(rec)}
                    onMouseLeave={() => setHoveredPin(null)}
                    onClick={() => {
                      setSelectedPin(rec);
                      setMapCenter({ lat, lng });
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer p-1 rounded-full hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700 pointer-events-auto"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                    }}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white/80 shadow-md ${baseColor} ${glowColor}`}>
                      {rec.statusKunjungan === 'Sudah Dikunjungi' ? (
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                      ) : null}
                    </div>
                  </button>
                );
              }
            })}

            {/* Visual Spotlight helper ring for active selection */}
            {selectedPin && selectedPin.latitude && selectedPin.longitude && (
              <div 
                className="absolute z-0 pointer-events-none border-2 border-dashed border-indigo-400 rounded-full animate-[spin_10s_linear_infinite]"
                style={{
                  left: `${getXYPercent(selectedPin.latitude, selectedPin.longitude).x}%`,
                  top: `${getXYPercent(selectedPin.latitude, selectedPin.longitude).y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '64px',
                  height: '64px'
                }}
              >
                <div className="w-full h-full border border-indigo-400/30 rounded-full scale-125 animate-ping opacity-60"></div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Hotspot Stats & Direct Pin Summary Drawer */}
        <div className="col-span-12 md:col-span-4 flex flex-col justify-between bg-slate-50 relative min-h-[440px]">
          
          {/* Top segment: Dynamic Switchable context depending on Selection */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[380px] font-sans">
            {selectedPin ? (
              // Selection Summary Detail View
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-md font-extrabold font-mono">
                    DETAIL TITIK KOORDINAT
                  </span>
                  <button 
                    onClick={() => setSelectedPin(null)}
                    className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Card */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2 relative overflow-hidden">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 truncate leading-snug">{selectedPin.namaKlien}</h3>
                    <p className="text-[10px] text-slate-500 font-semibold">{selectedPin.kelurahan}, {selectedPin.kecamatan}</p>
                  </div>

                  <div className="text-[10px] text-slate-400 truncate capitalize leading-none pt-1">
                    Petugas: <span className="font-bold text-slate-700">{selectedPin.namaFasilitator || 'Petugas Wilayah'}</span>
                  </div>

                  {/* High Priority Badge */}
                  {(selectedPin.isHighPriority || selectedPin.status?.toLowerCase().includes('sangat')) && (
                    <div className="absolute right-3 top-3 inline-flex bg-red-50 border border-red-100 text-red-600 font-extrabold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                      MENDESAK
                    </div>
                  )}
                </div>

                {/* Issue summary */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Pernyataan Pengaduan Warga
                  </span>
                  <p className="text-[11px] text-slate-750 italic leading-relaxed">
                    "{selectedPin.jenisPengaduan || 'Tidak ada laporan tertulis.'}"
                  </p>
                </div>

                {/* Visitation info, latitude, longitude */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-slate-100 border border-slate-250 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[8px] uppercase tracking-wider">LATITUDE GPS</span>
                    <span className="font-mono text-slate-800 font-black mt-0.5 block">{selectedPin.latitude?.toFixed(6) || '0.000'}</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-250 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[8px] uppercase tracking-wider">LONGITUDE GPS</span>
                    <span className="font-mono text-slate-800 font-black mt-0.5 block">{selectedPin.longitude?.toFixed(6) || '0.000'}</span>
                  </div>
                </div>

                {/* Status Visit Row */}
                <div className="flex items-center gap-1.5 p-2 bg-white rounded-lg border border-slate-200">
                  {selectedPin.statusKunjungan === 'Sudah Dikunjungi' ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                      <span className="text-[10px] font-black text-emerald-800 uppercase animate-pulse">Selesai Diverifikasi Lapangan (Geotagged)</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                      <span className="text-[10px] font-black text-amber-800 uppercase">Mengantre Kunjungan &amp; Geotag Lapangan</span>
                    </>
                  )}
                </div>

                {/* Navigation redirection to main detail */}
                {onSelectRecord && (
                  <button
                    onClick={() => onSelectRecord(selectedPin.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors uppercase tracking-wider"
                  >
                    <Target className="w-3.5 h-3.5" /> Buka Berkas Lengkap
                  </button>
                )}
              </div>
            ) : (
              // Default view: ranking of High Density Hotspots
              <div className="flex flex-col gap-3">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> Kepadatan Aduan per Kelurahan
                </span>

                <div className="flex flex-col gap-2">
                  {kelurahanHotspots.slice(0, 5).map((spot, i) => {
                    // Density status representation
                    const badgeColor = spot.total > 4 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : spot.total > 2 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200';

                    return (
                      <div 
                        key={spot.name}
                        onClick={() => handleSpotlightHotspot(spot.lat, spot.lng)}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2 group"
                      >
                        <div>
                          <h4 className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors">Kel. {spot.name}</h4>
                          <span className="text-[8.5px] text-slate-400 font-semibold uppercase">{spot.kecamatan}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-black uppercase border px-2 py-0.5 rounded-md ${badgeColor}`}>
                            {spot.total} Aduan
                          </span>
                          {spot.unvisited > 0 && (
                            <span className="text-[8px] bg-slate-900 text-white font-black px-1.5 py-0.5 rounded-md">
                              {spot.unvisited} Tunda
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom segment with direct educational info tip */}
          <div className="bg-slate-100 p-3.5 border-t border-slate-200 flex gap-2 font-sans shrink-0">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-[9px] text-slate-500 leading-normal italic">
              <strong>Tip Administrator:</strong> Klik kelurahan atau titik pin di peta untuk memfokuskan peta, melacak asisten lapangan, dan melihat ringkasan status aduan warga di wilayah tersebut.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
