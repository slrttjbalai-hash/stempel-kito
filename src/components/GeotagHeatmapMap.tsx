import React, { useMemo, useState, useEffect, useRef } from 'react';
import { SLRTRecord, KELURAHAN_COORDS } from '../types';
import { 
  Map as MapIcon, 
  MapPin, 
  Compass, 
  Flame, 
  Info, 
  Target, 
  X,
  Plus,
  Minus,
  RefreshCw,
  Eye,
  EyeOff
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

const TANJUNGBALAI_CENTER = {
  lat: 2.9645,
  lng: 99.8005
};

export default function GeotagHeatmapMap({ records, onSelectRecord }: GeotagHeatmapMapProps) {
  const [viewMode, setViewMode] = useState<'heatmap' | 'pins'>('pins');
  const [filterType, setFilterType] = useState<'all' | 'unvisited' | 'high_priority' | 'geotagged'>('all');
  const [selectedPin, setSelectedPin] = useState<SLRTRecord | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark' | 'light'>('dark');
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(TANJUNGBALAI_CENTER);
  const [currentZoom, setCurrentZoom] = useState<number>(13);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapInstanceRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);

  // Dynamic injection of Leaflet CSS & JS
  useEffect(() => {
    // Inject CSS
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Inject JS
    const scriptId = 'leaflet-js';
    if (!(window as any).L) {
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = () => {
          setLeafletLoaded(true);
        };
        document.body.appendChild(script);
      }
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (r.isDeleted === true || r.isDeleted === 'true') return false;

      switch (filterType) {
        case 'unvisited':
          return r.statusKunjungan !== 'Sudah Dikunjungi';
        case 'high_priority':
          return r.isHighPriority || r.status?.toLowerCase().includes('sangat');
        case 'geotagged':
          return r.statusKunjungan === 'Sudah Dikunjungi';
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

  // Handle Map Initialization
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Destroy existing instance to prevent duplicates
    if (leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.remove();
      leafletMapInstanceRef.current = null;
    }

    // Create Leaflet Map centered on Tanjungbalai
    const map = L.map(mapContainerRef.current, {
      center: [TANJUNGBALAI_CENTER.lat, TANJUNGBALAI_CENTER.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    leafletMapInstanceRef.current = map;

    // Add clean attribution
    L.control.attribution({ prefix: false }).addTo(map);

    // Set openstreetmap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Create marker layer group
    const markerGroup = L.layerGroup().addTo(map);
    markerGroupRef.current = markerGroup;

    // Setup map event listeners
    map.on('moveend', () => {
      const center = map.getCenter();
      setMapCenter({ lat: center.lat, lng: center.lng });
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    return () => {
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
        leafletMapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Update Markers when data, filter types or viewModes change
  useEffect(() => {
    const L = (window as any).L;
    if (!leafletMapInstanceRef.current || !markerGroupRef.current || !L) return;

    // Clear old markers
    markerGroupRef.current.clearLayers();

    filteredRecords.forEach((rec) => {
      const lat = rec.latitude;
      const lng = rec.longitude;
      if (!lat || !lng) return;

      const isHighPriority = rec.isHighPriority || rec.status?.toLowerCase().includes('sangat');
      const isVisited = rec.statusKunjungan === 'Sudah Dikunjungi';

      let markerHtml = '';

      if (viewMode === 'heatmap') {
        // Red, amber, or green glowing circles
        const color = isHighPriority ? '#ef4444' : isVisited ? '#10b981' : '#f59e0b';
        const shadow = isHighPriority ? 'rgba(239, 68, 68, 0.4)' : isVisited ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';
        markerHtml = `
          <div class="relative flex items-center justify-center" style="width: 44px; height: 44px;">
            <div class="absolute w-full h-full rounded-full animate-ping opacity-25" style="background-color: ${color};"></div>
            <div class="absolute w-8 h-8 rounded-full opacity-35 blur-[3px]" style="background-color: ${color}; box-shadow: 0 0 8px ${shadow};"></div>
            <div class="w-3.5 h-3.5 rounded-full border border-white/90 shadow-md" style="background-color: ${color};"></div>
          </div>
        `;
      } else {
        // High fidelity map pin markers
        const iconBg = isHighPriority ? 'bg-rose-500' : isVisited ? 'bg-emerald-500' : 'bg-amber-500';
        const ringBg = isHighPriority ? 'border-rose-200' : isVisited ? 'border-emerald-200' : 'border-amber-200';
        const dotBg = isVisited ? '<div class="w-1.5 h-1.5 bg-white rounded-full"></div>' : '<div class="w-1 h-1 bg-white/70 rounded-full"></div>';
        
        markerHtml = `
          <div class="relative flex items-center justify-center">
            <div class="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md ${iconBg} ${ringBg}">
              ${dotBg}
            </div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-div-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markerGroupRef.current);

      // Create micro-card popup content matching Tanjungbalai SLRT styles
      const priorityLabel = isHighPriority 
        ? `<span class="bg-rose-500/15 text-rose-400 font-extrabold px-1.5 py-0.5 rounded border border-rose-500/25 ml-1.5">MENDESAK</span>` 
        : '';
      const statusText = isVisited 
        ? `<span class="text-emerald-400 font-black flex items-center gap-1">🟢 TERVERIFIKASI</span>` 
        : `<span class="text-amber-400 font-black flex items-center gap-1">🟡 DALAM ANTREAN</span>`;

      const popupHtml = `
        <div class="p-1 px-1.5 max-w-[220px] font-sans text-slate-100">
          <div class="border-b border-slate-700/80 pb-2 mb-2">
            <h4 class="font-extrabold text-[12.5px] leading-snug text-white truncate">${rec.namaKlien}</h4>
            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">${rec.kelurahan}, ${rec.kecamatan}</p>
          </div>
          <div class="text-[10px] text-slate-300 italic mb-2.5 leading-normal line-clamp-3">
            "${rec.jenisPengaduan || 'Pengaduan kelayakan rujukan kesejahteraan sosial.'}"
          </div>
          <div class="space-y-1.5 text-[9px] text-slate-400">
            <div class="flex justify-between items-center bg-slate-900/40 p-1 px-1.5 rounded border border-slate-800/40">
              <span>Status Kunjungan</span>
              <span class="font-bold">${statusText}</span>
            </div>
            <div>Petugas Pendata: <b class="text-slate-100">${rec.namaFasilitator || 'Petugas SLRT'}</b></div>
            <div class="pt-1.5 border-t border-slate-800/60 font-mono text-[8.5px] text-slate-500 flex justify-between">
              <span>Lat: ${lat.toFixed(5)}</span>
              <span>Lng: ${lng.toFixed(5)}</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'slrt-theme-popup',
        closeButton: false,
        offset: [0, -4]
      });

      // Synchronize selection on pin click
      marker.on('click', () => {
        setSelectedPin(rec);
        // Center view on coordinate
        leafletMapInstanceRef.current?.setView([lat, lng], 15, { animate: true });
      });
    });
  }, [filteredRecords, viewMode, leafletLoaded]);

  // Recenter Map on Tanjungbalai
  const handleRecenter = () => {
    if (leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.setView([TANJUNGBALAI_CENTER.lat, TANJUNGBALAI_CENTER.lng], 13, { animate: true });
    }
  };

  // ZOOM Controllers
  const handleZoomIn = () => {
    if (leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.zoomOut();
    }
  };

  // Hotspot spotlight action
  const handleSpotlightHotspot = (lat: number, lng: number, name: string) => {
    setMapCenter({ lat, lng });
    if (leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.setView([lat, lng], 15, { animate: true });
    }
    // Find closest record in this kelurahan
    const nearRec = records.find(r => r.kelurahan === name);
    if (nearRec) {
      setSelectedPin(nearRec);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col gap-0 select-none">
      
      {/* Styles Injection for Customized Leaflet Dark & Light theme maps */}
      <style>{`
        /* Dark Theme filter for tile layer */
        .leaflet-dark-style .leaflet-tile-container {
          filter: invert(0.9) hue-rotate(185deg) brightness(0.9) contrast(1.15) saturate(0.85);
        }
        .leaflet-dark-style {
          background-color: #020617 !important;
        }

        /* Custom modern dark theme popup */
        .slrt-theme-popup .leaflet-popup-content-wrapper {
          background: #0f172a !important; /* Slate 900 */
          color: #f8fafc !important; /* Slate 50 */
          border-radius: 12px;
          border: 1px solid #334155; /* Slate 700 */
          font-family: inherit;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
        }
        .slrt-theme-popup .leaflet-popup-tip {
          background: #0f172a !important;
          border: 1px solid #334155;
        }
        .leaflet-container {
          z-index: 10 !important;
        }
      `}</style>

      {/* Map Control Title Bar */}
      <div className="p-4 border-b border-slate-150 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 animate-pulse">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">
              Peta Sebaran &amp; Heatmap Kependudukan Geotagging
            </h2>
            <p className="text-[10px] text-slate-400 leading-normal mt-1 italic">
              Visualisasi tata ruang sebaran kasus aduan real-time terintegrasi dengan peta satelit OpenStreetMap Kota Tanjungbalai
            </p>
          </div>
        </div>

        {/* Action Controls for Map display */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Map Style Switcher (Dark/Light Map) */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                mapStyle === 'dark' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Mode Gelap
            </button>
            <button
              onClick={() => setMapStyle('light')}
              className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                mapStyle === 'light' ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Mode Terang
            </button>
          </div>

          {/* Toggle Display Map Mode (Pins vs. Heatmap) */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'heatmap' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Flame className="w-3 h-3" /> Heatmap
            </button>
            <button
              onClick={() => setViewMode('pins')}
              className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'pins' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapPin className="w-3 h-3" /> Pin Lokasi
            </button>
          </div>

          {/* Status Filter for map markers */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            {[
              { id: 'all', label: 'Semu' },
              { id: 'unvisited', label: 'Antrean' },
              { id: 'high_priority', label: 'Prioritas' },
              { id: 'geotagged', label: 'Verified' }
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
        <div className="col-span-12 md:col-span-8 p-0 bg-slate-950 flex flex-col justify-end min-h-[460px] relative overflow-hidden">
          
          {/* Legend HUD overlay left */}
          <div className="absolute left-4 top-4 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 pointer-events-auto flex flex-col gap-2 shadow-xl shrink-0 max-w-[210px] font-sans">
            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-rose-500 animate-[spin_10s_linear_infinite]" /> PETA GIS TANJUNGBALAI
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
                <span>Kunjungan Verified</span>
              </div>
              <hr className="border-slate-800 my-1" />
              <div className="text-[8px] text-slate-400 mt-1">
                Peta interaktif nyata dengan sebaran titik GPS terverifikasi lapangan.
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
                onClick={handleZoomIn}
                className="p-1.5 px-2.5 text-white hover:bg-slate-800 transition-colors text-xs font-black cursor-pointer border-b border-slate-800"
                title="Zoom In"
              >
                <Plus className="w-3 h-3 text-slate-200" />
              </button>
              <button 
                onClick={handleZoomOut}
                className="p-1.5 px-2.5 text-white hover:bg-slate-800 transition-colors text-xs font-black cursor-pointer border-b border-slate-800"
                title="Zoom Out"
              >
                <Minus className="w-3 h-3 text-slate-300" />
              </button>
              <button 
                onClick={handleRecenter}
                className="p-1.5 px-2.5 text-indigo-400 hover:bg-slate-800 transition-colors text-xs font-black cursor-pointer"
                title="Segarkan Posisi Pusat Kota"
              >
                <RefreshCw className="w-3 h-3 text-indigo-300" />
              </button>
            </div>
          </div>

          {/* Active coordinates of mouse tracking or center */}
          <div className="absolute left-4 bottom-4 z-20 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[8.5px] font-mono text-slate-400 space-x-2 flex items-center">
            <span className="flex items-center gap-1 text-teal-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> GPS CENTER:</span>
            <span>{mapCenter.lat.toFixed(5)}, {mapCenter.lng.toFixed(5)}</span>
            <span className="text-slate-700">|</span>
            <span>ZOOM: {currentZoom}</span>
            <span className="text-slate-700">|</span>
            <span className="text-white font-extrabold">{filteredRecords.length} DATA AKTIF</span>
          </div>

          {/* Leaflet Map canvas wrapper */}
          <div 
            ref={mapContainerRef} 
            className={`w-full h-full min-h-[460px] ${mapStyle === 'dark' ? 'leaflet-dark-style' : ''}`}
            id="slrt-interactive-map-container"
          />

          {!leafletLoaded && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-30">
              <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
              <p className="text-slate-300 text-xs font-bold font-sans tracking-wide">Memuat Sistem Integrasi Geospasial GIS...</p>
            </div>
          )}
        </div>

        {/* Right Side: Hotspot Stats & Direct Pin Summary Drawer */}
        <div className="col-span-12 md:col-span-4 flex flex-col justify-between bg-slate-50 relative min-h-[460px]">
          
          {/* Top segment: Dynamic Switchable context depending on Selection */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[390px] font-sans">
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
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2 relative overflow-hidden">
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
                  <div className="bg-slate-100 border border-slate-200 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[8px] uppercase tracking-wider">LATITUDE GPS</span>
                    <span className="font-mono text-slate-800 font-black mt-0.5 block">{selectedPin.latitude?.toFixed(6) || '0.00000'}</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[8px] uppercase tracking-wider">LONGITUDE GPS</span>
                    <span className="font-mono text-slate-800 font-black mt-0.5 block">{selectedPin.longitude?.toFixed(6) || '0.00000'}</span>
                  </div>
                </div>

                {/* Status Visit Row */}
                <div className="flex items-center gap-1.5 p-2 px-2.5 bg-white rounded-lg border border-slate-200">
                  {selectedPin.statusKunjungan === 'Sudah Dikunjungi' ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                      <span className="text-[9.5px] font-black text-emerald-800 uppercase">Selesai Lapangan (Geotagged)</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                      <span className="text-[9.5px] font-black text-amber-800 uppercase text-amber-605">Mengantre Survei Geotag</span>
                    </>
                  )}
                </div>

                {/* Navigation redirection to main detail */}
                {onSelectRecord && (
                  <button
                    onClick={() => onSelectRecord(selectedPin.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors uppercase tracking-wider"
                  >
                    <Target className="w-3.5 h-3.5" /> Buka Berkas Lengkap
                  </button>
                )}
              </div>
            ) : (
              // Default view: ranking of High Density Hotspots
              <div className="flex flex-col gap-3">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-1.5 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-500" /> Kepadatan Aduan per Kelurahan
                </span>

                <div className="flex flex-col gap-2 max-h-[330px] overflow-y-auto pr-1">
                  {kelurahanHotspots.slice(0, 7).map((spot) => {
                    const badgeColor = spot.total > 4 
                      ? 'bg-rose-50 text-rose-700 border-rose-250' 
                      : spot.total > 2 
                      ? 'bg-amber-50 text-amber-700 border-amber-250' 
                      : 'bg-indigo-50 text-indigo-700 border-indigo-250';

                    return (
                      <div 
                        key={spot.name}
                        onClick={() => handleSpotlightHotspot(spot.lat, spot.lng, spot.name)}
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
              <strong>Tip Geospasial:</strong> Gunakan tombol "Mode Gelap/Gaya GIS" untuk memantau sebaran seolah-olah mengoperasikan layar radar command center dinas sosial, dan klik kelurahan pada daftar untuk fokus dan menggali rincian titik koordinat terkait.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
