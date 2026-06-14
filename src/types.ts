export interface SLRTRecord {
  id: string;
  namaFasilitator: string;
  kelurahan: string;
  kecamatan: string;
  hariTanggal: string; // Tanggal pendaftaran/input oleh Admin
  namaKlien: string;
  pekerjaanKrt: string;
  namaKuasa: string;
  alamatKlien: string;
  noTelpon: string;
  dokumen: string;
  status: string; // sangat miskin, miskin, rentan
  bantuanDiterima: string;
  statusRumah: string;
  jenisPenerangan: string;
  mck: string;
  pendapatanPerbulan: string;
  jenisPengaduan: string;
  jenisLayanan: string;
  isHighPriority?: boolean; // Label prioritas tinggi otomatis
  isDeleted?: boolean | string; // Flag to check if record is deleted
  
  // Multi-user & flow states
  statusKunjungan?: 'Belum Dikunjungi' | 'Sudah Dikunjungi' | 'Dihapus' | 'DELETED';
  tanggalPemeriksaan?: string; // Tanggal verifikasi lapangan oleh fasilitator
  dokumentasiBukti?: string; // Data URL atau string referensi bukti gambar kontrol kependudukan
  catatanPemeriksa?: string; // Catatan tambahan hasil verifikasi lapangan
  diinputOleh?: 'Admin' | 'Warga'; // Pelapor asal data
  namaPendata?: string; // Nama petugas pendata lapangan
  fotoKkKtp?: string; // Foto KK / KTP
  fotoDepanRumah?: string; // Foto Depan Rumah
  
  // Field Application Database Compatibility Fields
  foto_hunian_url?: string;
  foto_ktp_url?: string;
  catatan_pendata?: string;

  // New fields for multi-select
  indikatorSosialEkonomi?: string[];
  kelayakanHuni?: string[];
  bantuanDiterimaList?: string[];

  // Geotagging GPS coordinates
  latitude?: number;
  longitude?: number;

  // NIK Klien (16 Digit)
  nik?: string;

  // Status History Log
  statusHistory?: {
    status: string;
    timestamp: string;
    note?: string;
    updatedBy?: string;
  }[];
}

export const TANJUNGBALAI_LOCATIONS: { [kecamatan: string]: string[] } = {
  'Tanjungbalai Selatan': [
    'Indra Sakti',
    'Karya',
    'Perwira',
    'Pantai Burung',
    'Tanjungbalai Kota I',
    'Tanjungbalai Kota II'
  ],
  'Tanjungbalai Utara': [
    'Matahalasan',
    'Sejahtera',
    'Kuala Silo Bestari',
    'Tanjungbalai Kota III',
    'Tanjungbalai Kota IV'
  ],
  'Sei Tualang Raso': [
    'Keramat Kubah',
    'Muara Sentosa',
    'Pasar Baru',
    'Sei Raja',
    'Sumber Sari'
  ],
  'Teluk Nibung': [
    'Beting Kuala Kapias',
    'Kapias Pulau Buaya',
    'Pematang Pasir',
    'Perjuangan',
    'Sei Merbau'
  ],
  'Datuk Bandar': [
    'Gading',
    'Pahang',
    'Sijambi',
    'Sirantau',
    'Pantai Johor'
  ],
  'Datuk Bandar Timur': [
    'Bunga Tanjung',
    'Pulau Simardan',
    'Selat Tanjung Medan',
    'Semula Jadi',
    'Selat Lancang'
  ]
};

export const INITIAL_RECORDS: SLRTRecord[] = [];

export interface FacilitatorUser {
  id: string;
  name: string;
  nik: string;
  regionKecamatan: string;
  regionKelurahan: string;
  phone: string;
  email: string;
  password?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export const INITIAL_FACILITATORS: FacilitatorUser[] = [];

export const getSafeBase64Url = (srcUrl: string | undefined): string => {
  if (!srcUrl) return '';
  const trimmed = srcUrl.trim();
  if (!trimmed) return '';

  // Detect and resolve Google Drive shared URLs into direct embed image sources
  if (trimmed.includes('drive.google.com')) {
    const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (matchD && matchD[1]) {
      return `https://drive.google.com/uc?export=view&id=${matchD[1]}`;
    }
    const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
    if (matchId && matchId[1]) {
      return `https://drive.google.com/uc?export=view&id=${matchId[1]}`;
    }
  }

  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('.')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('iVBORw0KGgo')) {
    return `data:image/png;base64,${trimmed}`;
  }
  return `data:image/jpeg;base64,${trimmed}`;
};

export const KRITERIA_SOSIAL_EKONOMI = [
  "Pendapatan di bawah UMR / tidak menentu",
  "Pengeluaran didominasi untuk pangan pokok",
  "Pekerjaan Kepala Keluarga serabutan / non-formal",
  "Kepala Keluarga janda / lansia / disabilitas",
  "Tanggungan anak sekolah aktif > 2 orang",
  "Tidak memiliki tabungan / aset berharga",
  "Pernah menahan lapar karena kendala ekonomi Berkelanjutan",
  "Tidak memiliki jaminan kesehatan mandiri"
];

export const KRITERIA_KELAYAKAN_HUNI = [
  "Kepadatan hunian tinggi (< 8m² per orang)",
  "Dinding berbahan papan lapuk / seng / bambu",
  "Atap rumah bocor parah / seng keropos",
  "Lantai bermaterial tanah atau semen retak kasar",
  "Akses air bersih bersumber dari air hujan / sumur keruh",
  "MCK menumpang / umum / tidak layak",
  "Penerangan meminjam tetangga / PLN subsidi numpang",
  "Status tinggal menyewa / sewa bulanan / menumpang keluarga"
];

export const KRITERIA_BANTUAN_SOSIAL = [
  "PKH (Program Keluarga Harapan)",
  "BPNT / Sembako",
  "KIS PBI APBD Kota / BPJS PBI",
  "KIP / Beasiswa PIP",
  "BLT (Bantuan Langsung Tunai / Dana Desa)"
];

export const KELURAHAN_COORDS: Record<string, { lat: number; lng: number }> = {
  // Tanjungbalai Selatan
  'Indra Sakti': { lat: 2.9642, lng: 99.8001 },
  'Karya': { lat: 2.9612, lng: 99.8015 },
  'Perwira': { lat: 2.9658, lng: 99.8032 },
  'Pantai Burung': { lat: 2.9585, lng: 99.8012 },
  'Tanjungbalai Kota I': { lat: 2.9631, lng: 99.7995 },
  'Tanjungbalai Kota II': { lat: 2.9655, lng: 99.7978 },

  // Tanjungbalai Utara
  'Matahalasan': { lat: 2.9735, lng: 99.8055 },
  'Sejahtera': { lat: 2.9721, lng: 99.8082 },
  'Kuala Silo Bestari': { lat: 2.9785, lng: 99.8095 },
  'Kuala Silau Bestari': { lat: 2.9785, lng: 99.8095 },
  'Tanjungbalai Kota III': { lat: 2.9695, lng: 99.8012 },
  'Tanjungbalai Kota IV': { lat: 2.9712, lng: 99.7995 },

  // Sei Tualang Raso
  'Keramat Kubah': { lat: 2.9855, lng: 99.8032 },
  'Muara Sentosa': { lat: 2.9922, lng: 99.7995 },
  'Pasar Baru': { lat: 2.9815, lng: 99.8015 },
  'Sei Raja': { lat: 2.9882, lng: 99.8075 },
  'Sumber Sari': { lat: 2.9792, lng: 99.8035 },

  // Teluk Nibung
  'Beting Kuala Kapias': { lat: 2.9895, lng: 99.8255 },
  'Kapias Pulau Buaya': { lat: 2.9995, lng: 99.8212 },
  'Pematang Pasir': { lat: 2.9799, lng: 99.8285 },
  'Perjuangan': { lat: 2.9862, lng: 99.8212 },
  'Sei Merbau': { lat: 2.9912, lng: 99.8155 },

  // Datuk Bandar
  'Gading': { lat: 2.9465, lng: 99.7825 },
  'Pahang': { lat: 2.9565, lng: 99.7895 },
  'Sijambi': { lat: 2.9412, lng: 99.7752 },
  'Sirantau': { lat: 2.9495, lng: 99.7925 },
  'Pantai Johor': { lat: 2.9515, lng: 99.7992 },

  // Datuk Bandar Timur
  'Bunga Tanjung': { lat: 2.9585, lng: 99.8145 },
  'Pulau Simardan': { lat: 2.9642, lng: 99.8185 },
  'Selat Tanjung Medan': { lat: 2.9492, lng: 99.8315 },
  'Semula Jadi': { lat: 2.9535, lng: 99.8215 },
  'Selat Lancang': { lat: 2.9415, lng: 99.8122 }
};


