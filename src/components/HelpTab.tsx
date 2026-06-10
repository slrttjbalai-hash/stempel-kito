import React, { useState } from 'react';
import { HelpCircle, Info, BookOpen, Database, Code, FileSpreadsheet, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

export default function HelpTab() {
  const [activeSubTab, setActiveSubTab] = useState<'parameters' | 'appscript'>('parameters');
  const [copied, setCopied] = useState(false);

  const appScriptCode = `/**
 * SLRT KITO Kota Tanjungbalai - Google Sheets Integration Script
 * 
 * Panduan Pengoperasian:
 * 1. Di Google Sheets, buka menu "Ekstensi" (Extensions) -> klik "Apps Script".
 * 2. Hapus seluruh kode bawaan yang ada di editor gs tersebut.
 * 3. Tempelkan seluruh kode di bawah ini ke editor.
 * 4. Klik ikon Simpan (disket) lalu jalankan fungsi 'setupSheet' pertama kali untuk inisiasi otomatis.
 * 5. Untuk mengaktifkan Webhook Integrasi: Klik "Terapkan" (Deploy) -> "Penerapan Baru" (New deployment).
 *    - Pilih Jenis: Aplikasi Web (Web app)
 *    - Jalankan Sebagai (Execute as): Saya (Me / Email Anda)
 *    - Siapa yang memiliki akses (Who has access): Siapa saja (Anyone)
 *    - Klik Deploy, setujui izin akses akun Anda, dan salin URL Webapp yang diberikan!
 */

const SHEET_RECORDS = "Laporan SLRT KITO";
const SHEET_FACILITATORS = "Daftar Fasilitator";

// Initial facilitators to pre-fill if the sheet is empty
const INITIAL_FACILITATORS = [
  {
    id: "fac-1",
    name: "Ahmad Fauzi",
    nik: "1274011202890001",
    regionKecamatan: "Datuk Bandar",
    regionKelurahan: "Pahang",
    phone: "081234567891",
    email: "ahmad@slrt.id",
    password: "fauzi123",
    status: "APPROVED",
    perangkat: "Sistem Utama",
    createdAt: "Senin, 01 Juni 2026"
  },
  {
    id: "fac-2",
    name: "Siti Rahma",
    nik: "1274011505920003",
    regionKecamatan: "Teluk Nibung",
    regionKelurahan: "Sei Merbau",
    phone: "081234567892",
    email: "siti@slrt.id",
    password: "rahma123",
    status: "APPROVED",
    perangkat: "Sistem Utama",
    createdAt: "Selasa, 02 Juni 2026"
  },
  {
    id: "fac-3",
    name: "Budi Hartono",
    nik: "1274012408900002",
    regionKecamatan: "Sei Tualang Raso",
    regionKelurahan: "Pasar Baru",
    phone: "081234567893",
    email: "budi@slrt.id",
    password: "hartono123",
    status: "APPROVED",
    perangkat: "Sistem Utama",
    createdAt: "Kamis, 04 Juni 2026"
  }
];

// Inisialisasi & Format Google Sheet otomatis untuk Laporan & Fasilitator
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup Laporan Sheet
  let sheetRec = ss.getSheetByName(SHEET_RECORDS);
  if (!sheetRec) {
    sheetRec = ss.insertSheet(SHEET_RECORDS);
  }
  sheetRec.clear();
  
  const headersRec = [
    "ID Record",
    "Kecamatan",
    "Kelurahan",
    "Hari/Tanggal Input",
    "Nama Klien",
    "Pekerjaan Kepala RT",
    "Nama Kuasa (Wakil)",
    "Alamat Lengkap",
    "No HP / WhatsApp",
    "Kebutuhan Berkas",
    "Skenario Kerentanan",
    "Bantuan Sosial Aktif",
    "Status Kepemilikan Rumah",
    "Sumber Penerangan Utama",
    "Kondisi Fasilitas Sanitasi MCK",
    "Penghasilan Bulanan",
    "Deskripsi Pengaduan",
    "Jenis Usulan Layanan",
    "Status Verifikasi Kunjungan",
    "Tanggal Verifikasi",
    "Catatan Petugas Lapangan",
    "Petugas Penginput",
    "Petugas Pendata (Verifier)"
  ];
  sheetRec.getRange(1, 1, 1, headersRec.length).setValues([headersRec]);
  
  const headerRecRange = sheetRec.getRange(1, 1, 1, headersRec.length);
  headerRecRange.setBackground("#0f766e") // Teal-700
                .setFontColor("#ffffff")
                .setFontWeight("bold")
                .setFontFamily("Inter")
                .setFontSize(10)
                .setHorizontalAlignment("center")
                .setVerticalAlignment("middle");
  sheetRec.setRowHeight(1, 30);
  sheetRec.setFrozenRows(1);
  sheetRec.getRange(1, 1, 1000, headersRec.length).setFontFamily("Inter").setFontSize(9);
  
  for (let i = 1; i <= headersRec.length; i++) {
    sheetRec.autoResizeColumn(i);
    const width = sheetRec.getColumnWidth(i);
    if (width < 130) {
      sheetRec.setColumnWidth(i, 130);
    }
  }

  // 2. Setup Facilitators Sheet
  setupFacilitatorSheet();

  SpreadsheetApp.getUi().alert("✅ Sukses menginisiasi tabel Laporan & Daftar Petugas SLRT KITO!");
}

function setupFacilitatorSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetFac = ss.getSheetByName(SHEET_FACILITATORS);
  if (!sheetFac) {
    sheetFac = ss.insertSheet(SHEET_FACILITATORS);
  }
  sheetFac.clear();
  
  const headersFac = [
    "ID Fasilitator",
    "Nama Lengkap",
    "NIK",
    "Kecamatan Tugas",
    "Kelurahan Tugas",
    "No HP",
    "Email",
    "Password",
    "Status Akun",
    "Perangkat Terakhir",
    "Tanggal Pendaftaran"
  ];
  sheetFac.getRange(1, 1, 1, headersFac.length).setValues([headersFac]);
  
  const headerFacRange = sheetFac.getRange(1, 1, 1, headersFac.length);
  headerFacRange.setBackground("#1e3a8a") // Navy/Blue-900
                .setFontColor("#ffffff")
                .setFontWeight("bold")
                .setFontFamily("Inter")
                .setFontSize(10)
                .setHorizontalAlignment("center")
                .setVerticalAlignment("middle");
                
  sheetFac.setRowHeight(1, 30);
  sheetFac.setFrozenRows(1);
  sheetFac.getRange(1, 1, 1000, headersFac.length).setFontFamily("Inter").setFontSize(9);

  // Pre-fill default facilitators if completely empty
  for (let i = 0; i < INITIAL_FACILITATORS.length; i++) {
    const f = INITIAL_FACILITATORS[i];
    sheetFac.appendRow([
      f.id,
      f.name,
      "'" + f.nik,
      f.regionKecamatan,
      f.regionKelurahan,
      "'" + f.phone,
      f.email,
      f.password,
      f.status,
      f.perangkat,
      f.createdAt
    ]);
  }

  for (let i = 1; i <= headersFac.length; i++) {
    sheetFac.autoResizeColumn(i);
    const width = sheetFac.getColumnWidth(i);
    if (width < 120) {
      sheetFac.setColumnWidth(i, 120);
    }
  }
}

// Membuat Menu Pintasan Kustom di Google Sheets
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🟢 Menu SLRT KITO")
    .addItem("Inisialisasi & Format Ulang Tabel", "setupSheet")
    .addSeparator()
    .addItem("Saring & Ekspor Laporan Terpadu", "filterAndExportIntegrated")
    .addItem("Rapikan Baris & Format Status", "autofitAndStyleRows")
    .addToUi();
}

// Fungsi Saring & Ekspor Terpadu (Fasilitator AND/OR Pendata)
function filterAndExportIntegrated() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("❌ Error: Tabel Laporan SLRT KITO tidak ditemukan. Silakan lakukan inisialisasi terlebih dahulu!");
    return;
  }
  
  const ui = SpreadsheetApp.getUi();
  
  const responseFas = ui.prompt(
    "1/2: Saringan Fasilitator Lapangan",
    "Masukkan nama Fasilitator Lapangan (Penginput) yang ingin disaring.\\nKetik 'Semua' untuk mengabaikan saringan ini:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (responseFas.getSelectedButton() !== ui.Button.OK) return;
  let targetFas = responseFas.getResponseText().trim();
  if (!targetFas) targetFas = "Semua";
  
  const responsePen = ui.prompt(
    "2/2: Saringan Petugas Pendata (Verifier)",
    "Masukkan nama Petugas Pendata (Verifier) yang ingin disaring.\\nKetik 'Semua' untuk mengabaikan saringan ini:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (responsePen.getSelectedButton() !== ui.Button.OK) return;
  let targetPen = responsePen.getResponseText().trim();
  if (!targetPen) targetPen = "Semua";
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    ui.alert("⚠️ Tidak ada data untuk disaring.");
    return;
  }
  
  const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const values = dataRange.getValues();
  const filteredValues = [];
  
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const fasVal = String(row[21]).trim();
    const penVal = String(row[22]).trim();
    
    let matchFas = true;
    if (targetFas.toLowerCase() !== "semua" && targetFas !== "") {
      matchFas = (fasVal.toLowerCase() === targetFas.toLowerCase());
    }
    
    let matchPen = true;
    if (targetPen.toLowerCase() !== "semua" && targetPen !== "") {
      matchPen = (penVal.toLowerCase() === targetPen.toLowerCase());
    }
    
    if (matchFas && matchPen) {
      filteredValues.push(row);
    }
  }
  
  if (filteredValues.length === 0) {
    ui.alert("⚠️ Data tidak ditemukan untuk kombinasi petugas tersebut:\\nFasilitator: " + targetFas + "\\nPendata: " + targetPen);
    return;
  }
  
  const timestamp = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss");
  const newSheetName = "Laporan_Terpadu_" + timestamp;
  const newSheet = ss.insertSheet(newSheetName);
  
  const headers = [
    "ID Record", "Kecamatan", "Kelurahan", "Hari/Tanggal Input", "Nama Klien",
    "Pekerjaan Kepala RT", "Nama Kuasa (Wakil)", "Alamat Lengkap", "No HP / WhatsApp",
    "Kebutuhan Berkas", "Skenario Kerentanan", "Bantuan Sosial Aktif", "Status Kepemilikan Rumah",
    "Sumber Penerangan Utama", "Kondisi Fasilitas Sanitasi MCK", "Penghasilan Bulanan",
    "Deskripsi Pengaduan", "Jenis Usulan Layanan", "Status Verifikasi Kunjungan",
    "Tanggal Verifikasi", "Catatan Petugas Lapangan", "Petugas Penginput", "Petugas Pendata (Verifier)"
  ];
  
  newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  newSheet.getRange(1, 1, 1, headers.length)
          .setBackground("#0384c7") // Sky-600
          .setFontColor("#ffffff")
          .setFontWeight("bold")
          .setFontFamily("Inter")
          .setFontSize(10)
          .setHorizontalAlignment("center");
          
  newSheet.getRange(2, 1, filteredValues.length, headers.length).setValues(filteredValues);
  newSheet.getRange(1, 1, filteredValues.length + 1, headers.length).setFontFamily("Inter").setFontSize(9);
  
  for (let col = 1; col <= headers.length; col++) {
    newSheet.autoResizeColumn(col);
    if (newSheet.getColumnWidth(col) < 120) {
      newSheet.setColumnWidth(col, 120);
    }
  }
  
  newSheet.setFrozenRows(1);
  ui.alert("✅ Sukses!\\nBerhasil menyusun " + filteredValues.length + " data ke dalam sheet baru bernama '" + newSheetName + "'!");
}

// Fungsi Otomatisasi Layout Data Laporan
function autofitAndStyleRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  if (!sheet) return;
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return;
  
  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  range.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  range.setVerticalAlignment("middle");
  
  for (let r = 2; r <= lastRow; r++) {
    const rowRange = sheet.getRange(r, 1, 1, lastCol);
    if (r % 2 === 0) {
      rowRange.setBackground("#f8fafc");
    } else {
      rowRange.setBackground("#ffffff");
    }
    sheet.setRowHeight(r, 24);
    
    const statusCell = sheet.getRange(r, 19);
    const statusVal = statusCell.getValue();
    if (statusVal === "Sudah Dikunjungi" || statusVal === "Terverifikasi") {
      statusCell.setBackground("#d1fae5").setFontColor("#065f46").setFontWeight("bold");
    } else {
      statusCell.setBackground("#fef3c7").setFontColor("#92400e").setFontWeight("bold");
    }
  }
}

// Webhook GET API untuk menerima query data inisiasi awal
function doGet(e) {
  const action = e.parameter.action;
  if (action === "getInitialData") {
    return ContentService.createTextOutput(JSON.stringify(getInitialData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Aksi tidak dikenal" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Mengambil seluruh data laporan dan petugas
function getInitialData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Data Laporan
  let sheetRec = ss.getSheetByName(SHEET_RECORDS);
  const records = [];
  if (sheetRec) {
    const lastRow = sheetRec.getLastRow();
    if (lastRow > 1) {
      const values = sheetRec.getRange(2, 1, lastRow - 1, 23).getValues();
      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        records.push({
          id: String(row[0]),
          kecamatan: String(row[1]),
          kelurahan: String(row[2]),
          hariTanggal: String(row[3]),
          namaKlien: String(row[4]),
          pekerjaanKrt: String(row[5]),
          namaKuasa: String(row[6]),
          alamatKlien: String(row[7]),
          noTelpon: String(row[8]),
          dokumen: String(row[9]),
          status: String(row[10]),
          bantuanDiterima: String(row[11]),
          statusRumah: String(row[12]),
          jenisPenerangan: String(row[13]),
          mck: String(row[14]),
          pendapatanPerbulan: String(row[15]),
          jenisPengaduan: String(row[16]),
          jenisLayanan: String(row[17]),
          statusKunjungan: row[18] ? String(row[18]) : "Belum Dikunjungi",
          tanggalPemeriksaan: String(row[19]) || "-",
          catatanPemeriksa: String(row[20]) || "-",
          diinputOleh: row[21] ? String(row[21]) : "Admin",
          namaPendata: row[22] ? String(row[22]) : ""
        });
      }
    }
  }
  
  // 2. Data Petugas / Fasilitator
  let sheetFac = ss.getSheetByName(SHEET_FACILITATORS);
  const facilitators = [];
  if (sheetFac) {
    const lastRow = sheetFac.getLastRow();
    if (lastRow > 1) {
      const values = sheetFac.getRange(2, 1, lastRow - 1, 11).getValues();
      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        facilitators.push({
          id: String(row[0]),
          name: String(row[1]),
          nik: String(row[2]),
          regionKecamatan: String(row[3]),
          regionKelurahan: String(row[4]),
          phone: String(row[5]),
          email: String(row[6]),
          password: String(row[7]),
          status: String(row[8]) || "PENDING_APPROVAL",
          perangkat: String(row[9]) || "-",
          createdAt: String(row[10])
        });
      }
    }
  }
  
  const finalFacs = facilitators.length > 0 ? facilitators : INITIAL_FACILITATORS;
  return { records: records, facilitators: finalFacs };
}

// Menangani permintaan pengiriman/edit data (POST) dari aplikasi web
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    if (action === "registerFacilitator") {
      return ContentService.createTextOutput(JSON.stringify(registerFacilitator(payload.data)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "updateFacilitatorStatus") {
      return ContentService.createTextOutput(JSON.stringify(updateFacilitatorStatus(payload.id, payload.status)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "deleteFacilitator") {
      return ContentService.createTextOutput(JSON.stringify(deleteFacilitator(payload.id)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "syncRecord") {
      return ContentService.createTextOutput(JSON.stringify(syncRecord(payload.data)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Sinkronisasi catatan pengaduan tunggal (kompatibilitas versi lama)
    return ContentService.createTextOutput(JSON.stringify(syncRecord(payload)))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Registrasi Fasilitator Baru ke Google Sheet
function registerFacilitator(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_FACILITATORS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_FACILITATORS);
    setupFacilitatorSheet();
  }
  
  const rowData = [
    data.id,
    data.name,
    "'" + data.nik,
    data.regionKecamatan,
    data.regionKelurahan,
    "'" + data.phone,
    data.email,
    data.password,
    data.status || "PENDING_APPROVAL",
    data.perangkat || "-",
    data.createdAt
  ];
  sheet.appendRow(rowData);
  return { status: "success", message: "Petugas berhasil didaftarkan ke sheet!" };
}

// Mengubah status akun fasilitator (APPROVED / REJECTED)
function updateFacilitatorStatus(id, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_FACILITATORS);
  if (!sheet) return { status: "error", message: "Sheet petugas tidak ditemukan" };
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: "error", message: "Data petugas kosong" };
  
  const range = sheet.getRange(2, 1, lastRow - 1, 1);
  const values = range.getValues();
  
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(id).trim()) {
      const rowNum = i + 2;
      sheet.getRange(rowNum, 9).setValue(status); // Kolom 9 (I) is Status Akun
      return { status: "success", message: "Status petugas " + id + " berhasil diubah ke " + status };
    }
  }
  return { status: "error", message: "Petugas ID " + id + " tidak ditemukan" };
}

// Menghapus akun petugas
function deleteFacilitator(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_FACILITATORS);
  if (!sheet) return { status: "error", message: "Sheet petugas tidak ditemukan" };
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: "error", message: "Data petugas kosong" };
  
  const range = sheet.getRange(2, 1, lastRow - 1, 1);
  const values = range.getValues();
  
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(id).trim()) {
      const rowNum = i + 2;
      sheet.deleteRow(rowNum);
      return { status: "success", message: "Petugas " + id + " berhasil dihapus dari sheet" };
    }
  }
  return { status: "error", message: "Petugas ID " + id + " tidak ditemukan" };
}

// Sinkronisasi Catatan Laporan Pengaduan
function syncRecord(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_RECORDS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RECORDS);
    setupSheet();
  }
  
  const lastRow = sheet.getLastRow();
  let foundRow = -1;
  
  if (lastRow > 1) {
    const range = sheet.getRange(2, 1, lastRow - 1, 1);
    const values = range.getValues();
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0]).trim() === String(data.id).trim()) {
        foundRow = i + 2;
        break;
      }
    }
  }
  
  const rowData = [
    data.id || "rec-" + new Date().getTime(),
    data.kecamatan || "",
    data.kelurahan || "",
    data.hariTanggal || new Date().toLocaleDateString("id-ID"),
    data.namaKlien || "",
    data.pekerjaanKrt || "",
    data.namaKuasa || "-",
    data.alamatKlien || "",
    "'" + (data.noTelpon || data.nomorHp || ""),
    data.dokumen || "",
    data.status || "",
    data.bantuanDiterima || "",
    data.statusRumah || "",
    data.jenisPenerangan || "",
    data.mck || "",
    data.pendapatanPerbulan || "",
    data.jenisPengaduan || "",
    data.jenisLayanan || "",
    data.statusKunjungan || "Belum Dikunjungi",
    data.tanggalPemeriksaan || "-",
    data.catatanPemeriksa || "-",
    data.diinputOleh || "Admin",
    data.namaPendata || data.namaFasilitator || ""
  ];
  
  if (foundRow !== -1) {
    sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  autofitAndStyleRows();
  return { status: "success", message: "Laporan berhasil disinkronisasi!" };
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 font-display uppercase tracking-tight">
            <BookOpen className="w-5 h-5 text-teal-600 animate-pulse" />
            Pusat Dokumentasi &amp; Integrasi SLRT KITO
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Panduan lapangan dinas sosial Tanjungbalai beserta skrip otomatisasi integrasi Google Sheets.
          </p>
        </div>

        {/* Navigation Tab */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start md:self-center font-semibold text-[11px]">
          <button
            onClick={() => setActiveSubTab('parameters')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
              activeSubTab === 'parameters'
                ? 'bg-white text-indigo-750 shadow-xs font-black'
                : 'text-slate-650 hover:text-slate-900'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            Kamus 18 Parameter
          </button>
          <button
            onClick={() => setActiveSubTab('appscript')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
              activeSubTab === 'appscript'
                ? 'bg-white text-emerald-750 shadow-xs font-black'
                : 'text-slate-650 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-emerald-600" />
            Google Apps Script
          </button>
        </div>
      </div>

      {activeSubTab === 'parameters' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 shadow-inner flex flex-col gap-2.5">
            <h4 className="font-bold text-indigo-900 flex items-center gap-1 text-[11.5px] uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">A</span>
              1 - 5: Identitas Kunjungan
            </h4>
            <ul className="space-y-2 text-slate-600 pl-1 leading-relaxed">
              <li><strong>1. Nama Fasilitator</strong>: Petugas SLRT Dinas Sosial yang mengambil tanggung jawab lapangan (contoh: <i>Ahmad Fauzi</i>).</li>
              <li><strong>2. Kelurahan</strong>: Kelurahan domisili pemohon di Kota Tanjungbalai (contoh: <i>Pahang</i>).</li>
              <li><strong>3. Kecamatan</strong>: Kecamatan pemohon di Kota Tanjungbalai (contoh: <i>Datuk Bandar</i>).</li>
              <li><strong>4. Hari/Tanggal</strong>: Hari pelaksanaan kunjungan langsung (contoh: <i>Senin, 01 Juni 2026</i>).</li>
              <li><strong>5. Nama Klien</strong>: Nama kepala keluarga / representasi penerima manfaat utama (contoh: <i>Ibu Mariam</i>).</li>
            </ul>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 shadow-inner flex flex-col gap-2.5">
            <h4 className="font-bold text-indigo-900 flex items-center gap-1 text-[11.5px] uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">B</span>
              6 - 10: Profil &amp; Legalitas
            </h4>
            <ul className="space-y-2 text-slate-600 pl-1 leading-relaxed">
              <li><strong>6. Pekerjaan KRT</strong>: Pekerjaan aktif Kepala Rumah Tangga (Nelayan, Buruh Cuci, Supor Becak, Pedagang).</li>
              <li><strong>7. Nama Kuasa</strong>: Diisi nama anak atau kerabat jika klien tidak dapat hadir langsung. Isi '-' jika tidak diwakili.</li>
              <li><strong>8. Alamat Klien</strong>: Alamat detail agar tim Dinsos mudah mendatangi ulang lokasi (Jl., Gg., Lingkungan, RT/RW).</li>
              <li><strong>9. No Telpon/HP</strong>: Kontak telepon aktif pemohon yang tersambung WhatsApp untuk koordinasi penyerahan bantuan.</li>
              <li><strong>10. Dokumen</strong>: Jenis berkas fotokopi penunjang yang dipersiapkan (KK, KTP-el, SKTM dari Kelurahan setempat).</li>
            </ul>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 shadow-inner flex flex-col gap-2.5">
            <h4 className="font-bold text-indigo-900 flex items-center gap-1 text-[11.5px] uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">C</span>
              11 - 15: Sosio-Ekonomi &amp; Hunian
            </h4>
            <ul className="space-y-2 text-slate-600 pl-1 leading-relaxed">
              <li><strong>11. Status Klien</strong>: Klasifikasi kerentanan ekonomi (Sangat Miskin, Miskin, Rentan Miskin, Deshil 1).</li>
              <li><strong>12. Bantuan Sudah Diperoleh</strong>: Sebutkan bantuan aktif saat ini (BPNT, PKH, KIS PBI APBD, atau belum ada).</li>
              <li><strong>13. Status Rumah</strong>: Hak milik hunian saat ini (Milik Sendiri, Sewa, Menumpang, Rumah Komunal).</li>
              <li><strong>14. Jenis Penerangan</strong>: Kapasitas daya listrik (PLN Bersubsidi 450W, PLN Non-Subsidi, Sambungan Numpang Tetangga).</li>
              <li><strong>15. MCK</strong>: Keadaan kelayakan toilet sanitasi rumahtangga klien (Sendiri Layak, Sendiri Kurang Layak, MCK Umum).</li>
            </ul>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 shadow-inner flex flex-col gap-2.5">
            <h4 className="font-bold text-indigo-900 flex items-center gap-1 text-[11.5px] uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">D</span>
              16 - 18: Pengaduan &amp; Rujukan
            </h4>
            <ul className="space-y-2 text-slate-600 pl-1 leading-relaxed">
              <li><strong>16. Pendapatan Perbulan</strong>: Penghasilan rata-rata KRT sebulan (contoh: <i>Rp 650.000 / Bulan</i>).</li>
              <li><strong>17. Jenis Pengaduan</strong>: Penjelasan rinci masalah klien (anak sakit kronis denda BPJS menumpuk, rawan drop-out sekolah, janda tua tinggal sebatang kara).</li>
              <li><strong>18. Jenis Layanan</strong>: Usulan jenis bantuan rujukan (Reaktivasi KIS PBI, Usulan Baru DTKS Kemensos, Beasiswa KIP, Renovasi Bedah Rumah RTLH).</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div className="bg-teal-50 border border-teal-250 p-4 rounded-xl flex gap-3 text-xs leading-relaxed text-teal-900">
            <FileSpreadsheet className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-teal-950 uppercase tracking-wide">Inisialisasi Tabel &amp; Sinkronisasi Google Sheets Otomatis</p>
              <p className="mt-1">
                Gunakan skrip Google Apps Script di bawah ini untuk mengubah lembar kerja Google Sheets Anda menjadi penampung data SLRT KITO Tanjungbalai yang otomatis terformat rapi sesuai baku mutu kedinasan, dilengkapi dengan pembuatan tombol cepat dan sistem Webhook API.
              </p>
            </div>
          </div>

          {/* Code Section */}
          <div className="flex flex-col rounded-xl border border-slate-200 overflow-hidden shadow-xs bg-slate-900">
            <div className="bg-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300 font-mono border-b border-slate-700">
              <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-emerald-400" /> SLRT_Kito_Integration.gs</span>
              <button
                onClick={copyToClipboard}
                className="bg-slate-700 hover:bg-slate-600 active:bg-slate-850 text-white rounded px-2.5 py-1 flex items-center gap-1 transition-all cursor-pointer font-bold text-[11px]"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Terkopos!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Salin Kode
                  </>
                )}
              </button>
            </div>
            
            <pre className="p-4 overflow-x-auto text-[10.5px] font-mono text-slate-200 leading-normal max-h-[300px] bg-slate-925 select-all scrollbar-thin">
              {appScriptCode}
            </pre>
          </div>

          {/* Quick Guide */}
          <div className="border border-slate-150 p-4 rounded-xl bg-slate-50/50 flex flex-col gap-2.5">
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
              🚀 Cara Menerapkan di Google Sheet Anda:
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1.5">
              <li>Buka lembar kerja baru di <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 font-extrabold hover:underline inline-flex items-center gap-0.5">Google Sheets <ExternalLink className="w-3 h-3" /></a>.</li>
              <li>Klik menu <b>Ekstensi (Extensions)</b> pada toolbar atas, lalu klik <b>Apps Script</b>.</li>
              <li>Ganti kode default dengan kode yang telah Anda salin di atas.</li>
              <li>Simpan proyek dengan menekan tombol <b>Simpan</b> (disket kecil).</li>
              <li>Segarkan tab google sheet Anda. Anda akan melihat menu baru bernama <b>🟢 Menu SLRT KITO</b> muncul di samping menu bantuan.</li>
              <li>Silakan klik <b>🟢 Menu SLRT KITO &gt; Inisialisasi &amp; Format Ulang Tabel</b> untuk membuat baris header toska dinas sosial Tanjungbalai secara instan!</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
