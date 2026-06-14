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
  Map,
  FileText,
  Download,
  Calendar
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import GeotagHeatmapMap from './GeotagHeatmapMap';

interface DashboardSummaryProps {
  key?: string;
  records: SLRTRecord[];
  onSelectRecord?: (recordId: string) => void;
}

export default function DashboardSummary({ records, onSelectRecord }: DashboardSummaryProps) {
  // State for Monthly Report Selector (Auto prefilled with current Month & Year of running date)
  const monthsIndo = useMemo(() => [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ], []);

  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthsIndo[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Filter records for the selected Month & Year
  const filteredMonthlyRecords = useMemo(() => {
    return records.filter(r => {
      const dateStr = r.hariTanggal || '';
      const lowerStr = dateStr.toLowerCase();
      const targetMonthLower = selectedMonth.toLowerCase();
      const targetYearStr = selectedYear.toString();
      
      // Look for Month name and Year in the input date string (e.g. "Senin, 01 Juni 2026")
      if (lowerStr.includes(targetMonthLower) && lowerStr.includes(targetYearStr)) {
        return true;
      }
      
      // Fallback: Date parsing
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        if (monthsIndo[parsedDate.getMonth()].toLowerCase() === targetMonthLower && parsedDate.getFullYear() === selectedYear) {
          return true;
        }
      }
      
      // Fallback 2: Check check-in timestamp (tanggalPemeriksaan)
      const examStr = r.tanggalPemeriksaan || '';
      const examLower = examStr.toLowerCase();
      if (examLower.includes(targetMonthLower) && examLower.includes(targetYearStr)) {
        return true;
      }
      
      return false;
    });
  }, [records, selectedMonth, selectedYear, monthsIndo]);

  // Summarize visit count per sub-district (Kecamatan) for this filtered month
  const monthlyKecamatanSummary = useMemo(() => {
    const standardKec = [
      'Tanjungbalai Selatan',
      'Tanjungbalai Utara',
      'Sei Tualang Raso',
      'Teluk Nibung',
      'Datuk Bandar',
      'Datuk Bandar Timur'
    ];
    
    const otherKec = new Set<string>();
    filteredMonthlyRecords.forEach(r => {
      if (r.kecamatan) {
        const trimmed = r.kecamatan.trim();
        if (trimmed && !standardKec.some(sk => sk.toLowerCase() === trimmed.toLowerCase())) {
          otherKec.add(trimmed);
        }
      }
    });
    
    const allKec = [...standardKec, ...Array.from(otherKec)];
    
    return allKec.map(kec => {
      const recordsInKec = filteredMonthlyRecords.filter(r => (r.kecamatan || '').trim().toLowerCase() === kec.toLowerCase());
      const total = recordsInKec.length;
      const visited = recordsInKec.filter(r => r.statusKunjungan === 'Sudah Dikunjungi').length;
      const pending = total - visited;
      const percentage = total > 0 ? Math.round((visited / total) * 100) : 0;
      
      return {
        kecamatan: kec,
        total,
        visited,
        pending,
        percentage
      };
    }).filter(k => k.total > 0 || standardKec.includes(k.kecamatan));
  }, [filteredMonthlyRecords]);

  // Premium PDF Monthly Report Exporter with Kop Surat and Auto Page Breaks
  const handleExportMonthlyPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const docWidth = 210;
    const docHeight = 297;
    const leftMargin = 15;
    const rightMargin = 15;
    const usableWidth = docWidth - leftMargin - rightMargin;

    let totalPages = 1;

    // Inner page header callback
    const startNewPage = () => {
      doc.addPage();
      totalPages++;
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`LAPORAN BULANAN SLRT KITO   |   Bulan: ${selectedMonth} ${selectedYear}`, leftMargin, 12);
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.2);
      doc.line(leftMargin, 14, docWidth - rightMargin, 14);
      return 20; // content starts at target Y
    };

    let currentY = 15;

    const checkSpaceAndBreaks = (heightNeeded: number) => {
      if (currentY + heightNeeded > 270) {
        currentY = startNewPage();
      }
      return currentY;
    };

    // Letterhead (KOP SURAT)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("PEMERINTAH KOTA TANJUNGBALAI", docWidth / 2, currentY, { align: 'center' });
    
    currentY += 5;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 118, 110); // teal-700
    doc.text("DINAS SOSIAL - SEKRETARIAT SLRT KITO", docWidth / 2, currentY, { align: 'center' });
    
    currentY += 4.5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Jl. Jenderal Sudirman No. 12 Tanjungbalai, Kode Pos: 21321, Sumatera Utara", docWidth / 2, currentY, { align: 'center' });
    
    currentY += 4;
    doc.setFont('Helvetica', 'oblique');
    doc.setFontSize(7.5);
    doc.text("Email: slrttjbalai@gmail.com   |   Sistem Integrasi Penanganan Kemiskinan Berbasis Cloud", docWidth / 2, currentY, { align: 'center' });
    
    currentY += 3;
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.6);
    doc.line(leftMargin, currentY, docWidth - rightMargin, currentY);
    
    currentY += 1.5;
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, currentY, docWidth - rightMargin, currentY);

    currentY += 8;

    // Report Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("LAPORAN BULANAN MONITORING & CAPAIAN VERIFIKASI LAPANGAN", docWidth / 2, currentY, { align: 'center' });
    
    currentY += 5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Periode Laporan: Bulan ${selectedMonth} ${selectedYear}`, docWidth / 2, currentY, { align: 'center' });
    
    currentY += 4.5;
    const nowFormatted = new Date().toLocaleString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    doc.setFont('Helvetica', 'oblique');
    doc.setFontSize(7.5);
    doc.text(`Waktu Cetak: ${nowFormatted} WIB`, docWidth / 2, currentY, { align: 'center' });

    currentY += 8;

    // SECTION 1: STATISTICS CARDS
    checkSpaceAndBreaks(35);
    
    doc.setFillColor(241, 245, 249);
    doc.rect(leftMargin, currentY, usableWidth, 6, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110);
    doc.text("I. RINGKASAN CAPAIAN DOKUMEN ADUAN BULANAN", leftMargin + 3, currentY + 4.5);
    
    currentY += 10;

    const totalAduan = filteredMonthlyRecords.length;
    const selesaiKunjungan = filteredMonthlyRecords.filter(r => r.statusKunjungan === 'Sudah Dikunjungi').length;
    const sisaAntrean = totalAduan - selesaiKunjungan;
    const rasioCapaian = totalAduan > 0 ? Math.round((selesaiKunjungan / totalAduan) * 100) : 0;

    const cardSpacing = 4;
    const cardWidth = (usableWidth - (cardSpacing * 3)) / 4;

    // Card 1
    doc.setFillColor(248, 250, 252);
    doc.rect(leftMargin, currentY, cardWidth, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(leftMargin, currentY, cardWidth, 18, 'S');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL ADUAN", leftMargin + 3, currentY + 5);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(totalAduan.toString(), leftMargin + 3, currentY + 12);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6);
    doc.text("Kasus terdaftar", leftMargin + 3, currentY + 16);

    // Card 2
    let offset = leftMargin + cardWidth + cardSpacing;
    doc.setFillColor(248, 250, 252);
    doc.rect(offset, currentY, cardWidth, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(offset, currentY, cardWidth, 18, 'S');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(16, 185, 129);
    doc.text("AUDIT SELESAI", offset + 3, currentY + 5);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text(selesaiKunjungan.toString(), offset + 3, currentY + 12);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("Kunjungan tuntas", offset + 3, currentY + 16);

    // Card 3
    offset = offset + cardWidth + cardSpacing;
    doc.setFillColor(248, 250, 252);
    doc.rect(offset, currentY, cardWidth, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(offset, currentY, cardWidth, 18, 'S');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(217, 119, 6);
    doc.text("SISA ANTREAN", offset + 3, currentY + 5);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(217, 119, 6);
    doc.text(sisaAntrean.toString(), offset + 3, currentY + 12);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("Menunggu survei", offset + 3, currentY + 16);

    // Card 4
    offset = offset + cardWidth + cardSpacing;
    doc.setFillColor(15, 118, 110);
    doc.rect(offset, currentY, cardWidth, 18, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("RASIO CAPAIAN", offset + 3, currentY + 5);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${rasioCapaian}%`, offset + 3, currentY + 12);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6);
    doc.text("Progres penyelesaian", offset + 3, currentY + 16);

    currentY += 24;

    // SECTION 2: KECAMATAN BREAKDOWN TABLE
    checkSpaceAndBreaks(60);

    doc.setFillColor(241, 245, 249);
    doc.rect(leftMargin, currentY, usableWidth, 6, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110);
    doc.text("II. RINGKASAN DISTRIBUSI AUDIT KUNJUNGAN PER KECAMATAN", leftMargin + 3, currentY + 4.5);

    currentY += 10;

    // Header
    doc.setFillColor(15, 118, 110);
    doc.rect(leftMargin, currentY, usableWidth, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("No", leftMargin + 3, currentY + 5.5);
    doc.text("Kecamatan", leftMargin + 12, currentY + 5.5);
    doc.text("Total Aduan", leftMargin + 75, currentY + 5.5, { align: 'center' });
    doc.text("Sudah Dikunjungi", leftMargin + 105, currentY + 5.5, { align: 'center' });
    doc.text("Sisa Antrean", leftMargin + 135, currentY + 5.5, { align: 'center' });
    doc.text("Persentase Capaian", leftMargin + 165, currentY + 5.5, { align: 'center' });

    currentY += 8;

    let idx = 1;
    let sumTotal = 0;
    let sumVisited = 0;
    let sumPending = 0;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    monthlyKecamatanSummary.forEach((row) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(leftMargin, currentY, usableWidth, 6.5, 'F');
      }
      
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.15);
      doc.line(leftMargin, currentY + 6.5, docWidth - rightMargin, currentY + 6.5);

      doc.setFont('Helvetica', 'bold');
      doc.text(idx.toString(), leftMargin + 3, currentY + 4.5);
      doc.setFont('Helvetica', 'normal');
      doc.text(row.kecamatan, leftMargin + 12, currentY + 4.5);
      doc.text(row.total.toString(), leftMargin + 75, currentY + 4.5, { align: 'center' });
      doc.text(row.visited.toString(), leftMargin + 105, currentY + 4.5, { align: 'center' });
      doc.text(row.pending.toString(), leftMargin + 135, currentY + 4.5, { align: 'center' });
      doc.setFont('Helvetica', 'bold');
      doc.text(`${row.percentage}%`, leftMargin + 165, currentY + 4.5, { align: 'center' });
      doc.setFont('Helvetica', 'normal');

      sumTotal += row.total;
      sumVisited += row.visited;
      sumPending += row.pending;
      idx++;
      currentY += 6.5;
    });

    // Total row
    doc.setFillColor(241, 245, 249);
    doc.rect(leftMargin, currentY, usableWidth, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(leftMargin, currentY, docWidth - rightMargin, currentY);
    doc.line(leftMargin, currentY + 8, docWidth - rightMargin, currentY + 8);

    doc.setFont('Helvetica', 'bold');
    doc.text("TOTAL KOTA TANJUNGBALAI", leftMargin + 12, currentY + 5.5);
    doc.text(sumTotal.toString(), leftMargin + 75, currentY + 5.5, { align: 'center' });
    doc.text(sumVisited.toString(), leftMargin + 105, currentY + 5.5, { align: 'center' });
    doc.text(sumPending.toString(), leftMargin + 135, currentY + 5.5, { align: 'center' });
    
    const overallPercent = sumTotal > 0 ? Math.round((sumVisited / sumTotal) * 100) : 0;
    doc.text(`${overallPercent}%`, leftMargin + 165, currentY + 5.5, { align: 'center' });

    currentY += 15;

    // SECTION 3: COMPLETED DETAILED LIST
    const completedList = filteredMonthlyRecords.filter(r => r.statusKunjungan === 'Sudah Dikunjungi');
    
    if (completedList.length > 0) {
      checkSpaceAndBreaks(25);
      doc.setFillColor(241, 245, 249);
      doc.rect(leftMargin, currentY, usableWidth, 6, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 118, 110);
      doc.text("III. RINCIAN DAFTAR KASUS SELESAI VERIFIKASI FISIK", leftMargin + 3, currentY + 4.5);
      
      currentY += 10;

      doc.setFillColor(71, 85, 105);
      doc.rect(leftMargin, currentY, usableWidth, 7, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("No", leftMargin + 3, currentY + 4.5);
      doc.text("Nama Klien", leftMargin + 12, currentY + 4.5);
      doc.text("Kelurahan / Kecamatan", leftMargin + 48, currentY + 4.5);
      doc.text("Tanggal Audit", leftMargin + 100, currentY + 4.5);
      doc.text("Status SOS", leftMargin + 132, currentY + 4.5);
      doc.text("Petugas Lapangan (Fasilitator)", leftMargin + 150, currentY + 4.5);

      currentY += 7;

      let rId = 1;
      completedList.forEach(item => {
        checkSpaceAndBreaks(8);

        if (rId % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(leftMargin, currentY, usableWidth, 6, 'F');
        }

        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.1);
        doc.line(leftMargin, currentY + 6, docWidth - rightMargin, currentY + 6);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(rId.toString(), leftMargin + 3, currentY + 4.2);
        doc.text(item.namaKlien || '-', leftMargin + 12, currentY + 4.2);
        doc.setFont('Helvetica', 'normal');
        doc.text(`${item.kelurahan || '-'}, ${item.kecamatan || '-'}`, leftMargin + 48, currentY + 4.2);
        
        let tgl = item.tanggalPemeriksaan || item.hariTanggal || '-';
        if (tgl.includes(',')) {
          tgl = tgl.split(',')[1].trim();
        }
        doc.text(tgl, leftMargin + 100, currentY + 4.2);
        doc.text(item.status || 'Miskin', leftMargin + 132, currentY + 4.2);
        doc.text(item.namaFasilitator || '-', leftMargin + 150, currentY + 4.2);

        rId++;
        currentY += 6;
      });
      currentY += 5;
    }

    // SIGNATURE SECTION
    checkSpaceAndBreaks(35);
    
    currentY += 5;
    const sigX1 = leftMargin + 10;
    const sigX2 = docWidth - rightMargin - 65;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Diverifikasi Oleh,", sigX1, currentY);
    doc.text("Penanggung Jawab SLRT KITO,", sigX2, currentY);
    
    currentY += 18;
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("( ____________________ )", sigX1, currentY);
    doc.text("( SLRT TJBALAI ADMIN )", sigX2, currentY);
    
    currentY += 4;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(115, 115, 115);
    doc.text("Penyelia Data Kelompok Jabatan", sigX1, currentY);
    doc.text("NIP. 19890520 201212 1 002", sigX2, currentY);

    // Footer decoration on all pages
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, docHeight - 14, docWidth - rightMargin, docHeight - 14);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Sekretariat Resmi SLRT KITO - Dinas Sosial Kota Tanjungbalai, Sumatera Utara", leftMargin, docHeight - 10);
      doc.text(`Halaman ${i} dari ${totalPages}`, docWidth - rightMargin, docHeight - 10, { align: 'right' });
    }

    const fileName = `Laporan_Bulanan_SLRT_${selectedMonth.replace(/\s+/g, '_')}_${selectedYear}.pdf`;
    doc.save(fileName);
  };

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

      {/* SECTION EXPORT: LAPORAN BULANAN GOVTECH INTEGRATED PANEL */}
      <div id="monthly-export-panel" className="bg-slate-50 rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Ekspor Dokumen Laporan Bulanan Resmi
              </h3>
              <p className="text-[10px] text-slate-500 font-medium italic mt-0.5">
                Penyaringan otomatis data bulan berjalan &amp; pembuatan tabel rangkuman kunjungan per kecamatan.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Month selector dropdown */}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="select-report-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-bold text-slate-705 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {monthsIndo.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year selector dropdown */}
            <select
              id="select-report-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-slate-200 text-xs font-bold text-slate-705 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {[2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Panel: Info & Summary Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left info desk */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-4">
            <div className="text-xs text-slate-600 leading-relaxed">
              <p className="font-extrabold text-slate-800 mb-1 uppercase tracking-wide text-[10px]">Penyaringan Berkas Bulan Berjalan</p>
              Sesuai dengan regulasi pelaporan Dinas Sosial Kota Tanjungbalai, modul ini membantu administrasi untuk menerbitkan berkas PDF formal yang merangkum sebaran data di <span className="font-bold text-slate-880">6 Kecamatan</span> berdasarkan tanggal input atau registrasi aduan klien.
              <p className="mt-3.5 bg-indigo-50/50 p-2.5 border border-indigo-100 rounded-xl text-[11px] text-indigo-950 font-medium leading-normal flex items-start gap-1.5">
                <span>💡</span>
                <span>Progres periode <b>{selectedMonth} {selectedYear}</b>: Terhitung <b>{filteredMonthlyRecords.length} aduan</b> terinput, dengan status <b>{filteredMonthlyRecords.filter(r => r.statusKunjungan === 'Sudah Dikunjungi').length} dikunjungi</b>.</span>
              </p>
            </div>

            <button
              id="btn-export-monthly-pdf"
              onClick={handleExportMonthlyPDF}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Unduh PDF Laporan Bulanan
            </button>
          </div>

          {/* Right Summary Table Preview */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between font-mono text-[9px] font-black text-slate-500 uppercase tracking-wider">
              <span>PRATINJAU RANGKUMAN KUNJUNGAN PER KECAMATAN ({selectedMonth.toUpperCase()} {selectedYear})</span>
              <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-sans">SINKRON</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-2.5 px-3.5">Kecamatan</th>
                    <th className="py-2.5 px-3.5 text-center">Total Target (Aduan)</th>
                    <th className="py-2.5 px-3.5 text-center text-emerald-700">Sudah Dikunjungi</th>
                    <th className="py-2.5 px-3.5 text-center text-amber-700">Belum Dikunjungi</th>
                    <th className="py-2.5 px-3.5 text-right">Rasio Capaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700">
                  {monthlyKecamatanSummary.map((row) => (
                    <tr key={row.kecamatan} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-800">{row.kecamatan}</td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-slate-900">{row.total}</td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-650">{row.visited}</td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-amber-605">{row.pending}</td>
                      <td className="py-2.5 px-3.5 text-right">
                        <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border ${
                          row.percentage === 100 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                            : row.percentage > 0 
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          {row.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredMonthlyRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold text-[11px] italic">
                        Tidak ada data aduan atau kunjungan lapangan terdaftar sepanjang periode {selectedMonth} {selectedYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
