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
  
  // Multi-user & flow states
  statusKunjungan?: 'Belum Dikunjungi' | 'Sudah Dikunjungi';
  tanggalPemeriksaan?: string; // Tanggal verifikasi lapangan oleh fasilitator
  dokumentasiBukti?: string; // Data URL atau string referensi bukti gambar kontrol kependudukan
  catatanPemeriksa?: string; // Catatan tambahan hasil verifikasi lapangan
  diinputOleh?: 'Admin' | 'Warga'; // Pelapor asal data
  namaPendata?: string; // Nama petugas pendata lapangan
  fotoKkKtp?: string; // Foto KK / KTP
  fotoDepanRumah?: string; // Foto Depan Rumah
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

export const INITIAL_RECORDS: SLRTRecord[] = [
  {
    id: 'rec-1',
    namaFasilitator: 'Ahmad Fauzi',
    kelurahan: 'Pahang',
    kecamatan: 'Datuk Bandar',
    hariTanggal: 'Senin, 01 Juni 2026',
    namaKlien: 'Mariam',
    pekerjaanKrt: 'Buruh Harian Lepas',
    namaKuasa: '-',
    alamatKlien: 'Jl. Jenderal Sudirman Gg. Selat Lancang No. 12, Lingkungan II',
    noTelpon: '081266778899',
    dokumen: 'KK, KTP, SKTM',
    status: 'Sangat Miskin',
    bantuanDiterima: 'Belum Ada',
    statusRumah: 'Sewa',
    jenisPenerangan: 'PLN Bersubsidi 450W',
    mck: 'Sendiri Kurang Layak',
    pendapatanPerbulan: 'Rp 650.000',
    jenisPengaduan: 'Klien menderita penyakit diabetes kronis dan tidak sanggup membayar biaya pengobatan secara mandiri. Membutuhkan pengaktifan KIS (Kartu Indonesia Sehat) yang telah non-aktif.',
    jenisLayanan: 'Pengaktifan kembali KIS PBI (Penerima Bantuan Iuran)',
    statusKunjungan: 'Belum Dikunjungi',
    diinputOleh: 'Admin'
  },
  {
    id: 'rec-2',
    namaFasilitator: 'Siti Rahma',
    kelurahan: 'Sei Merbau',
    kecamatan: 'Teluk Nibung',
    hariTanggal: 'Selasa, 02 Juni 2026',
    namaKlien: 'Samsul Bahri',
    pekerjaanKrt: 'Nelayan Tradisional',
    namaKuasa: '-',
    alamatKlien: 'Jl. Pelabuhan, Lingkungan V, dekat dermaga nelayan',
    noTelpon: '085311223344',
    dokumen: 'KK, KTP',
    status: 'Rentan',
    bantuanDiterima: 'BPNT',
    statusRumah: 'Milik Sendiri',
    jenisPenerangan: 'Listrik Sambungan Numpang',
    mck: 'MCK Umum',
    pendapatanPerbulan: 'Rp 900.000',
    jenisPengaduan: 'Kondisi atap rumah klien mengalami kebocoran parah di beberapa titik sehingga tidak layak dihuni saat hujan deras serta anak bungsu klien terancam putus sekolah karena kendala biaya seragam.',
    jenisLayanan: 'Pengajuan Program Rumah Tidak Layak Huni (RTLH) dan Program Indonesia Pintar (PIP)',
    statusKunjungan: 'Sudah Dikunjungi',
    tanggalPemeriksaan: 'Kamis, 04 Juni 2026',
    catatanPemeriksa: 'Telah diaudit langsung ke dermaga, atap seng keropos total. Dokumen KK & KTP telah difoto.',
    dokumentasiBukti: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=400',
    diinputOleh: 'Admin'
  },
  {
    id: 'rec-3',
    namaFasilitator: 'Budi Hartono',
    kelurahan: 'Pasar Baru',
    kecamatan: 'Sei Tualang Raso',
    hariTanggal: 'Kamis, 04 Juni 2026',
    namaKlien: 'Halimah Siregar',
    pekerjaanKrt: 'Ibu Rumah Tangga (Janda)',
    namaKuasa: 'Rian (Anak Kandung)',
    alamatKlien: 'Jl. Veteran Gg. Damai No. 45, Lingkungan III',
    noTelpon: '082155889900',
    dokumen: 'KK, KTP, SKTM, Surat Kematian Suami',
    status: 'Miskin',
    bantuanDiterima: 'KIS Mandiri (Menunggak)',
    statusRumah: 'Menumpang',
    jenisPenerangan: 'PLN Bersubsidi 450W',
    mck: 'Sendiri Layak',
    pendapatanPerbulan: 'Rp 450.000',
    jenisPengaduan: 'Suami klien baru saja meninggal dunia, klien saat ini tidak memiliki penghasilan tetap selain kiriman anak terkadang. Memohon bantuan pangan reguler untuk menopang kebutuhan sehari-hari.',
    jenisLayanan: 'Pengusulan DTKS untuk menerima bantuan PKH atau BPNT Sembako serta Peralihan Kepesertaan KIS dari Mandiri ke PBI',
    statusKunjungan: 'Belum Dikunjungi',
    diinputOleh: 'Warga'
  }
];

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

export const INITIAL_FACILITATORS: FacilitatorUser[] = [
  {
    id: 'fac-1',
    name: 'Ahmad Fauzi',
    nik: '1274011202890001',
    regionKecamatan: 'Datuk Bandar',
    regionKelurahan: 'Pahang',
    phone: '081234567891',
    email: 'ahmad@slrt.id',
    password: 'fauzi123',
    status: 'APPROVED',
    createdAt: 'Senin, 01 Juni 2026'
  },
  {
    id: 'fac-2',
    name: 'Siti Rahma',
    nik: '1274011505920003',
    regionKecamatan: 'Teluk Nibung',
    regionKelurahan: 'Sei Merbau',
    phone: '081234567892',
    email: 'siti@slrt.id',
    password: 'rahma123',
    status: 'APPROVED',
    createdAt: 'Selasa, 02 Juni 2026'
  },
  {
    id: 'fac-3',
    name: 'Budi Hartono',
    nik: '1274012408900002',
    regionKecamatan: 'Sei Tualang Raso',
    regionKelurahan: 'Pasar Baru',
    phone: '081234567893',
    email: 'budi@slrt.id',
    password: 'hartono123',
    status: 'APPROVED',
    createdAt: 'Kamis, 04 Juni 2026'
  }
];

