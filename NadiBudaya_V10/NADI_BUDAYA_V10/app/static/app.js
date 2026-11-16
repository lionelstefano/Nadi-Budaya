'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const competencyMeta = {
  structure: {label: 'Memahami struktur pantun', short: 'Struktur pantun', page: 'learn', hint: 'Pelajari sampiran, isi, dan pola rima.'},
  compose: {label: 'Menyusun pantun', short: 'Menyusun pantun', page: 'studio', hint: 'Coba tulis empat baris dan periksa bunyi akhirnya.'},
  improvise: {label: 'Merespons pantun spontan', short: 'Respons spontan', page: 'stage', hint: 'Latih membalas pantun dari pemantik yang tersedia.'},
  story: {label: 'Memahami cerita dan pantun berkait', short: 'Cerita & pantun berkait', page: 'games', hint: 'Latih membaca hubungan antarbagian cerita.'},
  performance: {label: 'Ekspresi dan irama penyampaian', short: 'Ekspresi & irama', page: 'camera', hint: 'Coba latihan gestur dan visual tempo.'}
};
const competenciesKeys = Object.keys(competencyMeta);
let appState = null;
let runtimeHealth = null;
let browserCameraActive = false;
let activePage = 'home';
let currentGame = 'quiz';
let toastTimer = null;
let cameraPoll = null;
let danceStepIndex = 0;
let danceClipStartSeconds = 0;
let cameraFaceCount = 0;
let stageMediaRecorder = null;
let stageCanvasStream = null;
let stageMicStream = null;
let stageChunks = [];
let stageVideoURL = null;
let stageRecordingBlob = null;
let stageSavedPerformanceId = null;
let stageRecordDurationSeconds = 0;
let stageRecordingContext = null;
let stageRecordTimer = null;
let stageRecordStartedAt = 0;
let stageCanvasFrame = 0;
let stageCountdownToken = 0;
let rhythmTimer = null;
let rhythmCount = 0;
let rhythmAudio = null;
let stanzaCount = 1;
let voiceRecorder = null;
let voiceStream = null;
let voiceChunks = [];
let voiceObjectURL = null;
let voiceTimer = null;
let teacherAuthorized = false;
let introStep = 0;
let backgroundMusicEnabled = false;
let musicAutoplayRequested = false;
let typingEchoToken = 0;
let loadingStartedAt = performance.now();
let loadingSkipResolver = null;
let ttsVoices = [];
let ttsLastStatusTimer = null;
let pendingMusicPreference = null;
let lastFocusAnnouncementAt = 0;
let typingEchoTimer = null;
let typingSpeechCount = 0;
let lastGameAnnouncement = '';
let gameVoiceObserver = null;

const questionBank = [
  {cat:'structure',q:'Dalam pantun empat baris, dua baris pertama disebut ...',o:['Sampiran','Isi','Penutup','Lakon'],a:0,e:'Dua baris pertama adalah sampiran; dua baris berikutnya merupakan isi.'},
  {cat:'structure',q:'Bagian pantun yang menyampaikan maksud utama adalah ...',o:['Judul','Sampiran','Isi','Rima'],a:2,e:'Isi berada pada baris ketiga dan keempat.'},
  {cat:'structure',q:'Pola rima silang yang lazim pada pantun adalah ...',o:['AAAA','ABAB','AABB','ABBA'],a:1,e:'Pada pola ABAB, bunyi akhir baris 1 sejalan dengan baris 3, dan baris 2 dengan baris 4.'},
  {cat:'structure',q:'Satu bait pantun pada bentuk dasar biasanya terdiri dari ...',o:['Dua baris','Tiga baris','Empat baris','Enam baris'],a:2,e:'Bentuk dasar pantun terdiri atas empat baris.'},
  {cat:'structure',q:'Dalam contoh pantun, bagian sampiran biasanya berada pada ...',o:['Baris 1 dan 2','Baris 2 dan 3','Baris 3 dan 4','Semua baris'],a:0,e:'Sampiran terletak pada dua baris pertama.'},
  {cat:'structure',q:'Fungsi bunyi akhir pada pantun berkaitan dengan ...',o:['Nama tokoh','Rima atau persajakan','Jumlah tokoh','Tempat pertunjukan'],a:1,e:'Rima adalah keselarasan bunyi, termasuk pada akhir larik.'},
  {cat:'structure',q:'Apakah sampiran dan isi harus memiliki hubungan sebab-akibat?',o:['Selalu harus','Tidak harus','Hanya di baris keempat','Hanya pada pantun jenaka'],a:1,e:'Sampiran berfungsi sebagai pengantar bunyi atau suasana; hubungan makna langsung tidak selalu diperlukan.'},
  {cat:'structure',q:'Jika baris 1 berakhir bunyi “-ari”, pasangan rima silang yang dicari adalah ...',o:['Baris 2','Baris 3','Judul','Baris 4'],a:1,e:'Dalam pola ABAB, baris 1 berpasangan dengan baris 3.'},
  {cat:'structure',q:'Dua bagian utama pantun adalah ...',o:['Tema dan tokoh','Pembuka dan konflik','Sampiran dan isi','Nada dan alat musik'],a:2,e:'Pantun terdiri dari sampiran dan isi.'},
  {cat:'structure',q:'Istilah “larik” dalam puisi merujuk pada ...',o:['Baris','Bait','Judul','Bab'],a:0,e:'Larik merupakan sebutan lain untuk baris.'},
  {cat:'culture',q:'Gambang Rancag dikenal sebagai perpaduan unsur ...',o:['Musik, sastra, dan teater','Olahraga dan tari modern','Lukisan dan arsitektur','Kuliner dan kerajinan'],a:0,e:'Sumber kebudayaan menjelaskan Gambang Rancag memadukan musik, sastra, dan teater.'},
  {cat:'culture',q:'Dalam Gambang Rancag, cerita disampaikan dalam bentuk ...',o:['Pantun berkait','Pidato resmi','Teka-teki silang','Syair bebas tanpa cerita'],a:0,e:'Rancagan menuturkan cerita dalam format pantun berkait.'},
  {cat:'culture',q:'Musik pengiring yang disebut dalam deskripsi Gambang Rancag adalah ...',o:['Orkes gambang kromong','Orkestra simfoni','Paduan suara gereja','Gamelan Bali'],a:0,e:'Deskripsi budaya menyebut iringan orkes gambang kromong.'},
  {cat:'culture',q:'Kata “rancag” pada Gambang Rancag dikaitkan dengan ...',o:['Irama cepat atau penyajian tuturan berirama','Nama alat lukis','Upacara panen','Permainan tradisional bola'],a:0,e:'Badan Bahasa menjelaskan rancag terkait irama cepat dan tuturan/pantun berkait.'},
  {cat:'culture',q:'Salah satu ciri penyajian Gambang Rancag adalah ...',o:['Cerita dibawakan melalui pantun berkait','Hanya berupa instrumen tanpa cerita','Selalu berupa tarian tunggal','Dibaca diam-diam tanpa pertunjukan'],a:0,e:'Cerita dituturkan dalam format pantun berkait dan dipertunjukkan.'},
  {cat:'culture',q:'Gambang Rancag merupakan bagian dari tradisi lisan masyarakat ...',o:['Betawi','Minahasa','Dayak Ngaju','Sasak'],a:0,e:'Gambang Rancag merupakan kesenian tradisi lisan masyarakat Betawi.'},
  {cat:'culture',q:'Nama Gambang Rancag memuat dua unsur: gambang dan ...',o:['Rancag','Sampiran','Keroncong','Gambus'],a:0,e:'Nama tersebut terdiri dari unsur musik pengiring dan rancag sebagai pantun bercerita.'},
  {cat:'culture',q:'Dalam sumber Dinas Kebudayaan DKI, lakon dalam Gambang Rancag dapat dibawakan oleh ...',o:['Dua orang secara bergantian','Satu orang tanpa pergantian','Sepuluh orang serentak','Hanya narator rekaman'],a:0,e:'Sumber Dinas Kebudayaan DKI menggambarkan dua orang membawakan pantun berkait secara bergantian.'},
  {cat:'culture',q:'Mengapa praktisi budaya perlu dilibatkan dalam pengembangan materi RANCAGITA?',o:['Agar indikator dan isi sesuai praktik budaya','Supaya jumlah animasi bertambah','Agar penilaian otomatis selalu sempurna','Untuk mengganti seluruh proses penelitian'],a:0,e:'Proposal menempatkan praktisi sebagai sumber pengetahuan dan penelaah indikator kompetensi.'},
  {cat:'culture',q:'Gambang Rancag lebih tepat dipelajari sebagai ...',o:['Praktik budaya yang melibatkan pengetahuan dan pertunjukan','Sekadar daftar kosakata','Hanya aplikasi permainan','Hanya pola warna kostum'],a:0,e:'Pembelajaran perlu memperhatikan konteks pertunjukan, musik, sastra, dan transmisi antargenerasi.'},
  {cat:'story',q:'Pantun berkait paling tepat dipahami sebagai ...',o:['Pantun yang bagian-bagiannya saling tersambung','Pantun tanpa pesan','Daftar kata acak','Pantun yang hanya punya satu baris'],a:0,e:'Dalam Gambang Rancag, cerita dapat dituturkan melalui pantun berkait.'},
  {cat:'story',q:'Saat melanjutkan cerita melalui pantun, hal penting yang dijaga adalah ...',o:['Keterhubungan isi dan alur','Mengganti tokoh tanpa alasan','Menghilangkan pesan','Menyalin baris yang sama terus-menerus'],a:0,e:'Keterkaitan antarbait membantu cerita tetap dapat diikuti.'},
  {cat:'story',q:'Apa langkah awal yang membantu memahami sebuah cerita pantun?',o:['Mengenali siapa, apa, dan peristiwa yang diceritakan','Menghitung jumlah huruf judul','Mengabaikan semua isi','Langsung membuat akhir cerita'],a:0,e:'Mengenali unsur cerita membantu pembaca memahami konteks sebelum merespons.'},
  {cat:'story',q:'Jika sebuah balasan pantun tidak terkait dengan pemantik, hal yang perlu diperbaiki adalah ...',o:['Keterhubungan makna','Warna latar','Ukuran huruf','Nama aplikasi'],a:0,e:'Balasan sebaiknya menanggapi konteks atau pesan dari pantun pemantik.'},
  {cat:'story',q:'Mengapa cerita dalam pantun berkait perlu memiliki urutan?',o:['Agar pendengar dapat mengikuti perkembangan cerita','Agar semua baris memiliki kata sama','Agar rima tidak diperlukan','Agar isi pantun dihapus'],a:0,e:'Urutan ide mendukung pemahaman cerita.'},
  {cat:'story',q:'Ketika dua tokoh berbalas pantun, respons yang baik sebaiknya ...',o:['Menanggapi isi atau situasi sebelumnya','Mengulang pertanyaan tanpa jawaban','Mengganti topik secara acak','Menghilangkan semua rima'],a:0,e:'Respons yang terkait membuat dialog terasa menyambung.'},
  {cat:'story',q:'Dalam latihan cerita, “tokoh” berarti ...',o:['Pelaku dalam cerita','Bunyi akhir baris','Jenis alat musik','Jumlah bait'],a:0,e:'Tokoh adalah pihak yang mengalami atau melakukan peristiwa dalam cerita.'},
  {cat:'story',q:'Apa yang membuat sebuah rangkaian pantun terasa sebagai satu cerita?',o:['Ada hubungan peristiwa, gagasan, atau tokoh antarbait','Setiap bait membahas hal yang tidak berkaitan','Semua baris harus sama panjang persis','Judul dibuat sangat panjang'],a:0,e:'Keterhubungan antarbagian membentuk alur cerita.'},
  {cat:'practice',q:'Jika belum lancar menyusun pantun spontan, langkah yang sesuai adalah ...',o:['Berlatih bertahap dengan umpan balik','Berhenti mencoba','Menghafal tanpa memahami','Menghindari pendampingan'],a:0,e:'Latihan bertahap dan pendampingan merupakan pendekatan yang dituju model Nadi Budaya.'},
  {cat:'practice',q:'Apa tujuan Peta Kompetensi pada Nadi Kit?',o:['Mencatat kemampuan awal, pengalaman, minat, dan kesiapan','Mengganti praktisi budaya','Menentukan nilai akhir otomatis','Menyimpan foto kamera'],a:0,e:'Peta Kompetensi adalah instrumen untuk melihat titik awal peserta.'},
  {cat:'practice',q:'Pencocokan Kebutuhan Belajar digunakan untuk ...',o:['Membandingkan kompetensi awal dengan keterampilan yang dibutuhkan','Memilih warna tema','Membagikan data ke internet','Menghapus catatan latihan'],a:0,e:'Hasil pencocokan menentukan prioritas latihan.'},
  {cat:'practice',q:'Jalur Pendampingan Adaptif berarti ...',o:['Panduan latihan berdasarkan kebutuhan peserta','Urutan latihan yang sama untuk semua kondisi','Kompetisi berdasarkan kecepatan saja','Kumpulan video tanpa tujuan'],a:0,e:'Pendampingan disusun sesuai hasil identifikasi kebutuhan belajar.'},
  {cat:'practice',q:'Paspor Perkembangan Budaya berfungsi untuk ...',o:['Mencatat penilaian awal, latihan, perkembangan, dan kebutuhan berikutnya','Menyimpan kata sandi','Mengukur popularitas pengguna','Mengganti data wawancara'],a:0,e:'Paspor merekam perkembangan dan kebutuhan pendampingan selanjutnya.'},
  {cat:'practice',q:'Untuk menilai keterampilan budaya secara tepat, indikator sebaiknya ...',o:['Ditelaah bersama praktisi','Dibuat dari tebakan aplikasi saja','Tidak pernah diperbarui','Hanya mengukur kecepatan'],a:0,e:'Proposal secara jelas merencanakan penyusunan indikator bersama praktisi.'},
  {cat:'practice',q:'Apa arti uji coba terbatas dalam proposal?',o:['Menilai kelayakan awal dan keterpakaian prototipe','Membuktikan efektivitas jangka panjang','Menggantikan seluruh kajian lapangan','Memberi sertifikasi nasional'],a:0,e:'Proposal membatasi kesimpulan pada kelayakan awal, bukan efektivitas jangka panjang.'},
  {cat:'practice',q:'Jika akses lapangan belum tersedia, langkah yang tepat adalah ...',o:['Mencatat keterbatasan dan menyesuaikan jadwal atau metode','Mengaku observasi telah dilakukan','Mengisi data praktisi fiktif','Menghapus kebutuhan izin'],a:0,e:'Observasi dan kegiatan di Setu Babakan bergantung pada izin dan ketersediaan praktisi.'},
  {cat:'practice',q:'Apa hubungan penelitian ini dengan SDG 11 Target 11.4?',o:['Relevan dengan pelindungan warisan budaya','Mengukur kualitas jaringan internet','Menggantikan tujuan pendidikan','Menilai pembangunan jalan saja'],a:0,e:'Proposal menyebut relevansi pada pelindungan warisan budaya.'},
  {cat:'practice',q:'Prinsip penting dalam menjaga warisan budaya takbenda adalah ...',o:['Transmisi dan partisipasi komunitas','Menghapus peran pemilik tradisi','Membatasi pembelajaran untuk aplikasi','Mengganti praktik budaya sepenuhnya'],a:0,e:'Proposal mengacu pada prinsip transmisi dan partisipasi komunitas dalam Konvensi UNESCO 2003.'},
  {cat:'practice',q:'Mengapa perubahan kompetensi perlu dilaporkan secara hati-hati?',o:['Uji coba terbatas hanya menunjukkan perubahan yang teramati','Aplikasi sudah membuktikan hasil untuk semua orang','Skor game sama dengan keahlian profesional','Semua indikator pasti berlaku universal'],a:0,e:'Hasil uji coba dibahas secara deskriptif dan tidak digeneralisasi sebagai efektivitas jangka panjang.'},
  {cat:'practice',q:'Data dalam prototipe lokal ini sebaiknya diperlakukan sebagai ...',o:['Catatan latihan yang perlu persetujuan dan interpretasi yang tepat','Bukti otomatis validasi praktisi','Pengganti data wawancara','Data publik untuk dibagikan bebas'],a:0,e:'Catatan aplikasi tidak otomatis menjadi data tervalidasi atau data publik.'}
];

const storyChallenges = [
  {q:'Seorang tokoh berjanji menjaga cerita kampungnya. Respons terbaik untuk melanjutkan tema ini adalah ...',o:['Mengembangkan pesan tentang tanggung jawab menjaga cerita','Berpindah mendadak ke bahasan cuaca','Mengulang kalimat tanpa tambahan','Menghapus tokoh dari cerita'],a:0,e:'Pilihan pertama menjaga hubungan tema dan memberi ruang untuk melanjutkan cerita.'},
  {q:'Bait sebelumnya bercerita tentang belajar pantun dari orang tua. Bagian selanjutnya yang paling nyambung adalah ...',o:['Menceritakan latihan bersama generasi muda','Beralih ke resep makanan tanpa penghubung','Mengganti semua tokoh','Mengulang bait pertama persis'],a:0,e:'Kelanjutan yang baik memperluas tema pewarisan keterampilan.'},
  {q:'Dalam dialog berbalas pantun, lawan bicara bertanya mengapa tradisi perlu dijaga. Isi balasan sebaiknya ...',o:['Menjelaskan nilai dan alasan menjaga tradisi','Membahas topik yang tidak terkait','Menjawab dengan daftar angka acak','Mengabaikan pertanyaan'],a:0,e:'Balasan sebaiknya menanggapi pertanyaan yang disampaikan.'}
];
const arrangeChallenges = [
  {lines:['Pergi ke pasar membeli jamu','Pulang berjalan saat petang','Rajin belajar menambah ilmu','Agar cita-cita makin gemilang']},
  {lines:['Burung kecil hinggap di dahan','Angin berembus dari selatan','Jaga budaya dengan perhatian','Agar lestari sepanjang zaman']},
  {lines:['Pagi hari menanam melati','Disiram air dekat perigi','Mari belajar sepenuh hati','Warisan budaya tetap lestari']}
];
const matchPairs = [
  ['Sampiran','Dua baris pertama pantun'],['Isi','Dua baris penyampai maksud'],['Rima','Keselarasan bunyi'],['Gambang Rancag','Perpaduan musik, sastra, dan teater'],['Pantun berkait','Pantun yang tersambung dalam cerita']
];
const rhymeChallenges = [
  {a:'melati',b:'hati',options:['hati','rumah','petang','awan'],answer:0},
  {a:'kali',b:'pagi',options:['cerita','pagi','jalan','mendung'],answer:1},
  {a:'berkarya',b:'budaya',options:['belajar','budaya','pohon','kawan'],answer:1}
];
const wordIdeas = {
  persahabatan:'Sahabat · bersama · berbagi · mendengar · setia · cerita · tertawa',
  semangat:'Tekun · usaha · berani · cita-cita · harapan · belajar · tumbuh',
  budaya:'Warisan · tradisi · cerita · kampung · pelestari · generasi · Betawi',
  alam:'Embun · mentari · taman · sungai · melati · burung · pepohonan',
  keluarga:'Orang tua · adik · kakak · nasihat · rumah · sayang · kebersamaan',
  kampung:'Gang · halaman · tetangga · pasar · suasana · cerita · rukun',
  keberanian:'Berani · percaya diri · melangkah · mencoba · tekad · gigih · harapan',
  persatuan:'Bersama · gotong royong · sejalan · mufakat · rukun · saling bantu',
  pendidikan:'Sekolah · guru · ilmu · membaca · bertanya · belajar · cita-cita',
  pertunjukan:'Panggung · penonton · irama · lakon · cerita · pantun · tepuk tangan',
  pewarisan:'Mewariskan · generasi · belajar · menuturkan · menjaga · meneruskan',
  harapan:'Mimpi · masa depan · tekun · tumbuh · cita-cita · semangat · usaha',
  persaudaraan:'Sahabat · saudara · saling jaga · peduli · berbagi · setia · bersama'
};
const stagePrompts = [
  ['Pergi ke pasar membeli ketan','Singgah sebentar di tepi kali','Kalau cerita ingin dilanjutkan','Pesan apa yang hendak kau gali?'],
  ['Burung nuri hinggap di dahan','Angin berembus dari selatan','Tradisi dijaga penuh perhatian','Bagaimana cara meneruskan warisan?'],
  ['Pagi hari menanam melati','Disiram air dekat perigi','Pantun dirangkai sepenuh hati','Cerita Betawi mari lestari']
];

// Bank tambahan V4: jumlah soal lintas mode diperbanyak dan diacak per sesi.
const extraQuestionBank = [
  {cat:'structure',q:'Pada pola pantun ABAB, baris yang biasanya memiliki bunyi akhir sejalan adalah ...',o:['Baris 1 dan 3','Baris 1 dan 2','Baris 2 dan 3','Baris 3 dan 4'],a:0,e:'Pola ABAB menghubungkan bunyi akhir baris pertama dengan ketiga, dan kedua dengan keempat.'},
  {cat:'structure',q:'Jika baris ketiga dan keempat berisi pesan, keduanya termasuk bagian ...',o:['Sampiran','Isi','Judul','Pengantar musik'],a:1,e:'Isi menyampaikan maksud atau pesan dalam pantun.'},
  {cat:'structure',q:'Apa yang sebaiknya diperiksa setelah empat baris pantun ditulis?',o:['Kelengkapan baris, pesan, dan keselarasan bunyi','Warna layar','Jumlah tombol aplikasi','Kecepatan mengetik saja'],a:0,e:'Pemeriksaan awal dapat memperhatikan struktur, pesan, dan bunyi akhir.'},
  {cat:'structure',q:'Satu bait pantun dasar terdiri dari ...',o:['Empat baris','Lima paragraf','Dua judul','Tiga tokoh'],a:0,e:'Bentuk dasar pantun yang dipakai dalam materi pengantar ini terdiri dari empat baris.'},
  {cat:'structure',q:'Apakah rima yang sama persis pada semua baris selalu menjadi pola dasar pantun?',o:['Tidak, contoh dasar yang dipelajari menggunakan ABAB','Ya, selalu AAAA','Ya, hanya satu bunyi boleh digunakan','Tidak ada bunyi akhir'],a:0,e:'Materi pengantar mengenalkan pola silang ABAB sebagai pola lazim.'},
  {cat:'structure',q:'Baris pertama dan kedua pada contoh pantun berfungsi sebagai ...',o:['Sampiran','Kesimpulan riset','Catatan kaki','Nama penulis'],a:0,e:'Dua baris pertama adalah sampiran.'},
  {cat:'structure',q:'Mengapa setiap baris pantun perlu dibaca kembali?',o:['Untuk memeriksa kejelasan pesan dan bunyi','Untuk menghapus semua kata','Agar judul lebih panjang','Agar semua baris sama persis'],a:0,e:'Membaca ulang membantu menemukan bagian yang kurang jelas atau belum selaras.'},
  {cat:'structure',q:'Jika sebuah bait hanya memiliki tiga baris, apa yang perlu dilakukan dalam latihan bentuk dasar?',o:['Melengkapi satu baris lagi','Menghapus judul','Mengganti tema warna','Menghentikan latihan'],a:0,e:'Lengkapi menjadi empat baris untuk bentuk dasar yang digunakan dalam latihan ini.'},
  {cat:'structure',q:'Bagian isi pantun sebaiknya ...',o:['Menyampaikan maksud yang dapat dipahami','Selalu mengulang sampiran persis','Tidak memiliki pesan','Hanya berisi angka'],a:0,e:'Isi memuat maksud atau pesan pantun.'},
  {cat:'structure',q:'Apa yang dimaksud rima dalam latihan pantun?',o:['Keselarasan bunyi','Nama tokoh cerita','Lokasi pertunjukan','Urutan tombol'],a:0,e:'Rima adalah keselarasan bunyi, termasuk bunyi pada akhir larik.'},
  {cat:'culture',q:'Dalam proposal Nadi Budaya, keterampilan yang mendapat perhatian khusus adalah ...',o:['Menyusun dan melantunkan pantun secara spontan','Menggambar peta digital','Membuat kostum mesin','Menghafal kode komputer'],a:0,e:'Proposal menyoroti kebutuhan latihan penyusunan dan pelantunan pantun spontan.'},
  {cat:'culture',q:'Gambang Rancag dikaji sebagai tradisi yang melibatkan transmisi keterampilan ...',o:['Antargenerasi','Antarmesin','Antarwarna','Antarperangkat'],a:0,e:'Proposal memusatkan perhatian pada pewarisan keterampilan antargenerasi.'},
  {cat:'culture',q:'Mengapa praktisi budaya penting dalam pengembangan Nadi Budaya?',o:['Membantu mengidentifikasi keterampilan dan menelaah indikator','Menggantikan semua peserta','Menentukan tema warna aplikasi saja','Menghapus proses belajar'],a:0,e:'Praktisi ditempatkan sebagai sumber pengetahuan dan penelaah kesesuaian isi.'},
  {cat:'culture',q:'Apa yang dimaksud partisipasi komunitas dalam konteks pelindungan tradisi?',o:['Komunitas ikut berperan dalam transmisi dan pemaknaan tradisi','Semua keputusan dibuat aplikasi','Tradisi dipisahkan dari pelakunya','Peserta tidak boleh bertanya'],a:0,e:'Proposal mengacu pada prinsip transmisi dan partisipasi komunitas.'},
  {cat:'culture',q:'Apa yang harus dilakukan sebelum memasukkan rekaman pertunjukan praktisi ke aplikasi?',o:['Meminta izin penggunaan dan mencatat sumbernya','Mengambil tanpa pemberitahuan','Menganggap semua rekaman bebas digunakan','Menghapus nama pemilik'],a:0,e:'Rekaman perlu persetujuan dan izin penggunaan dari pemilik atau pihak terkait.'},
  {cat:'culture',q:'Lokasi demonstrasi awal yang direncanakan dalam proposal adalah ...',o:['Perkampungan Budaya Betawi Setu Babakan','Kawasan pegunungan','Studio televisi luar negeri','Laboratorium robotika'],a:0,e:'Proposal merencanakan koordinasi dan demonstrasi awal di Setu Babakan dengan persetujuan pengelola dan praktisi.'},
  {cat:'culture',q:'Apa yang perlu dilakukan jika izin observasi lapangan belum tersedia?',o:['Menyesuaikan pelaksanaan dan mencatat keterbatasannya','Mengaku observasi sudah berlangsung','Mengisi data palsu','Menghapus bagian metode'],a:0,e:'Pelaksanaan observasi bergantung pada izin dan ketersediaan praktisi.'},
  {cat:'culture',q:'Gambang Rancag dalam materi pengantar dikaitkan dengan perpaduan ...',o:['Musik, sastra pantun, dan penuturan cerita','Olahraga, matematika, dan robotika','Fotografi dan desain busana saja','Pidato tanpa cerita'],a:0,e:'Materi merangkum Gambang Rancag sebagai praktik yang memadukan musik, pantun, dan penuturan cerita.'},
  {cat:'story',q:'Sebuah pantun balasan membahas hal yang sama sekali tidak terkait dengan pertanyaan sebelumnya. Apa yang perlu diperbaiki?',o:['Keterhubungan isi dengan konteks','Jumlah ikon','Warna huruf','Ukuran gambar'],a:0,e:'Respons sebaiknya berkaitan dengan konteks atau pesan sebelumnya.'},
  {cat:'story',q:'Dua bait menceritakan proses belajar dari orang tua lalu latihan bersama teman. Hubungan antarbait tersebut menunjukkan ...',o:['Kelanjutan gagasan','Kesalahan warna','Perubahan ukuran font','Pengulangan tanpa makna'],a:0,e:'Bait kedua melanjutkan tema pewarisan melalui latihan bersama.'},
  {cat:'story',q:'Saat menyimak cerita pantun, informasi yang membantu mengenali alur adalah ...',o:['Tokoh, peristiwa, dan hubungan antarbagian','Warna pakaian pembaca saja','Jumlah huruf setiap kata','Nama browser'],a:0,e:'Tokoh dan peristiwa membantu pendengar memahami alur.'},
  {cat:'story',q:'Jika tokoh dalam cerita berubah, apa yang sebaiknya dijaga?',o:['Alasan dan hubungan perubahan dengan cerita','Semua baris dihapus','Rima tidak perlu diperiksa','Pesan dihilangkan'],a:0,e:'Perubahan tokoh perlu dapat dipahami dalam alur yang dibangun.'},
  {cat:'practice',q:'Peta Kompetensi pada Nadi Kit digunakan untuk mencatat ...',o:['Kemampuan awal, pengalaman, minat, dan kesiapan peserta','Alamat rumah peserta','Kata sandi guru','Jumlah pengunjung website'],a:0,e:'Peta Kompetensi merupakan instrumen pemetaan awal peserta.'},
  {cat:'practice',q:'Pencocokan Kebutuhan Belajar dilakukan dengan cara ...',o:['Membandingkan kompetensi awal dan keterampilan yang dibutuhkan','Mengacak semua peserta tanpa alasan','Menghapus catatan latihan','Memilih musik latar'],a:0,e:'Hasil pencocokan membantu menentukan prioritas latihan.'},
  {cat:'practice',q:'Jalur Pendampingan Adaptif seharusnya disusun berdasarkan ...',o:['Hasil pencocokan kebutuhan belajar','Warna favorit semua peserta','Urutan acak yang sama bagi semua orang','Kecepatan internet'],a:0,e:'Jalur latihan mengikuti kebutuhan belajar peserta.'},
  {cat:'practice',q:'Paspor Perkembangan Budaya membantu mencatat ...',o:['Penilaian awal, latihan, perkembangan, dan kebutuhan berikutnya','Kontak pribadi semua narasumber','Rekaman kamera otomatis','Daftar password'],a:0,e:'Paspor merekam jejak latihan dan perkembangan peserta.'},
  {cat:'practice',q:'Jika guru memberi nilai pada satu tugas, bukti yang baik adalah ...',o:['Contoh perilaku atau hasil yang benar-benar diamati','Perkiraan tanpa melihat tugas','Perbandingan berdasarkan popularitas','Komentar tentang penampilan perangkat'],a:0,e:'Catatan penilaian sebaiknya merujuk pada bukti pengamatan.'},
  {cat:'practice',q:'Apa perbedaan penilaian diri dan penilaian guru?',o:['Sumber pengamatannya berbeda dan perlu dicatat terpisah','Keduanya selalu sama','Penilaian diri otomatis menjadi validasi','Penilaian guru tidak memerlukan bukti'],a:0,e:'Keduanya merupakan jenis catatan yang berbeda dan tidak boleh disamakan.'},
  {cat:'practice',q:'Mengapa kode peserta digunakan pada ruang penilaian?',o:['Mengurangi penggunaan identitas pribadi dalam catatan','Agar nilai otomatis lebih tinggi','Untuk mengganti rubrik','Untuk membuka kamera'],a:0,e:'Kode peserta membantu menjaga data tetap minimal dan lebih privat.'},
  {cat:'practice',q:'Apa arti uji coba terbatas menurut rancangan proposal?',o:['Menilai kelayakan awal dan keterpakaian prototipe','Membuktikan efektivitas jangka panjang','Memberi sertifikat profesi','Menggantikan wawancara'],a:0,e:'Proposal membatasi kesimpulan pada kelayakan awal dan perubahan yang teramati.'},
  {cat:'practice',q:'Mengapa skor permainan tidak boleh dianggap sebagai sertifikasi budaya?',o:['Skor game hanya pemeriksaan sederhana dan belum menilai seluruh praktik','Karena permainan selalu salah','Karena semua peserta harus menang','Karena aplikasi tidak boleh mencatat progres'],a:0,e:'Keterampilan tradisi perlu diamati dan ditelaah sesuai indikator bersama praktisi.'},
  {cat:'practice',q:'Apa hubungan Nadi Budaya dengan UNESCO 2003 dalam proposal?',o:['Mengacu pada prinsip transmisi warisan budaya takbenda dan partisipasi komunitas','Menggunakan sistem peringkat olahraga','Mengatur tema musik aplikasi','Menggantikan seluruh pelaku tradisi'],a:0,e:'Proposal mengacu pada prinsip transmisi dan partisipasi komunitas dalam Konvensi UNESCO 2003.'},
  {cat:'practice',q:'SDG 11 Target 11.4 relevan dengan penelitian karena berhubungan dengan ...',o:['Pelindungan warisan budaya','Kecepatan komputer','Penilaian bahasa asing','Pengaturan jaringan lokal'],a:0,e:'Proposal menyebut relevansinya terhadap penguatan pelindungan warisan budaya.'},
  {cat:'practice',q:'Materi yang belum ditelaah praktisi sebaiknya diberi status ...',o:['Draf atau materi awal','Tervalidasi','Sertifikasi resmi','Standar nasional'],a:0,e:'Status validasi tidak boleh diklaim sebelum ada proses telaah yang benar-benar dilakukan.'},
  {cat:'practice',q:'Apa tindakan yang tepat ketika rekomendasi aplikasi tidak sesuai kebutuhan peserta?',o:['Tinjau ulang pemetaan dan sesuaikan pendampingan bersama pendamping','Paksa peserta mengikuti rekomendasi','Hapus semua catatan','Anggap rekomendasi selalu benar'],a:0,e:'Model adaptif perlu ditinjau berdasarkan kebutuhan peserta dan masukan pendamping.'},
  {cat:'practice',q:'Mengapa catatan penilaian awal dan akhir perlu memakai indikator yang sebanding?',o:['Agar perubahan yang teramati dapat dibandingkan secara deskriptif','Agar hasil selalu meningkat','Agar skor menjadi sertifikasi','Agar tidak perlu catatan observasi'],a:0,e:'Indikator yang sebanding membantu pembacaan perubahan secara deskriptif.'},
  {cat:'practice',q:'Siapa yang sebaiknya menelaah kecocokan konten budaya dalam aplikasi?',o:['Praktisi Gambang Rancag dan pihak komunitas yang relevan','Pengembang aplikasi saja','Pengguna yang tidak mengenal tradisi','Mesin secara otomatis'],a:0,e:'Kesesuaian materi budaya harus ditelaah bersama sumber pengetahuan dan komunitas.'},
  {cat:'practice',q:'Apa yang perlu diperhatikan saat merekam suara peserta?',o:['Persetujuan, pilihan untuk tidak merekam, dan penyimpanan yang jelas','Rekam otomatis tanpa bertanya','Wajibkan semua peserta berbicara','Publikasikan rekaman otomatis'],a:0,e:'Rekaman bersifat opsional dan perlu persetujuan serta informasi penggunaan yang jelas.'},
  {cat:'practice',q:'Fitur aksesibilitas yang memberi pilihan bagi pengguna adalah ...',o:['Ukuran teks, spasi, tema, dan font yang dapat diatur','Satu jenis teks wajib untuk semua','Animasi wajib menyala','Tombol kecil untuk semua perangkat'],a:0,e:'Aksesibilitas yang baik memberi pilihan dan dapat disesuaikan.'},
  {cat:'practice',q:'Apa yang harus dilakukan bila isi materi budaya mendapat koreksi dari praktisi?',o:['Catat masukan dan revisi materi dengan jejak perubahan','Abaikan masukan','Hapus nama penelaah','Nyatakan materi final tanpa perubahan'],a:0,e:'Masukan praktisi perlu dicatat dan digunakan untuk penyempurnaan prototipe.'}
];
questionBank.push(...extraQuestionBank);

arrangeChallenges.push(
  {lines:['Mentari pagi menyinari halaman','Angin berembus membawa berita','Belajar tekun jadi pegangan','Menjaga tradisi tugas kita']},
  {lines:['Ke tepi kali membawa bekal','Singgah sebentar membeli pepaya','Pantun dirangkai dengan akal','Cerita tersambung penuh makna']},
  {lines:['Bunga melati tumbuh di taman','Disiram hujan saat petang','Ayo belajar bersama kawan','Agar budaya tetap dikenang']},
  {lines:['Naik sepeda menuju kota','Melihat perahu di tepi kali','Jaga cerita milik kita','Sampaikan dengan sepenuh hati']},
  {lines:['Burung berkicau di atas dahan','Daun bergoyang tertiup bayu','Mari berlatih dengan ketekunan','Pantun tersusun menjadi ilmu']},
  {lines:['Pagi cerah membuka jendela','Kupu-kupu hinggap di melati','Tutur cerita jangan dilupa','Wariskan pada generasi nanti']},
  {lines:['Singgah di warung membeli roti','Air hangat tersedia di meja','Dengarkan cerita sepenuh hati','Lalu sambung dengan bijaksana']},
  {lines:['Perahu kecil berlayar perlahan','Ombak berayun di laut biru','Sampiran mengantar sebuah pesan','Isi menjelaskan maksudmu']},
  {lines:['Jalan setapak menuju taman','Ada pepohonan di tepi kali','Peta belajar jadi panduan','Latihan dipilih sesuai diri']},
  {lines:['Beli rambutan di hari Minggu','Dibawa pulang bersama teman','Catat perkembangan dengan jujur','Agar latihan punya pedoman']},
  {lines:['Bintang bersinar di malam terang','Bulan terlihat di balik awan','Pantun berkait menjaga alur panjang','Setiap bait saling bersambungan']},
  {lines:['Pergi ke kebun membawa keranjang','Buah dipetik menjelang petang','Belajar tradisi bukan sekadar datang','Perlu latihan dan pendampingan']},
  {lines:['Air mengalir di sela batu','Ikan berenang di dalam kali','Pahami pesan sebelum membalas itu','Agar cerita tetap tersambung rapi']},
  {lines:['Daun pandan harum baunya','Diletakkan dekat jendela','Bila ada masukan catat semuanya','Revisi dilakukan dengan terbuka']},
  {lines:['Jalan sore bersama saudara','Melihat langit berwarna jingga','Karya tersimpan jadi penanda','Perkembangan ditinjau bersama']},
  {lines:['Pohon rindang menaungi jalan','Burung hinggap sebentar di dahan','Praktisi memberi pertimbangan','Indikator ditelaah sebelum digunakan']},
  {lines:['Pagi hari membuat anyaman','Dikerjakan rapi dengan teliti','Latihan bertahap jadi pegangan','Pilih kebutuhan yang ingin dilatih']}
);

storyChallenges.push(
  {q:'Seorang peserta sudah mengenali sampiran dan isi, tetapi belum lancar menyusun pantun. Langkah yang sesuai adalah ...',o:['Memberi latihan menyusun pantun bertahap','Langsung memberi penilaian akhir','Menghentikan latihan','Mengganti topik tanpa alasan'],a:0,e:'Latihan perlu disesuaikan dengan kebutuhan dan dilakukan bertahap.'},
  {q:'Satu bait bercerita tentang belajar dari orang tua. Bait berikutnya ingin melanjutkan tema pewarisan. Pilihan yang paling nyambung adalah ...',o:['Menceritakan peserta berlatih bersama pendamping','Berpindah mendadak ke topik kendaraan','Mengulang bait sama persis','Menghilangkan tokoh'],a:0,e:'Kelanjutan cerita tetap membawa tema pewarisan keterampilan.'},
  {q:'Dalam cerita, seorang tokoh meminta penjelasan tentang alasan menjaga tradisi. Balasan yang tepat sebaiknya ...',o:['Memberikan alasan atau contoh pentingnya tradisi','Menyebut angka tanpa hubungan','Mengabaikan pertanyaan','Mengganti seluruh tokoh'],a:0,e:'Balasan yang baik menanggapi pertanyaan sebelumnya.'},
  {q:'Guru meminta peserta menceritakan pengalaman saat belajar pantun. Isi cerita sebaiknya ...',o:['Menggambarkan pengalaman dan hal yang dipelajari','Berisi daftar warna saja','Mengulang judul berkali-kali','Menghilangkan urutan peristiwa'],a:0,e:'Pengalaman dan urutan peristiwa membantu cerita mudah diikuti.'},
  {q:'Dua orang bergantian membalas pantun. Hal yang perlu dijaga agar dialog terhubung adalah ...',o:['Respons menanggapi pantun sebelumnya','Setiap jawaban mengganti tema secara acak','Semua tokoh harus diam','Tidak perlu mendengarkan lawan bicara'],a:0,e:'Dialog yang tersambung membutuhkan perhatian terhadap konteks sebelumnya.'},
  {q:'Bait ketiga sebuah cerita memperkenalkan tokoh baru. Agar tidak membingungkan, penulis perlu ...',o:['Menjelaskan hubungan tokoh baru dengan alur','Menghapus dua bait sebelumnya','Menghilangkan pesan','Mengganti semua kata akhir'],a:0,e:'Tokoh baru perlu diperkenalkan dengan hubungan yang dapat diikuti.'},
  {q:'Peserta membaca sebuah pantun tetapi tidak memahami isi. Strategi pertama yang membantu adalah ...',o:['Membaca kembali dua baris isi dan mencari maksudnya','Hanya menghitung tanda baca','Mengabaikan dua baris terakhir','Menebak tanpa membaca'],a:0,e:'Dua baris isi memuat maksud utama pantun.'},
  {q:'Dalam cerita berkait, sebuah bait mengulang kata dari bait sebelumnya. Pengulangan itu sebaiknya ...',o:['Membantu menghubungkan gagasan antarbait','Menghapus hubungan cerita','Selalu dibuat tanpa alasan','Menggantikan seluruh isi'],a:0,e:'Pengulangan dapat menjadi jembatan bila membantu kesinambungan.'},
  {q:'Peserta membuat balasan pantun yang rima akhirnya baik tetapi isinya tidak menjawab pemantik. Bagian yang perlu ditinjau adalah ...',o:['Keterhubungan makna','Hanya warna huruf','Jumlah halaman','Kecepatan mengetik'],a:0,e:'Rima bukan satu-satunya aspek; makna dan konteks juga penting.'},
  {q:'Seorang pendengar belum mengerti siapa yang sedang berbicara dalam cerita. Apa yang perlu dibuat lebih jelas?',o:['Tokoh dan giliran tuturnya','Ukuran tombol aplikasi','Warna latar','Jumlah ikon'],a:0,e:'Penanda tokoh atau giliran membantu pendengar mengikuti dialog.'},
  {q:'Sebuah cerita berakhir sebelum masalah yang diperkenalkan mendapat tanggapan. Hal yang perlu dipertimbangkan adalah ...',o:['Memberi penutup yang menjawab atau merangkum masalah','Menambah dekorasi','Menghapus tokoh utama','Mengganti jenis huruf'],a:0,e:'Penutup yang terhubung membantu cerita terasa utuh.'},
  {q:'Peserta ingin menyambung bait tentang latihan pantun dengan pengalaman tampil. Kelanjutan yang tepat adalah ...',o:['Menceritakan persiapan atau pengalaman di panggung','Beralih ke topik yang tidak berkaitan','Menghapus pengalaman latihan','Mengulang sampiran saja'],a:0,e:'Pengalaman tampil dapat menjadi kelanjutan alami dari proses latihan.'},
  {q:'Saat cerita dibawakan bergantian, apa yang membantu pasangan pembawa cerita?',o:['Mendengarkan, menanggapi, dan menjaga sambungan gagasan','Berbicara bersamaan sepanjang waktu','Mengabaikan giliran','Mengganti isi tanpa mendengar'],a:0,e:'Pergiliran dan respons membantu menjaga keterhubungan cerita.'},
  {q:'Seorang peserta memberi jawaban berbeda dari contoh tetapi masih sesuai konteks. Respons penilai yang tepat adalah ...',o:['Meninjau makna dan alasan, bukan hanya kesamaan dengan contoh','Langsung menyatakan salah tanpa alasan','Menghapus jawaban','Menganggap hanya satu jawaban kata demi kata yang benar'],a:0,e:'Jawaban terbuka perlu ditinjau berdasarkan konteks dan rubrik yang disepakati.'},
  {q:'Cerita tentang kegiatan bersama komunitas dapat dilanjutkan dengan ...',o:['Menjelaskan peran peserta dan praktisi dalam kegiatan','Mengganti mendadak ke topik acak','Menghapus semua peran','Mengulang judul saja'],a:0,e:'Peran orang-orang dalam kegiatan dapat melanjutkan konteks cerita.'},
  {q:'Jika satu bait terasa tidak tersambung, apa yang dapat dilakukan penulis?',o:['Menambahkan penghubung gagasan atau meninjau urutan bait','Mengubah font saja','Menghapus semua bait','Mengabaikan pembaca'],a:0,e:'Penghubung gagasan atau urutan ulang dapat membantu alur.'},
  {q:'Peserta diminta merespons pantun spontan, tetapi perlu waktu berpikir. Pendamping sebaiknya ...',o:['Memberi waktu dan dukungan sesuai kebutuhan latihan','Memaksa menjawab seketika','Menghentikan kesempatan berlatih','Menilai dari kecepatan saja'],a:0,e:'Pendampingan adaptif memberi dukungan sesuai kebutuhan peserta.'}
);

matchPairs.push(
  ['Peta Kompetensi','Instrumen mencatat kemampuan awal dan kesiapan'],
  ['Pencocokan Kebutuhan Belajar','Membandingkan kemampuan awal dengan kebutuhan keterampilan'],
  ['Jalur Pendampingan Adaptif','Panduan latihan berdasarkan prioritas peserta'],
  ['Paspor Perkembangan Budaya','Catatan penilaian, latihan, dan perkembangan'],
  ['UNESCO 2003','Konvensi pelindungan warisan budaya takbenda'],
  ['SDG 11 Target 11.4','Penguatan pelindungan warisan budaya'],
  ['Wawancara semi-terstruktur','Pengumpulan informasi melalui pertanyaan terpandu'],
  ['Observasi','Pengamatan praktik atau proses pembelajaran'],
  ['Telaah praktisi','Masukan dari pelaku atau pewaris keterampilan'],
  ['Uji coba terbatas','Pemeriksaan kelayakan awal prototipe'],
  ['Penilaian diri','Pemetaan awal berdasarkan refleksi peserta'],
  ['Penilaian guru','Catatan pengamatan guru pada tugas tertentu'],
  ['Kode peserta','Pseudonim untuk mengurangi penggunaan identitas pribadi'],
  ['Rubrik','Kriteria untuk membantu penilaian lebih terarah'],
  ['Pantun berkait','Rangkaian bait yang saling tersambung'],
  ['Sampiran','Dua baris pertama pantun'],
  ['Isi','Bagian yang menyampaikan maksud pantun'],
  ['Rima ABAB','Pola silang bunyi akhir baris'],
  ['Partisipasi komunitas','Keterlibatan komunitas dalam pelindungan tradisi'],
  ['Transmisi antargenerasi','Pewarisan keterampilan dari generasi ke generasi']
);

rhymeChallenges.push(
  {a:'melati',b:'hati',options:['hati','rumah','petang','awan'],answer:0},
  {a:'sayang',b:'riang',options:['jalan','riang','hutan','buku'],answer:1},
  {a:'harapan',b:'kehidupan',options:['kehidupan','jendela','taman','kali'],answer:0},
  {a:'budaya',b:'karya',options:['melati','karya','petang','awan'],answer:1},
  {a:'cerita',b:'kita',options:['kita','rumah','jalan','pagi'],answer:0},
  {a:'perigi',b:'diri',options:['diri','awan','petang','taman'],answer:0},
  {a:'petang',b:'datang',options:['datang','melati','buku','kali'],answer:0},
  {a:'bermain',b:'lain',options:['lain','cerita','hujan','pohon'],answer:0},
  {a:'berseri',b:'lestari',options:['lestari','jendela','perahu','pagi'],answer:0},
  {a:'sahabat',b:'dekat',options:['dekat','awan','melati','sungai'],answer:0},
  {a:'terang',b:'gemilang',options:['gemilang','perahu','taman','buku'],answer:0},
  {a:'bersama',b:'utama',options:['utama','jendela','petang','hujan'],answer:0},
  {a:'kembali',b:'peduli',options:['peduli','sampiran','budaya','cerita'],answer:0},
  {a:'tumbuh',b:'utuh',options:['utuh','melati','perahu','halaman'],answer:0},
  {a:'pelita',b:'cerita',options:['cerita','hutan','pagi','jalan'],answer:0},
  {a:'pesan',b:'kesan',options:['kesan','riang','kali','buku'],answer:0},
  {a:'terjaga',b:'keluarga',options:['keluarga','awan','malam','sungai'],answer:0},
  {a:'berbagi',b:'tinggi',options:['tinggi','petang','taman','budaya'],answer:0},
  {a:'langkah',b:'arah',options:['arah','cerita','melati','perigi'],answer:0},
  {a:'indah',b:'sudah',options:['sudah','berkait','taman','pagi'],answer:0},
  {a:'kampung',b:'gunung',options:['gunung','melati','hati','cerita'],answer:0},
  {a:'menari',b:'hari',options:['hari','awan','rumah','petang'],answer:0}
);

Object.assign(wordIdeas, {
  keluarga:'Orang tua · anak · saudara · cerita · nasihat · bersama · kenangan',
  kampung:'Kampung · halaman · tetangga · jalan · balai · suasana · cerita',
  keberanian:'Berani · mencoba · percaya · tumbuh · belajar · tampil · tekun',
  persatuan:'Bersama · gotong royong · rukun · saling bantu · sepakat · damai',
  pendidikan:'Belajar · guru · latihan · bertanya · memahami · mencoba · berkembang',
  pertunjukan:'Panggung · penutur · irama · penonton · dialog · cerita · giliran',
  pewarisan:'Generasi · orang tua · penerus · belajar · menuturkan · menjaga',
  alam:'Embun · mentari · taman · sungai · melati · burung · pepohonan',
  harapan:'Cita-cita · usaha · semangat · tekun · masa depan · tumbuh',
  persaudaraan:'Sahabat · keluarga · saling dengar · peduli · bersama · setia',
  kegiatan:'Latihan · sanggar · bertemu · mengamati · mencatat · berbagi'
});

stagePrompts.push(
  ['Pergi ke taman melihat kenanga','Singgah sebentar di tepi kali','Cerita kampung jangan menghilang','Bagaimana kita merawatnya kembali?'],
  ['Pagi hari menata panggung','Kursi disusun berjajar rapi','Kawan datang membawa semangat','Cerita apa yang akan dibagi?'],
  ['Burung kecil terbang melayang','Hinggap sebentar di atas dahan','Jika pantun belum tersusun terang','Langkah latihan apa yang dilakukan?'],
  ['Pergi ke pasar membeli pepaya','Pulang berjalan bersama saudara','Tradisi dijaga oleh semuanya','Bagaimana generasi ikut serta?'],
  ['Bunga kenanga harum baunya','Tumbuh di dekat halaman','Dengarkan dulu isi ceritanya','Lalu sambung dengan jawaban'],
  ['Jalan pagi menyusuri taman','Melihat mentari mulai berseri','Belajar pantun perlu latihan','Apa langkah kecil hari ini?'],
  ['Air mengalir di dekat perigi','Daun melati jatuh ke tanah','Bila teman memberi inspirasi','Bagaimana kita menyambung kisah?'],
  ['Kain disimpan di dalam peti','Peti diletakkan dekat jendela','Cerita lama tetap berarti','Apa cara meneruskannya?'],
  ['Pergi bersama menuju balai','Singgah sebentar membeli jamu','Jika dua bait saling terkait','Apa yang membuat alurnya padu?'],
  ['Malam tiba bintang bercahaya','Angin lembut menyentuh halaman','Kita belajar menjaga budaya','Siapa saja dapat berperan?'],
  ['Pagi cerah membuka hari','Embun menetes di daun pandan','Guru mengamati proses belajar','Bukti apa yang perlu dicatat?'],
  ['Melati putih tumbuh di taman','Disiram rutin setiap pagi','Praktisi memberi arahan','Bagaimana masukan ditindaklanjuti?'],
  ['Pergi ke sanggar membawa catatan','Bertemu kawan untuk berlatih','Apa arti pendampingan adaptif dalam pembelajaran?','Bagaimana memilih latihan yang sesuai?'],
  ['Beli ketan di hari Minggu','Dibagi rata bersama teman','Apa fungsi Paspor Budaya bagimu?','Perkembangan apa yang ingin dicatatkan?'],
  ['Langit biru terlihat cerah','Awan berjalan perlahan-lahan','Bagaimana respons yang tetap terarah','Saat cerita perlu dilanjutkan?'],
  ['Burung berkicau di pohon jati','Daun bergoyang tertiup bayu','Bagaimana menjaga bunyi dan isi','Agar pantun tersusun padu?'],
  ['Panggung kecil dihias bunga','Lampu dinyalakan menjelang malam','Bagaimana menyiapkan pertunjukan bersama','Agar cerita dapat dipahami pendengar?']
);


function showToast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
async function api(path, options = {}) {
  const res = await fetch(path, {credentials:'same-origin', headers: {'Content-Type':'application/json'}, ...options});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Permintaan gagal (${res.status})`);
  return data;
}
function escapeHTML(value='') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function getLastWord(text) { const words = String(text).trim().toLowerCase().replace(/[^\p{L}\s]/gu,'').split(/\s+/); return words[words.length-1] || ''; }
function ending(text) { const w = getLastWord(text); return w.slice(-2); }
function setPage(page) {
  if (!$('#page-' + page)) return;
  lastGameAnnouncement = '';
  if (page === 'teacher' && !teacherAuthorized) { showToast('Masuk melalui pilihan Guru / Penelaah terlebih dahulu.'); return; }
  activePage = page;
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  $$('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  const nav = $(`.nav-link[data-page="${page}"]`);
  $('#pageCrumb').textContent = nav ? nav.textContent.trim().replace(/\s+/g,' ') : 'Ruang Belajar';
  history.replaceState(null, '', '#' + page);
  $('#sidebar').classList.remove('open');
  if (page === 'passport') renderPassport();
  if (page === 'competency') renderCompetency();
  if (page === 'path') renderPath();
  if (page === 'camera') startCameraPolling(); else { stopCameraPolling(); stopRhythm(); if (!$('#cameraStop').disabled) stopCamera(); }
  if (page !== 'stage') stopVoiceRecording();
  $('#content').focus({preventScroll:true});
  if ($('#voiceFocusToggle')?.checked) {
    const title = $('#page-' + page)?.querySelector('h1, h2')?.textContent?.replace(/\s+/g, ' ').trim() || (nav?.textContent || 'Beranda').trim();
    window.setTimeout(() => speakText(`Halaman ${title}.`, 'Jelajah Suara'), 80);
  }
}
function applySettings(settings = {}) {
  document.body.dataset.theme = settings.theme || 'light';
  document.documentElement.style.setProperty('--font-scale', String((settings.font_scale || 100) / 100));
  document.body.classList.toggle('inclusive', !!settings.inclusive);
  document.body.classList.toggle('reduced-motion', !!settings.reduced_motion);
  document.body.classList.toggle('simple-mode', !!settings.simple_mode);
  document.body.classList.toggle('large-buttons', !!settings.large_buttons);
  document.body.classList.toggle('hints-off', settings.captions === false);
  $('#fontScale').value = settings.font_scale || 100;
  $('#fontScaleLabel').textContent = (settings.font_scale || 100) + '%';
  $('#inclusiveToggle').checked = !!settings.inclusive;
  $('#motionToggle').checked = !!settings.reduced_motion;
  $('#captionsToggle').checked = settings.captions !== false;
  $('#buttonsToggle').checked = !!settings.large_buttons;
  $('#simpleToggle').checked = !!settings.simple_mode;
  $('#readingFont').value = settings.dyslexia_font ? 'dyslexia' : (settings.reading_font || 'standard');
  $('#letterSpacing').value = settings.letter_spacing ?? 0;
  $('#letterSpacingLabel').textContent = String(settings.letter_spacing ?? 0);
  $('#lineSpacing').value = settings.line_spacing ?? 1.45;
  $('#lineSpacingLabel').textContent = String(settings.line_spacing ?? 1.45);
  document.body.dataset.readingFont = settings.dyslexia_font ? 'dyslexia' : (settings.reading_font || 'standard');
  document.documentElement.style.setProperty('--letter-spacing', `${settings.letter_spacing ?? 0}em`);
  document.documentElement.style.setProperty('--line-spacing', String(settings.line_spacing ?? 1.45));
  if ($('#ttsRate')) { $('#ttsRate').value = settings.tts_rate ?? 0.9; $('#ttsRateLabel').textContent = `${Number($('#ttsRate').value).toLocaleString('id-ID')}×`; }
  if ($('#ttsVolume')) { $('#ttsVolume').value = settings.tts_volume ?? 1; $('#ttsVolumeLabel').textContent = `${Math.round(Number($('#ttsVolume').value) * 100)}%`; }
  if ($('#ttsVoice') && settings.tts_voice) { $('#ttsVoice').dataset.preferredVoice = settings.tts_voice; if (ttsVoices.some(v => v.name === settings.tts_voice)) $('#ttsVoice').value = settings.tts_voice; }
  $('#voiceFocusToggle').checked = !!settings.voice_focus;
  $('#voiceTypingToggle').checked = !!settings.voice_typing;
  $('#voiceGameToggle').checked = !!settings.voice_game;
  $('#typingEcho').value = settings.typing_echo || 'word';
  $('#musicVolume').value = settings.music_volume ?? 0.3;
  $('#musicVolumeLabel').textContent = `${Math.round(Number($('#musicVolume').value) * 100)}%`;
  const audio = $('#betawiAudio'); if (audio) audio.volume = Number($('#musicVolume').value);
  // Musik tidak diputar otomatis saat halaman dibuka; pengguna memberi izin lewat tombol Musik.
  $('#settingsMusicToggle').checked = !!settings.music_enabled;
  musicAutoplayRequested = !!settings.music_enabled;
  updateMusicButton(backgroundMusicEnabled);
  $$('.theme-choice').forEach(b => b.classList.toggle('selected', b.dataset.theme === (settings.theme || 'light')));
}
function renderDashboard() {
  if (!appState) return;
  const xp = appState.xp || 0, level = appState.level || 1, next = xp % 100;
  $('#topXp').textContent = `${xp} XP`;
  $('#topName').textContent = appState.profile?.name || 'Penjelajah';
  $('#homeName').textContent = appState.profile?.name || 'Penjelajah Budaya';
  $('#passportName').textContent = appState.profile?.name || 'Penjelajah Budaya';
  $('#homeXp').textContent = xp;
  $('#homeActivities').textContent = appState.stats?.activities || 0;
  $('#levelNumber').textContent = level;
  $('#homeXp').textContent = xp;
  $('#xpProgress').style.width = next + '%';
  $('#xpHint').textContent = `${100-next} XP menuju level berikutnya`;
  $('#statQuiz').textContent = appState.stats?.quiz_answered || 0;
  $('#statCorrect').textContent = appState.stats?.quiz_correct || 0;
  $('#statGames').textContent = appState.stats?.games_finished || 0;
  $('#savedCount').textContent = `${appState.saved_pantuns?.length || 0} pantun`;
  $('#passportXp').textContent = `${xp} XP`;
}
async function refreshState() {
  appState = await api('/api/state');
  renderDashboard();
  applySettings(appState.settings);
  renderCompetency();
  renderPassport();
  renderPath();
}
async function logActivity(title, kind, score, xp, answered=0, correct=0) {
  try {
    appState = await api('/api/activity', {method:'POST', body:JSON.stringify({title,kind,score,xp,answered,correct})});
    renderDashboard();
    renderPassport();
  } catch (err) { showToast(err.message); }
}

// GAME HUB
function selectGame(game) {
  currentGame = game;
  lastGameAnnouncement = '';
  $$('.game-tab').forEach(b => b.classList.toggle('active', b.dataset.game === game));
  if (game === 'quiz') renderQuizIntro();
  if (game === 'arrange') renderArrangeIntro();
  if (game === 'match') renderMatchIntro();
  if (game === 'story') renderStoryIntro();
  if (game === 'rhyme') renderRhymeIntro();
}
let quizSession = null;
function renderQuizIntro() {
  $('#gameArea').innerHTML = `<div class="game-shell"><div class="game-heading"><div><div class="eyebrow">80 SOAL · PILIHAN GANDA</div><h3>Kuis pengetahuan dan keterampilan</h3></div><span class="tag-soft">10 SOAL / SESI</span></div><p class="muted-note">Soal diacak dari materi dasar pantun, Gambang Rancag, cerita berkait, dan model Nadi Budaya.</p><div class="choice-row" id="quizCategory"><button class="theme-choice selected" data-cat="all">Semua topik</button><button class="theme-choice" data-cat="structure">Pantun</button><button class="theme-choice" data-cat="culture">Budaya</button><button class="theme-choice" data-cat="story">Cerita</button><button class="theme-choice" data-cat="practice">Nadi Kit</button></div><div class="game-footer"><span class="muted-note">+10 XP jika sesi diselesaikan</span><button class="btn btn-primary" id="startQuiz">Mulai kuis →</button></div></div>`;
  $$('#quizCategory button').forEach(b => b.addEventListener('click', () => { $$('#quizCategory button').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); }));
  $('#startQuiz').addEventListener('click', () => startQuiz($('#quizCategory .selected')?.dataset.cat || 'all'));
}
function startQuiz(category='all') {
  const pool = category === 'all' ? questionBank : questionBank.filter(q => q.cat === category);
  const chosen = [...pool].sort(() => Math.random()-.5).slice(0, Math.min(10,pool.length)).map(q => {
    const options = q.o.map((text, index) => ({text, correct:index === q.a})).sort(() => Math.random()-.5);
    return {...q, o:options.map(item => item.text), a:options.findIndex(item => item.correct)};
  });
  quizSession = {items:chosen,index:0,correct:0,answered:0,locked:false};
  renderQuizQuestion();
}
function renderQuizQuestion() {
  const s=quizSession, q=s.items[s.index];
  $('#gameArea').innerHTML = `<div class="game-shell"><div class="game-heading"><div><div class="eyebrow">KUIS CEPAT</div><h3>Uji pengetahuanmu</h3></div><span class="question-count">${s.index+1} / ${s.items.length}</span></div><div class="progress-track"><span style="width:${(s.index/s.items.length)*100}%"></span></div><div class="question-text">${escapeHTML(q.q)}</div><div class="answer-grid">${q.o.map((option,i)=>`<button class="answer-option" data-answer="${i}"><span>${'ABCD'[i]}</span>${escapeHTML(option)}</button>`).join('')}</div><div id="quizFeedback" aria-live="polite"></div><div class="game-footer"><span class="muted-note">Jawab sesuai pemahamanmu.</span><button class="btn btn-primary hidden" id="quizNext">${s.index===s.items.length-1?'Lihat hasil':'Lanjut →'}</button></div></div>`;
  $$('.answer-option').forEach(b=>b.addEventListener('click',()=>answerQuiz(Number(b.dataset.answer))));
}
function answerQuiz(answer) {
  const s=quizSession;if(!s||s.locked)return;s.locked=true;s.answered++;
  const q=s.items[s.index], good=answer===q.a;if(good)s.correct++;
  $$('.answer-option').forEach((b,i)=>{b.disabled=true;if(i===q.a)b.classList.add('correct');else if(i===answer)b.classList.add('wrong');});
  $('#quizFeedback').innerHTML=`<div class="feedback-box ${good?'good':'bad'}"><b>${good?'Tepat!':'Belum tepat.'}</b> ${escapeHTML(q.e)}</div>`;
  $('#quizNext').classList.remove('hidden');$('#quizNext').addEventListener('click',()=>{s.index++;if(s.index<s.items.length){s.locked=false;renderQuizQuestion();}else finishQuiz();},{once:true});
}
async function finishQuiz() {
  const s=quizSession,score=Math.round((s.correct/s.items.length)*100),xp=10+Math.round(s.correct*1.5);
  await logActivity('Kuis pengetahuan pantun & Gambang Rancag','quiz',score,xp,s.answered,s.correct);
  $('#gameArea').innerHTML=`<div class="game-shell"><div class="eyebrow">SESI SELESAI</div><h3>Bagus, kamu sudah menyelesaikan kuis!</h3><div class="passport-metrics"><div><b>${s.correct}/${s.items.length}</b><span>Jawaban benar</span></div><div><b>${score}%</b><span>Skor sesi</span></div><div><b>+${xp}</b><span>XP</span></div></div><p class="muted-note">Baca kembali penjelasan pada setiap soal dan ulangi topik yang masih membingungkan.</p><div class="game-footer"><button class="btn btn-outline" id="quizBack">Pilih topik lain</button><button class="btn btn-primary" id="quizAgain">Main lagi ↻</button></div></div>`;
  $('#quizBack').addEventListener('click',renderQuizIntro);$('#quizAgain').addEventListener('click',()=>startQuiz('all'));showToast(`Kuis selesai · +${xp} XP`);
}
let arrangeSession=null;
function renderArrangeIntro(){ $('#gameArea').innerHTML=`<div class="game-shell"><div class="eyebrow">SUSUN PANTUN</div><h3>Urutkan empat baris menjadi pantun.</h3><p class="muted-note">Pilih kartu satu per satu untuk mengisi posisi baris. Kamu bisa mengosongkan kartu jika ingin mengubah pilihan.</p><div class="game-footer"><span class="muted-note">20 tantangan susun</span><button class="btn btn-primary" id="startArrange">Mulai tantangan →</button></div></div>`;$('#startArrange').addEventListener('click',startArrange); }
function startArrange(){const challenge=arrangeChallenges[Math.floor(Math.random()*arrangeChallenges.length)];arrangeSession={correct:[...challenge.lines],tiles:[...challenge.lines].sort(()=>Math.random()-.5),slots:[null,null,null,null]};renderArrange();}
function renderArrange(){const s=arrangeSession;$('#gameArea').innerHTML=`<div class="game-shell"><div class="game-heading"><div><div class="eyebrow">SUSUN PANTUN</div><h3>Atur urutan baris</h3></div><span class="tag-soft">${s.slots.filter(Boolean).length}/4 TERISI</span></div><div class="arrange-slots">${s.slots.map((line,i)=>`<button class="arrange-slot ${line?'filled':''}" data-slot="${i}">${line?`${i+1}. ${escapeHTML(line)}`:`${i+1}. Pilih satu baris di bawah`}</button>`).join('')}</div><div class="tile-grid">${s.tiles.map((line,i)=>`<button class="word-tile" data-tile="${i}" ${s.slots.includes(line)?'disabled':''}>${escapeHTML(line)}</button>`).join('')}</div><div class="game-footer"><button class="btn btn-outline" id="resetArrange">Ulangi pilihan</button><button class="btn btn-primary" id="checkArrange" ${s.slots.some(x=>!x)?'disabled':''}>Periksa urutan →</button></div><div id="arrangeFeedback"></div></div>`;
  $$('.word-tile').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.tile),slot=s.slots.findIndex(x=>!x);if(slot<0)return;s.slots[slot]=s.tiles[i];renderArrange();}));
  $$('.arrange-slot').forEach(b=>b.addEventListener('click',()=>{s.slots[Number(b.dataset.slot)]=null;renderArrange();}));
  $('#resetArrange').addEventListener('click',()=>{s.slots=[null,null,null,null];renderArrange();});
  $('#checkArrange').addEventListener('click',checkArrange);
}
async function checkArrange(){const s=arrangeSession,good=s.slots.every((x,i)=>x===s.correct[i]);const score=good?100:Math.round(s.slots.filter((x,i)=>x===s.correct[i]).length/4*100);$('#arrangeFeedback').innerHTML=`<div class="feedback-box ${good?'good':'bad'}">${good?'Urutannya tepat!':'Belum tepat. Coba perhatikan alur sampiran menuju isi.'}</div><div class="game-footer"><span class="muted-note">Urutan contoh bisa jadi salah satu cara menyusun pantun.</span><button class="btn btn-primary" id="arrangeFinish">Selesai</button></div>`;$('#arrangeFinish').addEventListener('click',async()=>{await logActivity('Game susun pantun','game',score,good?15:8);renderArrangeIntro();showToast('Latihan tersimpan.');});}
let matchSession=null;
function renderMatchIntro(){ $('#gameArea').innerHTML=`<div class="game-shell"><div class="eyebrow">COCOKKAN PASANGAN</div><h3>Hubungkan istilah dan maknanya.</h3><p class="muted-note">Pilih satu istilah di kiri dan satu penjelasan di kanan. Pasangan yang sesuai akan terkunci.</p><div class="game-footer"><span class="muted-note">25 pasangan istilah · 10 per sesi</span><button class="btn btn-primary" id="startMatch">Mulai cocokkan →</button></div></div>`;$('#startMatch').addEventListener('click',startMatch);}
function startMatch(){const pairs=[...matchPairs].sort(()=>Math.random()-.5).slice(0,10);matchSession={pairs,left:pairs.map(p=>p[0]),right:pairs.map(p=>p[1]).sort(()=>Math.random()-.5),selected:null,matched:[],wrong:0};renderMatch();}
function renderMatch(){const s=matchSession;$('#gameArea').innerHTML=`<div class="game-shell"><div class="game-heading"><div><div class="eyebrow">COCOKKAN PASANGAN</div><h3>Temukan pasangannya</h3></div><span class="tag-soft">${s.matched.length}/${s.pairs.length}</span></div><div class="match-grid"><div>${s.left.map((v,i)=>`<button class="match-card ${s.selected?.side==='left'&&s.selected.index===i?'selected':''} ${s.matched.includes(v)?'matched':''}" data-side="left" data-index="${i}" ${s.matched.includes(v)?'disabled':''}>${escapeHTML(v)}</button>`).join('')}</div><div>${s.right.map((v,i)=>`<button class="match-card ${s.selected?.side==='right'&&s.selected.index===i?'selected':''} ${s.matched.includes(s.pairs.find(p=>p[1]===v)?.[0])?'matched':''}" data-side="right" data-index="${i}" ${s.matched.includes(s.pairs.find(p=>p[1]===v)?.[0])?'disabled':''}>${escapeHTML(v)}</button>`).join('')}</div></div><div id="matchFeedback" class="muted-note" style="margin-top:12px">Pilih istilah, lalu pilih artinya.</div></div>`;
  $$('.match-card').forEach(b=>b.addEventListener('click',()=>selectMatch(b.dataset.side,Number(b.dataset.index))));
}
function selectMatch(side,index){const s=matchSession;if(!s)return;const value=side==='left'?s.left[index]:s.right[index];if(side==='left'&&s.matched.includes(value))return;if(side==='right'&&s.matched.includes(s.pairs.find(p=>p[1]===value)?.[0]))return;if(!s.selected){s.selected={side,index,value};renderMatch();return;}if(s.selected.side===side){s.selected={side,index,value};renderMatch();return;}const left=side==='left'?value:s.selected.value;const right=side==='right'?value:s.selected.value;const pair=s.pairs.find(p=>p[0]===left);if(pair&&pair[1]===right){s.matched.push(left);s.selected=null;renderMatch();if(s.matched.length===s.pairs.length)finishMatch();}else{s.wrong++;s.selected=null;renderMatch();$('#matchFeedback').textContent='Belum cocok. Coba baca kembali penjelasannya.';}}
async function finishMatch(){await logActivity('Game cocokkan istilah budaya','game',100,15);$('#gameArea').insertAdjacentHTML('beforeend',`<div class="feedback-box good">Semua pasangan berhasil ditemukan. +15 XP</div><button class="btn btn-primary" id="matchAgain">Main lagi</button>`);$('#matchAgain').addEventListener('click',renderMatchIntro);}
let storySession=null;
function renderStoryIntro(){ $('#gameArea').innerHTML=`<div class="game-shell"><div class="eyebrow">TEBAK CERITA</div><h3>Jaga kesinambungan cerita.</h3><p class="muted-note">Pilih respons yang paling nyambung dengan situasi sebelumnya.</p><div class="game-footer"><span class="muted-note">20 skenario · 10 per sesi</span><button class="btn btn-primary" id="startStory">Mulai cerita →</button></div></div>`;$('#startStory').addEventListener('click',startStory);}
function startStory(){storySession={items:[...storyChallenges].sort(()=>Math.random()-.5).slice(0,10),index:0,correct:0};renderStoryQuestion();}
function renderStoryQuestion(){const s=storySession,q=s.items[s.index];$('#gameArea').innerHTML=`<div class="game-shell"><div class="game-heading"><div><div class="eyebrow">TEBAK CERITA</div><h3>Pilih kelanjutan yang sesuai</h3></div><span class="question-count">${s.index+1}/${s.items.length}</span></div><div class="question-text">${escapeHTML(q.q)}</div><div class="story-options">${q.o.map((v,i)=>`<button data-choice="${i}">${escapeHTML(v)}</button>`).join('')}</div><div id="storyFeedback"></div></div>`;$$('[data-choice]').forEach(b=>b.addEventListener('click',()=>{const good=Number(b.dataset.choice)===q.a;if(good)s.correct++;$$('[data-choice]').forEach(x=>x.disabled=true);$('#storyFeedback').innerHTML=`<div class="feedback-box ${good?'good':'bad'}">${good?'Tepat.':'Coba lagi pada tantangan berikutnya.'} ${escapeHTML(q.e)}</div><div class="game-footer"><span></span><button class="btn btn-primary" id="storyNext">${s.index===s.items.length-1?'Selesai':'Lanjut →'}</button></div>`;$('#storyNext').addEventListener('click',()=>{s.index++;if(s.index<s.items.length)renderStoryQuestion();else finishStory();},{once:true});}));}
async function finishStory(){const s=storySession,score=Math.round(s.correct/s.items.length*100);await logActivity('Game tebak kesinambungan cerita','game',score,10+s.correct*2);$('#gameArea').innerHTML=`<div class="game-shell"><div class="eyebrow">CERITA SELESAI</div><h3>${s.correct}/${s.items.length} jawaban tepat</h3><p class="muted-note">Berlatih menjaga konteks membuat respons pantun dan cerita lebih terhubung.</p><button class="btn btn-primary" id="storyAgain">Ulangi tantangan</button></div>`;$('#storyAgain').addEventListener('click',renderStoryIntro);}
let rhymeSession=null;
function renderRhymeIntro(){ $('#gameArea').innerHTML=`<div class="game-shell"><div class="eyebrow">DETEKTIF RIMA</div><h3>Cari bunyi akhir yang selaras.</h3><p class="muted-note">Pilih kata yang bunyi akhirnya paling mendekati kata contoh. Ini latihan pengenalan bunyi, bukan pemeriksa rima otomatis untuk seluruh pantun.</p><div class="game-footer"><span class="muted-note">25 tantangan · 10 per sesi</span><button class="btn btn-primary" id="startRhyme">Mulai deteksi →</button></div></div>`;$('#startRhyme').addEventListener('click',startRhyme);}
function startRhyme(){rhymeSession={items:[...rhymeChallenges].sort(()=>Math.random()-.5).slice(0,10),index:0,correct:0};renderRhymeQuestion();}
function renderRhymeQuestion(){const s=rhymeSession,q=s.items[s.index];$('#gameArea').innerHTML=`<div class="game-shell"><div class="game-heading"><div><div class="eyebrow">DETEKTIF RIMA</div><h3>Temukan pasangan bunyi</h3></div><span class="question-count">${s.index+1}/${s.items.length}</span></div><div class="rhyme-card">Kata pertama: <b>${q.a}</b><br>Pasangan bunyi yang paling mendekati:</div><div class="story-options">${q.options.map((v,i)=>`<button data-rhyme="${i}">${escapeHTML(v)}</button>`).join('')}</div><div id="rhymeFeedback"></div></div>`;$$('[data-rhyme]').forEach(b=>b.addEventListener('click',()=>{const good=Number(b.dataset.rhyme)===q.answer;if(good)s.correct++;$$('[data-rhyme]').forEach(x=>x.disabled=true);$('#rhymeFeedback').innerHTML=`<div class="feedback-box ${good?'good':'bad'}">${good?'Bunyi akhirnya sesuai untuk latihan ini.':'Belum sesuai. Perhatikan kemiripan bunyi akhir.'}</div><div class="game-footer"><span></span><button class="btn btn-primary" id="rhymeNext">${s.index===s.items.length-1?'Selesai':'Lanjut →'}</button></div>`;$('#rhymeNext').addEventListener('click',()=>{s.index++;if(s.index<s.items.length)renderRhymeQuestion();else finishRhyme();},{once:true});}));}
async function finishRhyme(){const s=rhymeSession,score=Math.round(s.correct/s.items.length*100);await logActivity('Game detektif rima','game',score,10+s.correct*2);$('#gameArea').innerHTML=`<div class="game-shell"><div class="eyebrow">DETEKTIF SELESAI</div><h3>${s.correct}/${s.items.length} bunyi berhasil dipasangkan.</h3><p class="muted-note">Rima juga perlu didengar dan dipertimbangkan bersama kejelasan isi.</p><button class="btn btn-primary" id="rhymeAgain">Main lagi</button></div>`;$('#rhymeAgain').addEventListener('click',renderRhymeIntro);}

// STUDIO AND STAGE
function getCreatorLines(){return $$('#editorStanzas .editor-line input').map(input=>input.value.trim());}
function analyzeLines(lines){const checks=[];const validCount=lines.length>=4&&lines.length<=12&&lines.length%4===0;checks.push({ok:validCount,text:validCount?`${lines.length/4} bait dengan empat baris per bait.`:'Jumlah baris harus 4, 8, atau 12 (satu sampai tiga bait).'});if(!validCount)return checks;for(let start=0;start<lines.length;start+=4){const group=lines.slice(start,start+4),n=start/4+1,complete=group.every(Boolean);checks.push({ok:complete,text:complete?`Semua baris pada bait ${n} sudah terisi.`:`Lengkapi semua baris pada bait ${n}.`});if(complete){const a=ending(group[0])===ending(group[2])&&!!ending(group[0]);const b=ending(group[1])===ending(group[3])&&!!ending(group[1]);checks.push({ok:a,text:`Bait ${n} · rima baris 1 dan 3: ${a?'akhir kata tampak serupa.':'akhir kata belum terlihat serupa.'}`});checks.push({ok:b,text:`Bait ${n} · rima baris 2 dan 4: ${b?'akhir kata tampak serupa.':'akhir kata belum terlihat serupa.'}`});}}return checks;}
function addStanza(){if(stanzaCount>=3){showToast('Studio mendukung maksimal tiga bait dalam satu karya.');return;}stanzaCount++;const start=(stanzaCount-1)*4+1;const labels=['SAMPIRAN','SAMPIRAN','ISI','ISI'];const placeholders=['Tulis sampiran pertama...','Tulis sampiran kedua...','Lanjutkan cerita...','Tutup bait ini...'];const markup=`<div class="stanza-editor" data-stanza="${stanzaCount}"><div class="stanza-heading">BAIT ${stanzaCount} <span>${String(start).padStart(2,'0')}–${String(start+3).padStart(2,'0')}</span><button type="button" class="small-link remove-stanza">Hapus bait</button></div>${labels.map((label,i)=>`<label class="editor-line"><span>${String(start+i).padStart(2,'0')} <small>${label}</small></span><input id="creator${start+i}" maxlength="150" placeholder="${placeholders[i]}" /></label>`).join('')}</div>`;$('#editorStanzas').insertAdjacentHTML('beforeend',markup);updateStanzaCount();}
function removeLastStanza(){if(stanzaCount<=1)return;$('#editorStanzas .stanza-editor:last-child').remove();stanzaCount--;updateStanzaCount();}
function updateStanzaCount(){$('#stanzaCount').textContent=`${stanzaCount} dari 3 bait · ${stanzaCount*4} baris`;$$('.remove-stanza').forEach(b=>b.remove());if(stanzaCount>1){const heading=$('#editorStanzas .stanza-editor:last-child .stanza-heading');heading.insertAdjacentHTML('beforeend','<button type=\"button\" class=\"small-link remove-stanza\">Hapus bait terakhir</button>');$('.remove-stanza',heading).addEventListener('click',removeLastStanza);}}
function creatorAnalyze(){const lines=getCreatorLines(),checks=analyzeLines(lines);$('#creatorFeedback').innerHTML=checks.map(c=>`<div class="feedback-item ${c.ok?'':'warn'}">${c.ok?'✓':'•'} ${escapeHTML(c.text)}</div>`).join('')+`<div class="muted-note" style="margin-top:8px">Pemeriksaan bunyi ini sederhana dan belum menggantikan penilaian manusia atau penelaahan praktisi.</div>`;}
async function savePantun(){const lines=getCreatorLines();if(lines.length%4!==0||lines.length<4||lines.some(x=>!x)){showToast('Lengkapi semua baris pada setiap bait sebelum menyimpan.');return;}try{const payload={title:$('#pantunTitle').value.trim()||'Pantun karyaku',lines};await api('/api/pantuns',{method:'POST',body:JSON.stringify(payload)});appState=await api('/api/state');renderDashboard();renderPassport();$('#creatorFeedback').innerHTML='<div class="feedback-item">✓ Pantun tersimpan pada perangkat ini.</div>';showToast('Pantun berhasil disimpan.');}catch(err){showToast(err.message);}}
function stageCheck(){const lines=[1,2,3,4].map(i=>$(`#stageLine${i}`).value.trim());if(lines.some(x=>!x)){showToast('Isi empat baris balasan terlebih dahulu.');return;}const checks=analyzeLines(lines);const filled=checks[0].ok;const score=Math.round(checks.filter(c=>c.ok).length/checks.length*100);$('#stageResult').classList.remove('hidden');$('#stageResult').innerHTML=`<b>Hasil pemeriksaan awal: ${score}/100</b><ul>${checks.map(c=>`<li>${escapeHTML(c.text)}</li>`).join('')}</ul><p class="muted-note" style="margin:9px 0 0">Pemeriksaan ini hanya melihat empat baris dan kemiripan dua huruf terakhir kata; belum menilai spontanitas, makna, pelantunan, atau mutu tradisi.</p><button class="btn btn-primary" id="saveStage" style="margin-top:10px">Simpan latihan (+10 XP)</button>`;$('#saveStage').addEventListener('click',async()=>{await logActivity('Latihan panggung pantun','game',score,10);showToast('Latihan panggung tersimpan.');});}

// NADI KIT
function renderCompetency(){if(!appState)return;const scores=appState.competencies||{};$('#competencyFields').innerHTML=competenciesKeys.map(key=>`<div class="competency-row"><div class="competency-label"><b>${competencyMeta[key].label}</b><span id="score-${key}">${scores[key]||0}/4</span></div><div class="competency-buttons">${[0,1,2,3,4].map(v=>`<button data-key="${key}" data-score="${v}" class="${Number(scores[key]||0)===v?'selected':''}" aria-label="${competencyMeta[key].label}: ${v}">${v}</button>`).join('')}</div></div>`).join('');
  $$('.competency-buttons button').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.key;appState.competencies[key]=Number(b.dataset.score);$$(`.competency-buttons button[data-key="${key}"]`).forEach(x=>x.classList.toggle('selected',x===b));$(`#score-${key}`).textContent=`${b.dataset.score}/4`;renderCompetencySummary();}));renderCompetencySummary();}
function renderCompetencySummary(){if(!appState)return;const scores=appState.competencies||{};const ordered=competenciesKeys.map(k=>({key:k,score:Number(scores[k]||0)})).sort((a,b)=>a.score-b.score);const low=ordered[0];$('#competencySummary').innerHTML=`<div class="priority-item"><b>${competencyMeta[low.key].short}</b><small>Prioritas latihan saat ini · ${low.score}/4</small><p style="font-size:.68rem;margin:6px 0 0">${competencyMeta[low.key].hint}</p></div><div class="priority-item"><b>Kekuatan berikutnya</b><small>${competencyMeta[ordered[ordered.length-1].key].short} · ${ordered[ordered.length-1].score}/4</small></div><p style="font-size:.63rem;margin-top:12px">Berdasarkan penilaian diri; perlu dikonfirmasi melalui observasi dan praktisi.</p>`;}
async function saveCompetencies(){try{const scores={};competenciesKeys.forEach(k=>scores[k]=Number(appState.competencies[k]||0));appState=await api('/api/competencies',{method:'PUT',body:JSON.stringify({scores})});renderCompetency();renderPath();showToast('Peta kompetensi disimpan.');}catch(err){showToast(err.message);}}
function renderPath(){if(!appState)return;const scores=appState.competencies||{};const ordered=competenciesKeys.map(k=>({key:k,score:Number(scores[k]||0)})).sort((a,b)=>a.score-b.score);const lowest=ordered[0], second=ordered[1];$('#pathTitle').textContent=lowest.score>=3?'Perluas pengalaman praktik':`Fokus: ${competencyMeta[lowest.key].short}`;$('#pathDesc').textContent=lowest.score>=3?'Peta mandirimu sudah cukup kuat. Pilih tantangan yang lebih kompleks dan minta masukan praktisi.':competencyMeta[lowest.key].hint;$('#matchingText').textContent=`Area dengan penilaian diri terendah adalah ${competencyMeta[lowest.key].short} (${lowest.score}/4), diikuti ${competencyMeta[second.key].short} (${second.score}/4). Prioritas disusun dari isianmu, bukan diagnosis otomatis.`;const sequence=[lowest,second,...ordered.slice(2,4)];$('#pathSteps').innerHTML=sequence.map((x,i)=>`<div class="path-step"><span>${i+1}</span><div><b>${competencyMeta[x.key].short}</b><small>${competencyMeta[x.key].hint}</small></div></div>`).join('');}
function renderPassport(){if(!appState)return;const s=appState;$('#passportName').textContent=s.profile?.name||'Penjelajah Budaya';$('#passportLevel').textContent=`TINGKAT ${s.level||1}`;$('#passportXp').textContent=`${s.xp||0} XP`;
  $('#passportActivities').textContent=s.stats?.activities||0;$('#passportPantuns').textContent=s.saved_pantuns?.length||0;$('#passportGames').textContent=s.stats?.games_finished||0;$('#passportPerformances').textContent=s.performances?.length||0;
  const badges=[];if((s.stats?.activities||0)>=1)badges.push('🏵 Penjelajah Awal');if((s.saved_pantuns?.length||0)>=1)badges.push('✎ Perangkai Kata');if((s.stats?.quiz_correct||0)>=10)badges.push('📚 Penjaga Cerita');if((s.stats?.games_finished||0)>=5)badges.push('✣ Sahabat Latihan');$('#passportBadges').innerHTML=badges.length?badges.map(b=>`<span class="badge-lock">${b}</span>`).join(''):'<span class="badge-lock">🔒 Penjelajah Awal</span><span class="badge-lock">🔒 Perangkai Kata</span><span class="badge-lock">🔒 Penjaga Cerita</span>';
  $('#passportCompetencies').innerHTML=competenciesKeys.map(k=>{const v=Number(s.competencies?.[k]||0);return `<div class="skill-progress"><div><span>${competencyMeta[k].short}</span><b>${v}/4</b></div><div class="skill-bar"><span style="width:${v*25}%"></span></div></div>`;}).join('');
  $('#activityHistory').innerHTML=(s.history||[]).slice(0,8).map(item=>`<div class="history-item"><span class="history-icon">${item.kind==='quiz'?'?':item.kind==='performance'?'▶':'✦'}</span><div><b>${escapeHTML(item.title)}</b><small>${escapeHTML(formatDate(item.at))} · ${item.kind==='performance'?'Dokumentasi penampilan':`Skor ${item.score??0}`}</small></div><span class="history-xp">+${item.xp||0} XP</span></div>`).join('')||'<div class="empty-state">Belum ada aktivitas. Coba satu latihan untuk memulai.</div>';
  $('#savedPantunsList').innerHTML=(s.saved_pantuns||[]).map(item=>`<div class="saved-pantun-item"><b>${escapeHTML(item.title)}</b><p>${(item.lines||[]).map((line,i)=>escapeHTML(line)+(i%4===3&&i<item.lines.length-1?'<br><br>':'<br>')).join('')}</p></div>`).join('')||'<div class="empty-state">Belum ada pantun tersimpan. Karya dari Studio Pantun akan muncul di sini.</div>';
  $('#pantunListCount').textContent=`${s.saved_pantuns?.length||0} KARYA`;
  $('#reviewHistory').innerHTML=(s.practitioner_notes||[]).slice(0,5).map(x=>`<p><b>${escapeHTML(x.area)}</b> · ${escapeHTML(formatDate(x.at))}<br>${escapeHTML(x.note)}</p>`).join('');
  renderPerformancePassport(s.performances||[]);
}
function renderPerformancePassport(items){
  const count=$('#performanceCount'),list=$('#performancesList');
  if(!count||!list)return;
  count.textContent=`${items.length} REKAMAN`;
  if(!items.length){list.innerHTML='<div class="empty-state">Belum ada rekaman panggung. Selesai merekam? Pilih “Simpan ke Paspor Budaya” agar penampilanmu tercatat di sini.</div>';return;}
  list.innerHTML=items.slice(0,30).map(item=>{
    const url=`/api/performances/${encodeURIComponent(item.id)}/video`;
    const duration=Math.max(0,Number(item.duration_seconds)||0);
    const guide=Number(item.guide_step_reached)||0;
    const modeLabel=({stage:'Panggung',filter:'Filter wajah',dance:'Belajar gerak'}[item.mode]||'Panggung');
    return `<article class="performance-entry" data-performance-id="${escapeHTML(item.id)}">
      <div class="performance-entry-head"><div><b>${escapeHTML(item.title||'Penampilan Panggung Betawi')}</b><small>${escapeHTML(formatDate(item.at))} · ${duration} detik</small></div><span class="tag-soft">LOKAL</span></div>
      <video class="performance-passport-video" controls preload="none" playsinline src="${url}" aria-label="Video ${escapeHTML(item.title||'penampilan panggung')}"></video>
      <div class="performance-entry-meta"><span>${escapeHTML(item.filter_label||'Tanpa aksesori')}</span><span>${modeLabel} · panduan ${guide}/5</span><span>${Number(item.faces_detected)||0} wajah · efek ${item.effect_mode==='mix'?'bervariasi':'seragam'}</span><span>Cuplikan mulai ${formatClipTime(Number(item.clip_start_seconds)||0)}</span><span>${(Number(item.size_bytes||0)/1024/1024).toFixed(1)} MB</span></div>
      <div class="performance-entry-actions"><a class="small-link" href="${url}" download="nadi-panggung-${escapeHTML(item.id.slice(0,8))}.${item.mime_type==='video/mp4'?'mp4':'webm'}">Unduh video ↓</a><button class="small-link danger-link" type="button" data-delete-performance="${escapeHTML(item.id)}">Hapus rekaman</button></div>
    </article>`;
  }).join('');
  $$('[data-delete-performance]').forEach(button=>button.addEventListener('click',()=>deletePerformance(button.dataset.deletePerformance)));
}
async function deletePerformance(id){
  if(!id)return;
  if(!window.confirm('Hapus rekaman ini dari Paspor Budaya dan penyimpanan lokal aplikasi? Tindakan ini tidak dapat dibatalkan.'))return;
  try{await api(`/api/performances/${encodeURIComponent(id)}`,{method:'DELETE'});appState=await api('/api/state');renderPassport();showToast('Rekaman dihapus dari Paspor Budaya.');}
  catch(err){showToast(err.message);}
}
function formatDate(value){try{return new Date(value).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});}catch{return value||'';}}

// CAMERA: Panggung Betawi — facial accessories, pose guide, local 30s recording.
const danceGuide = [
  {start:0,end:5,title:'Posisi awal',description:'Berdiri nyaman dan arahkan tubuh ke kamera. Pastikan bahu serta tangan terlihat sebelum meniru gerakan.',visual:'🧍',voice:'Posisi awal. Berdiri nyaman dan arahkan tubuh ke kamera.'},
  {start:5,end:11,title:'Rentangkan kedua tangan',description:'Rentangkan kedua tangan mendekati tinggi bahu secara perlahan. Cocokkan arah gerak dengan contoh pada video.',visual:'🙆',voice:'Rentangkan kedua tangan mendekati tinggi bahu secara perlahan.'},
  {start:11,end:17,title:'Angkat tangan kanan',description:'Angkat tangan kanan ke atas secara perlahan, sementara tangan kiri tetap nyaman. Perhatikan contoh gerakan di video.',visual:'🙋',voice:'Angkat tangan kanan ke atas secara perlahan.'},
  {start:17,end:23,title:'Angkat tangan kiri',description:'Angkat tangan kiri ke atas secara perlahan, sementara tangan kanan tetap nyaman. Sesuaikan dengan irama pada video.',visual:'🙋‍♀️',voice:'Angkat tangan kiri ke atas secara perlahan.'},
  {start:23,end:30,title:'Kembali ke posisi nyaman',description:'Turunkan kedua tangan perlahan dan kembali ke posisi awal. Putar ulang cuplikan jika ingin mencoba lagi.',visual:'🧍',voice:'Turunkan kedua tangan perlahan dan kembali ke posisi nyaman.'}
];
const stageSleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
function formatClipTime(seconds){
  const value=Math.max(0,Math.floor(Number(seconds)||0));
  return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
}
function updateClipRangePreview(){
  const input=$('#danceClipStart');
  if(!input)return;
  const raw=Number.parseInt(input.value,10);
  const start=Number.isFinite(raw)?Math.max(0,Math.min(142,raw)):0;
  $('#danceClipRange').textContent=`${formatClipTime(start)}–${formatClipTime(start+30)}`;
}
function applyDanceClip(){
  const input=$('#danceClipStart');
  if(!input)return;
  const raw=Number.parseInt(input.value,10);
  danceClipStartSeconds=Number.isFinite(raw)?Math.max(0,Math.min(142,raw)):0;
  input.value=String(danceClipStartSeconds);
  const end=danceClipStartSeconds+30;
  const frame=$('#danceTutorialFrame');
  frame.src=`https://www.youtube-nocookie.com/embed/jKrG4fNhKVI?rel=0&modestbranding=1&start=${danceClipStartSeconds}&end=${end}`;
  updateClipRangePreview();
  renderDanceStep(false);
  showToast(`Cuplikan 30 detik dipilih: ${formatClipTime(danceClipStartSeconds)}–${formatClipTime(end)}.`);
}
function renderDanceStep(announce=false){
  const step=danceGuide[danceStepIndex];
  if(stageRecordingContext && stageMediaRecorder?.state==='recording') stageRecordingContext.guide_step_reached=Math.max(Number(stageRecordingContext.guide_step_reached)||0,danceStepIndex+1);
  $('#danceStepCounter').textContent=`${String(danceStepIndex+1).padStart(2,'0')} / 05`;
  $('#danceStepTime').textContent=`VIDEO ${formatClipTime(danceClipStartSeconds+step.start)}–${formatClipTime(danceClipStartSeconds+step.end)} · CUPLIKAN ${formatClipTime(step.start)}–${formatClipTime(step.end)}`;
  $('#danceStepVisual').textContent=step.visual;
  $('#danceStepTitle').textContent=step.title;
  $('#danceStepDescription').textContent=step.description;
  $$('#danceStepProgress i').forEach((item,index)=>item.classList.toggle('active',index<=danceStepIndex));
  $('#danceStepPrev').disabled=danceStepIndex===0;
  $('#danceStepNext').textContent=danceStepIndex===danceGuide.length-1?'Ulangi urutan ↻':'Berikutnya →';
  if(browserCameraActive && window.NadiBrowserCamera){
    window.NadiBrowserCamera.setStep(danceStepIndex);
    const cameraMode=$('#cameraModeSelect').value;
    $('#danceFeedback').textContent=cameraMode==='filter'?'Mode filter wajah aktif. Pilih Panggung atau Belajar Gerak untuk panduan posisi tubuh.':'Ikuti video referensi. Pelacakan pose memberi umpan balik perkiraan, bukan penilaian tari autentik.';
  } else if($('#cameraStop') && !$('#cameraStop').disabled){
    api('/api/camera/dance-step',{method:'POST',body:JSON.stringify({step:danceStepIndex})})
      .then(s=>{if(s.mode==='filter'&&s.filter_name!=='selendang')$('#danceFeedback').textContent='Mode filter hanya melacak wajah. Pilih mode Belajar Gerak atau Panggung untuk mengaktifkan pelacakan tubuh.';else if(s.dance_feedback)$('#danceFeedback').textContent=s.dance_feedback;})
      .catch(()=>{});
  } else {
    $('#danceFeedback').textContent='Nyalakan kamera dalam mode belajar gerak atau panggung untuk melihat umpan balik posisi.';
  }
  if(announce && appState?.settings?.voice_game && typeof speakText==='function') speakText(step.voice,'Membacakan instruksi gerak…');
}
function updateAccessorySelection(filterName){
  const select=$('#cameraFilterSelect');
  if(select)select.value=filterName;
  $$('[data-camera-filter]').forEach(button=>{
    const selected=button.dataset.cameraFilter===filterName;
    button.classList.toggle('selected',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
}
async function chooseCameraFilter(filterName){
  const select=$('#cameraFilterSelect');
  if(!select || ![...select.options].some(option=>option.value===filterName))return;
  if(stageMediaRecorder&&stageMediaRecorder.state==='recording'){
    showToast('Hentikan rekaman sebelum mengganti aksesori agar hasil video tetap konsisten.');
    return;
  }
  updateAccessorySelection(filterName);
  if(browserCameraActive && window.NadiBrowserCamera){
    window.NadiBrowserCamera.setFilter(filterName,$('#cameraGroupMode')?.value||'same');
    $('#cameraMessage').textContent=`Aksesori aktif: ${filterName.replaceAll('_',' ')}.`;
    showToast('Aksesori kamera diperbarui.');
  } else if($('#cameraStop')&&!$('#cameraStop').disabled){
    try{
      const result=await api('/api/camera/filter',{method:'POST',body:JSON.stringify({filter_name:filterName,effect_mode:$('#cameraGroupMode')?.value||'same'})});
      $('#cameraMessage').textContent=`Aksesori aktif: ${result.filter_name.replaceAll('_',' ')}.`;
      showToast('Aksesori kamera diperbarui.');
    }catch(err){showToast(err.message);}
  }
}


async function toggleCameraFullscreen(){
  const screen=$('#cameraScreen');
  if(!screen)return;
  try{
    if(document.fullscreenElement){await document.exitFullscreen();}
    else if(screen.requestFullscreen){await screen.requestFullscreen();}
  }catch(err){showToast('Mode layar penuh tidak tersedia di browser ini.');}
}

async function startCamera(){
  const button=$('#cameraStart');button.disabled=true;$('#cameraMessage').textContent='Menghubungkan ke kamera…';
  const mode=$('#cameraModeSelect').value;
  const filterName=$('#cameraFilterSelect').value;
  const effectMode=$('#cameraGroupMode')?.value||'same';
  try{
    if(runtimeHealth?.camera_backend==='browser'){
      if(!window.NadiBrowserCamera)throw new Error('Modul kamera browser belum dimuat. Muat ulang halaman.');
      const video=$('#browserCameraVideo'),canvas=$('#browserCameraCanvas');
      const status=await window.NadiBrowserCamera.start({
        video,canvas,mode,filterName,effectMode,
        onStatus:s=>{
          cameraFaceCount=Number(s.face_count)||0;
          $('#cameraFaceStatus').textContent=s.face_count?'Terdeteksi':'Belum terdeteksi';
          $('#cameraFaceCount').textContent=`${cameraFaceCount} / ${s.max_faces||4}`;
          $('#cameraPoseStatus').textContent=s.pose_detected?'Terdeteksi':(mode==='filter'?'Mode filter saja':'Belum terdeteksi');
          if(s.dance_feedback)$('#danceFeedback').textContent=s.dance_feedback;
          if(s.error)$('#cameraMessage').textContent=s.error;
        }
      });
      browserCameraActive=true;
      canvas.classList.remove('hidden');
      $('#cameraStream').classList.add('hidden');
      $('.camera-placeholder').classList.add('hidden');
      $('#cameraStart').disabled=true;$('#cameraStop').disabled=false;$('#stageRecordStart').disabled=false;
      $('#cameraStatus').classList.add('live');$('#cameraStatus').innerHTML='<i></i> Kamera aktif di perangkat ini';
      $('#cameraMessage').textContent=status.error||'Kamera dan pelacakan berjalan langsung di browser. Maksimal empat wajah.';
      $('#danceFeedback').textContent=status.dance_feedback||'Kamera siap. Ikuti arahan latihan secara bertahap.';
      document.body.dataset.cameraBackend='browser';
      renderDanceStep(false);
      showToast('Kamera perangkat berhasil dinyalakan.');
      return;
    }
    const s=await api('/api/camera/start',{method:'POST',body:JSON.stringify({mode,filter_name:filterName,effect_mode:effectMode})});
    if(s.running){
      $('#cameraStream').src='/api/camera/stream?t='+Date.now();
      $('#cameraStream').classList.remove('hidden');$('.camera-placeholder').classList.add('hidden');
      $('#cameraStart').disabled=true;$('#cameraStop').disabled=false;$('#stageRecordStart').disabled=false;
      $('#cameraStatus').classList.add('live');$('#cameraStatus').innerHTML='<i></i> Kamera aktif';
      $('#cameraMessage').textContent=s.gesture_available?`Pelacakan lokal siap. Maksimal ${s.max_faces||4} wajah dapat diberi efek.`:'Preview aktif, tetapi MediaPipe belum tersedia.';
      $('#danceFeedback').textContent=s.gesture_available?'Arahkan tubuh ke kamera. Umpan balik gerak bersifat perkiraan.':(s.error||'Pelacakan belum aktif.');
      showToast('Kamera Panggung Betawi berhasil dinyalakan.');startCameraPolling();
    }else{
      button.disabled=false;$('#cameraMessage').textContent=s.error||'Kamera tidak dapat dinyalakan.';showToast(s.error||'Kamera tidak dapat dinyalakan.');
    }
  }catch(err){button.disabled=false;$('#cameraMessage').textContent=err.message;showToast(err.message);}
}
async function stopCamera(){
  cancelStageCountdown();
  if(stageMediaRecorder&&stageMediaRecorder.state==='recording')stopStageRecording();
  try{
    if(browserCameraActive && window.NadiBrowserCamera){await window.NadiBrowserCamera.stop();}
    else await api('/api/camera/stop',{method:'POST',body:'{}'});
  }catch(err){showToast(err.message);}
  finally{
    browserCameraActive=false;
    stopCameraPolling();
    $('#cameraStream').src='';$('#cameraStream').classList.add('hidden');
    $('#browserCameraCanvas')?.classList.add('hidden');
    $('.camera-placeholder').classList.remove('hidden');
    $('#cameraStart').disabled=false;$('#cameraStop').disabled=true;$('#stageRecordStart').disabled=true;
    $('#cameraStatus').classList.remove('live');$('#cameraStatus').innerHTML='<i></i> Kamera mati';
    $('#cameraMessage').textContent='Kamera sudah dimatikan.';$('#cameraFaceStatus').textContent='Belum terdeteksi';$('#cameraFaceCount').textContent='0 / 4';$('#cameraPoseStatus').textContent='Belum terdeteksi';
    cameraFaceCount=0;
  }
}
async function pollCamera(){
  if(browserCameraActive)return;
  try{
    const s=await api('/api/camera/status');
    if(!s.running&&$('#cameraStop')&&!$('#cameraStop').disabled){
      $('#cameraStatus').classList.remove('live');$('#cameraStatus').innerHTML='<i></i> Kamera terputus';
      $('#cameraStart').disabled=false;$('#cameraStop').disabled=true;$('#stageRecordStart').disabled=true;
      $('#cameraMessage').textContent=s.error||'Kamera berhenti.';$('#cameraStream').classList.add('hidden');$('.camera-placeholder').classList.remove('hidden');
    }
    cameraFaceCount=Number(s.face_count)||0;
    $('#cameraFaceStatus').textContent=s.face_detected?'Terdeteksi':'Belum terdeteksi';
    $('#cameraFaceCount').textContent=`${cameraFaceCount} / ${s.max_faces||4}`;
    $('#cameraPoseStatus').textContent=(s.mode==='filter'&&s.filter_name!=='selendang')?'Mode filter saja':(s.pose_detected?'Terdeteksi':'Belum terdeteksi');
    if(s.mode==='filter'&&s.filter_name!=='selendang')$('#danceFeedback').textContent='Mode filter hanya melacak wajah. Pilih mode Belajar Gerak atau Panggung untuk mengaktifkan pelacakan tubuh.';else if(s.dance_feedback)$('#danceFeedback').textContent=s.dance_feedback;
    if(s.error)$('#cameraMessage').textContent=s.error;
  }catch{}
}
function startCameraPolling(){stopCameraPolling();if(runtimeHealth?.camera_backend==='browser')return;cameraPoll=setInterval(pollCamera,900);pollCamera();}
function stopCameraPolling(){if(cameraPoll){clearInterval(cameraPoll);cameraPoll=null;}}
function cancelStageCountdown(){stageCountdownToken++;$('#stageCountdown').classList.add('hidden');}
async function runStageCountdown(){
  const token=++stageCountdownToken;
  $('#stageCountdown').classList.remove('hidden');
  for(const n of [3,2,1]){
    if(token!==stageCountdownToken)return false;
    $('#stageCountdown').textContent=String(n);await stageSleep(750);
  }
  if(token!==stageCountdownToken)return false;
  $('#stageCountdown').textContent='MULAI';await stageSleep(320);
  $('#stageCountdown').classList.add('hidden');return token===stageCountdownToken;
}
function drawStageCanvas(){
  const canvas=$('#cameraRecordCanvas'),ctx=canvas.getContext('2d');
  const source=browserCameraActive?$('#browserCameraCanvas'):$('#cameraStream');
  const ready=browserCameraActive?(source&&source.width>0&&source.height>0):(source&&source.complete&&source.naturalWidth>0);
  if(ready){
    const width=browserCameraActive?source.width:source.naturalWidth;
    const height=browserCameraActive?source.height:source.naturalHeight;
    if(canvas.width!==width)canvas.width=width;
    if(canvas.height!==height)canvas.height=height;
    ctx.drawImage(source,0,0,canvas.width,canvas.height);
  }else{
    ctx.fillStyle='#173b31';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#f5e6c1';ctx.font='24px sans-serif';ctx.fillText('Nadi Budaya · Panggung Betawi',24,canvas.height/2);
  }
  stageCanvasFrame=requestAnimationFrame(drawStageCanvas);
}
function chooseStageMime(){
  if(!window.MediaRecorder)return '';
  return ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||'';
}
async function waitForCameraFrame(timeoutMs=6000){
  const image=$('#cameraStream'),canvas=$('#browserCameraCanvas');
  const ready=()=>browserCameraActive?(canvas&&canvas.width>0&&canvas.height>0):(image&&image.complete&&image.naturalWidth>0);
  const started=Date.now();
  while(Date.now()-started<timeoutMs){if(ready())return true;await stageSleep(120);}
  return Boolean(ready());
}
async function startStageRecording(){
  if(!$('#cameraStop')||$('#cameraStop').disabled){showToast('Nyalakan kamera terlebih dahulu.');return;}
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){$('#stageRecordStatus').textContent='Browser ini belum mendukung perekaman video dari kamera.';return;}
  if(stageMediaRecorder&&stageMediaRecorder.state==='recording')return;
  $('#stageRecordStart').disabled=true;$('#stageRecordStatus').textContent='Memeriksa gambar kamera…';stageRecordingBlob=null;stageSavedPerformanceId=null;$('#stageRecordResult').classList.add('hidden');$('#stageSaveActions').classList.add('hidden');$('#stageRecordedVideo').removeAttribute('src');$('#saveStageToPassport').textContent='Simpan ke Paspor Budaya';$('#saveStageToPassport').disabled=false;
  try{
    const frameReady=await waitForCameraFrame();
    if(!frameReady)throw new Error('Gambar kamera belum tersedia. Tunggu preview muncul lalu coba lagi.');
    if($('#includeStageMic').checked){
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Browser tidak mendukung izin mikrofon.');
      stageMicStream=await navigator.mediaDevices.getUserMedia({audio:true});
    }
  }catch(err){
    stageMicStream?.getTracks().forEach(track=>track.stop());stageMicStream=null;
    $('#stageRecordStart').disabled=false;$('#stageRecordStatus').textContent=err.message;
    showToast(err.message);return;
  }
  const ready=await runStageCountdown();
  if(!ready){stageMicStream?.getTracks().forEach(track=>track.stop());stageMicStream=null;$('#stageRecordStart').disabled=false;return;}
  try{
    const canvas=$('#cameraRecordCanvas');
    if(stageCanvasFrame)cancelAnimationFrame(stageCanvasFrame);
    drawStageCanvas();
    stageCanvasStream=canvas.captureStream(20);
    let tracks=[...stageCanvasStream.getVideoTracks()];
    if(stageMicStream)tracks=[...tracks,...stageMicStream.getAudioTracks()];
    const combined=new MediaStream(tracks);
    const mime=chooseStageMime();
    stageChunks=[];
    stageMediaRecorder=mime?new MediaRecorder(combined,{mimeType:mime}):new MediaRecorder(combined);
    stageMediaRecorder.addEventListener('dataavailable',event=>{if(event.data&&event.data.size)stageChunks.push(event.data);});
    stageMediaRecorder.addEventListener('stop',()=>{
      clearInterval(stageRecordTimer);stageRecordTimer=null;
      cancelAnimationFrame(stageCanvasFrame);stageCanvasFrame=0;
      stageCanvasStream?.getTracks().forEach(track=>track.stop());stageCanvasStream=null;
      stageMicStream?.getTracks().forEach(track=>track.stop());stageMicStream=null;
      const type=stageMediaRecorder?.mimeType||'video/webm';
      const blob=new Blob(stageChunks,{type});
      stageRecordingBlob=blob;
      stageRecordDurationSeconds=Math.max(1,Math.min(30,Math.round((Date.now()-stageRecordStartedAt)/1000)));
      stageSavedPerformanceId=null;
      if(stageVideoURL)URL.revokeObjectURL(stageVideoURL);
      stageVideoURL=URL.createObjectURL(blob);
      $('#stageRecordedVideo').src=stageVideoURL;$('#stageRecordResult').classList.remove('hidden');
      $('#downloadStageVideo').href=stageVideoURL;$('#downloadStageVideo').classList.remove('hidden');
      $('#stageSaveActions').classList.toggle('hidden',!blob.size);
      $('#saveStageToPassport').disabled=false;
      $('#stageRecordStart').disabled=!($('#cameraStop')&&!$('#cameraStop').disabled);
      $('#stageRecordStop').disabled=true;$('#stageRecordingPill').classList.add('hidden');
      $('#stageRecordStatus').textContent='Rekaman siap. Tinjau video, lalu simpan ke Paspor Budaya atau unduh ke perangkat.';
      if(blob.size)showToast('Rekaman panggung selesai. Kamu bisa menyimpannya ke Paspor Budaya.');
      else $('#stageRecordStatus').textContent='Rekaman kosong. Pastikan kamera berjalan lalu coba lagi.';
    },{once:true});
    stageMediaRecorder.start(300);
    stageRecordStartedAt=Date.now();
    stageRecordingContext={mode:$('#cameraModeSelect').value,filter_name:$('#cameraFilterSelect').value,effect_mode:$('#cameraGroupMode')?.value||'same',clip_start_seconds:danceClipStartSeconds,faces_detected:cameraFaceCount,guide_step_reached:danceStepIndex+1};
    $('#stageRecordingPill').classList.remove('hidden');$('#stageRecordStop').disabled=false;
    $('#stageRecordStatus').textContent='Sedang merekam. Rekaman berhenti otomatis setelah 30 detik.';
    stageRecordTimer=setInterval(()=>{
      const elapsed=Math.min(30,Math.floor((Date.now()-stageRecordStartedAt)/1000));
      $('#stageRecordTime').textContent=`00:${String(elapsed).padStart(2,'0')}`;
      if(elapsed>=30)stopStageRecording();
    },200);
  }catch(err){
    stageCanvasStream?.getTracks().forEach(track=>track.stop());stageCanvasStream=null;
    stageMicStream?.getTracks().forEach(track=>track.stop());stageMicStream=null;
    cancelAnimationFrame(stageCanvasFrame);stageCanvasFrame=0;
    $('#stageRecordStart').disabled=false;$('#stageRecordStop').disabled=true;
    $('#stageRecordStatus').textContent='Perekaman gagal. Periksa dukungan browser dan izin mikrofon jika dipilih.';
    showToast(`Perekaman tidak dapat dimulai: ${err.message}`);
  }
}
async function blobToBase64(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{const result=String(reader.result||'');const comma=result.indexOf(',');resolve(comma>=0?result.slice(comma+1):'');};
    reader.onerror=()=>reject(new Error('Video tidak dapat disiapkan untuk penyimpanan.'));
    reader.readAsDataURL(blob);
  });
}
async function saveStageToPassport(){
  if(!stageRecordingBlob||!stageRecordingBlob.size){showToast('Belum ada video yang dapat disimpan.');return;}
  if(stageSavedPerformanceId){showToast('Rekaman ini sudah tersimpan di Paspor Budaya.');return;}
  const maxBytes=20*1024*1024;
  if(stageRecordingBlob.size>maxBytes){$('#stageRecordStatus').textContent='Video melebihi batas penyimpanan 20 MB. Gunakan tombol Unduh Video untuk menyimpan langsung ke perangkat.';return;}
  const button=$('#saveStageToPassport');
  if(runtimeHealth?.deployment==='vercel'&&!runtimeHealth?.storage_ready){$('#stageRecordStatus').textContent='Penyimpanan cloud belum disiapkan. Admin perlu mengatur Supabase dan NADI_SESSION_SECRET sebelum video bisa disimpan secara online.';showToast('Penyimpanan cloud belum dikonfigurasi.');return;}
  button.disabled=true;$('#stageRecordStatus').textContent=runtimeHealth?.storage==='supabase'?'Menyiapkan unggahan aman ke penyimpanan cloud…':'Menyimpan video ke folder lokal aplikasi…';
  const metadata={
    title:$('#stageRecordTitle').value.trim()||'Penampilan Panggung Betawi',
    mode:stageRecordingContext?.mode||$('#cameraModeSelect').value,
    filter_name:stageRecordingContext?.filter_name||$('#cameraFilterSelect').value,
    effect_mode:stageRecordingContext?.effect_mode||$('#cameraGroupMode')?.value||'same',
    clip_start_seconds:stageRecordingContext?.clip_start_seconds??danceClipStartSeconds,
    faces_detected:stageRecordingContext?.faces_detected??cameraFaceCount,
    duration_seconds:stageRecordDurationSeconds||30,
    guide_step_reached:stageRecordingContext?.guide_step_reached||danceStepIndex+1,
    mime_type:(stageRecordingBlob.type||'video/webm').split(';')[0],
  };
  try{
    let result;
    if(runtimeHealth?.storage==='supabase'){
      const signed=await api('/api/performances/upload-url',{method:'POST',body:JSON.stringify({...metadata,size_bytes:stageRecordingBlob.size})});
      const upload=await fetch(signed.upload_url,{method:'PUT',headers:{'Content-Type':metadata.mime_type,'x-upsert':'false'},body:stageRecordingBlob});
      if(!upload.ok){const detail=await upload.text().catch(()=> '');throw new Error(`Unggahan cloud gagal (${upload.status}). ${detail.slice(0,180)}`);}
      result=await api('/api/performances/complete',{method:'POST',body:JSON.stringify({...metadata,id:signed.id,path:signed.path,size_bytes:stageRecordingBlob.size})});
      stageSavedPerformanceId=result.item.id;
      $('#stageRecordStatus').textContent='Rekaman berhasil disimpan secara privat ke Paspor Budaya cloud.';
    }else{
      const videoBase64=await blobToBase64(stageRecordingBlob);
      result=await api('/api/performances',{method:'POST',body:JSON.stringify({...metadata,video_base64:videoBase64})});
      stageSavedPerformanceId=result.item.id;
      $('#stageRecordStatus').textContent='Rekaman berhasil disimpan ke Paspor Budaya pada perangkat ini.';
    }
    $('#saveStageToPassport').textContent='✓ Tersimpan di Paspor Budaya';
    appState=await api('/api/state');renderPassport();
    showToast('Rekaman berhasil masuk ke Paspor Budaya.');
  }catch(err){
    button.disabled=false;$('#stageRecordStatus').textContent=err.message;
    showToast(`Video belum tersimpan: ${err.message}`);
  }
}
function stopStageRecording(){
  if(stageRecordTimer){clearInterval(stageRecordTimer);stageRecordTimer=null;}
  if(stageMediaRecorder&&stageMediaRecorder.state==='recording')stageMediaRecorder.stop();
  else{
    stageCanvasStream?.getTracks().forEach(track=>track.stop());stageCanvasStream=null;
    stageMicStream?.getTracks().forEach(track=>track.stop());stageMicStream=null;
    $('#stageRecordStart').disabled=false;$('#stageRecordStop').disabled=true;
  }
}
// Optional voice rehearsal: audio is kept only in memory in this browser tab.
async function startVoiceRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    $('#recordStatus').textContent = 'Browser ini belum mendukung rekaman suara.';
    showToast('Rekaman suara tidak didukung browser ini. Gunakan kolom teks.');
    return;
  }
  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({audio:true});
    voiceChunks = [];
    const supportedType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
    voiceRecorder = supportedType ? new MediaRecorder(voiceStream,{mimeType:supportedType}) : new MediaRecorder(voiceStream);
    voiceRecorder.addEventListener('dataavailable',event=>{if(event.data&&event.data.size)voiceChunks.push(event.data);});
    voiceRecorder.addEventListener('stop',()=>{
      voiceStream?.getTracks().forEach(track=>track.stop()); voiceStream=null;
      const blob = new Blob(voiceChunks,{type:voiceRecorder?.mimeType||'audio/webm'});
      if (voiceObjectURL) URL.revokeObjectURL(voiceObjectURL);
      voiceObjectURL=URL.createObjectURL(blob);
      $('#recordedAudio').src=voiceObjectURL;$('#recordedAudio').classList.remove('hidden');$('#downloadRecording').classList.remove('hidden');
      $('#recordStatus').textContent='Rekaman tersedia sementara di browser ini.';
      $('#recordStart').disabled=false;$('#recordStop').disabled=true;
    },{once:true});
    voiceRecorder.start(400);
    $('#recordStart').disabled=true;$('#recordStop').disabled=false;$('#recordStatus').textContent='Sedang merekam (maksimal 60 detik)...';
    voiceTimer=setTimeout(stopVoiceRecording,60000);
  } catch (err) {
    voiceStream?.getTracks().forEach(track=>track.stop());voiceStream=null;
    $('#recordStatus').textContent='Mikrofon tidak dapat diakses. Periksa izin browser.';
    $('#recordStart').disabled=false;$('#recordStop').disabled=true;
    showToast('Mikrofon tidak dapat diakses. Izin hanya diminta saat mulai rekam.');
  }
}
function stopVoiceRecording() {
  if(voiceTimer){clearTimeout(voiceTimer);voiceTimer=null;}
  if(voiceRecorder&&voiceRecorder.state==='recording'){voiceRecorder.stop();}
  else {voiceStream?.getTracks().forEach(track=>track.stop());voiceStream=null;}
}
function downloadVoiceRecording(){
  if(!voiceObjectURL){showToast('Belum ada rekaman yang dapat diunduh.');return;}
  const link=document.createElement('a');link.href=voiceObjectURL;link.download='latihan-pantun-nadi-budaya.webm';document.body.appendChild(link);link.click();link.remove();
}

// Visual metronome. Optional synthesized tick; no cultural recording is bundled.
function rhythmTick() {
  rhythmCount = (rhythmCount % 4) + 1;
  $('#rhythmBeat').textContent = rhythmCount;
  const orb = $('#rhythmOrb');
  orb.classList.remove('beat');
  void orb.offsetWidth;
  orb.classList.add('beat');
  setTimeout(() => orb.classList.remove('beat'), 150);
  if ($('#rhythmSound')?.checked) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        if (!rhythmAudio) rhythmAudio = new Ctx();
        if (rhythmAudio.state === 'suspended') rhythmAudio.resume();
        const osc = rhythmAudio.createOscillator();
        const gain = rhythmAudio.createGain();
        osc.type = 'sine';
        osc.frequency.value = rhythmCount === 1 ? 880 : 620;
        gain.gain.setValueAtTime(0.0001, rhythmAudio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.055, rhythmAudio.currentTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, rhythmAudio.currentTime + 0.075);
        osc.connect(gain); gain.connect(rhythmAudio.destination);
        osc.start(); osc.stop(rhythmAudio.currentTime + 0.08);
      }
    } catch (err) { console.warn('Metronom audio tidak tersedia:', err); }
  }
}
function stopRhythm() {
  if (rhythmTimer) clearInterval(rhythmTimer);
  rhythmTimer = null;
  const start = $('#rhythmStart'), stop = $('#rhythmStop');
  if (start) start.disabled = false;
  if (stop) stop.disabled = true;
}
function startRhythm() {
  stopRhythm();
  rhythmCount = 0;
  const bpm = Math.max(50, Math.min(160, Number($('#rhythmBpm').value) || 80));
  rhythmTick();
  rhythmTimer = setInterval(rhythmTick, 60000 / bpm);
  $('#rhythmStart').disabled = true;
  $('#rhythmStop').disabled = false;
}

// RESEARCH, SETTINGS, INITIALIZE
async function saveSettings(){const fontChoice=$('#readingFont').value;const payload={theme:document.body.dataset.theme||'light',font_scale:Number($('#fontScale').value),inclusive:$('#inclusiveToggle').checked,reduced_motion:$('#motionToggle').checked,captions:$('#captionsToggle').checked,large_buttons:$('#buttonsToggle').checked,simple_mode:$('#simpleToggle').checked,dyslexia_font:fontChoice==='dyslexia',reading_font:fontChoice,letter_spacing:Number($('#letterSpacing').value),line_spacing:Number($('#lineSpacing').value),music_enabled:musicAutoplayRequested,music_volume:Number($('#musicVolume').value),tts_rate:Number($('#ttsRate').value),tts_volume:Number($('#ttsVolume').value),tts_voice:$('#ttsVoice').value,voice_focus:$('#voiceFocusToggle').checked,voice_typing:$('#voiceTypingToggle').checked,voice_game:$('#voiceGameToggle').checked,typing_echo:$('#typingEcho').value};try{const result=await api('/api/settings',{method:'PUT',body:JSON.stringify(payload)});appState.settings=result.settings;applySettings(appState.settings);}catch(err){showToast(err.message);}}
async function saveProfile(){const name=$('#profileName').value.trim();if(!name){showToast('Isi nama tampilan terlebih dahulu.');return;}try{appState=await api('/api/profile',{method:'PUT',body:JSON.stringify({name})});renderDashboard();renderPassport();showToast('Nama tampilan diperbarui.');}catch(err){showToast(err.message);}}
async function saveReview(){const area=$('#reviewArea').value,role=$('#reviewRole').value.trim()||'Praktisi/penelaah',note=$('#reviewNote').value.trim();if(note.length<3){showToast('Tuliskan catatan telaah terlebih dahulu.');return;}try{await api('/api/review-notes',{method:'POST',body:JSON.stringify({area,role,note})});appState=await api('/api/state');renderPassport();$('#reviewNote').value='';showToast('Catatan telaah disimpan.');}catch(err){showToast(err.message);}}

function updateMusicButton(isPlaying = backgroundMusicEnabled) {
  const btn = $('#musicToggle');
  const loadingBtn = $('#loadingMusicToggle');
  const labelText = isPlaying ? 'Musik nyala' : 'Musik Betawi';
  if (loadingBtn) {
    loadingBtn.setAttribute('aria-pressed', String(!!isPlaying));
    const loadingLabel = loadingBtn.querySelector('span');
    if (loadingLabel) loadingLabel.textContent = isPlaying ? 'Musik nyala · tekan untuk matikan' : 'Musik mati · tekan untuk nyalakan';
  }
  if (btn) {
    btn.classList.toggle('is-playing', !!isPlaying);
    btn.setAttribute('aria-pressed', String(!!isPlaying));
    btn.title = isPlaying ? 'Matikan musik Betawi' : 'Nyalakan musik Betawi';
    const label = btn.querySelector('span');
    if (label) label.textContent = labelText;
  }
  const status = $('#musicStatusText');
  if (status) status.textContent = isPlaying ? 'Musik Betawi sedang diputar' : 'Musik Betawi mati';
}

function setMusicStatus(message) {
  const status = $('#musicStatusText');
  if (status) status.textContent = message;
}

async function setBackgroundMusic(enabled, save = true) {
  const audio = $('#betawiAudio');
  if (!audio) return;
  if (enabled) {
    musicAutoplayRequested = true;
    audio.loop = true;
    audio.volume = Number($('#musicVolume')?.value ?? 0.3);
    try {
      await audio.play();
      backgroundMusicEnabled = true;
      $('#settingsMusicToggle').checked = true;
      updateMusicButton(true);
      setMusicStatus('Musik Betawi sedang diputar · berulang');
    } catch (err) {
      backgroundMusicEnabled = false;
      $('#settingsMusicToggle').checked = !audio.error;
      updateMusicButton(false);
      if (audio.error) {
        musicAutoplayRequested = false;
        setMusicStatus('File musik belum tersedia. Tambahkan betawi-background.mp3 ke app/static/audio/.');
        showToast('File musik belum ditemukan. Tambahkan audio Betawi terlebih dahulu.');
      } else {
        setMusicStatus('Musik akan mulai setelah interaksi pengguna berikutnya.');
        showToast('Browser menunggu interaksi pengguna sebelum memutar musik.');
      }
    }
  } else {
    musicAutoplayRequested = false;
    audio.pause();
    backgroundMusicEnabled = false;
    $('#settingsMusicToggle').checked = false;
    updateMusicButton(false);
    setMusicStatus('Musik Betawi dijeda');
  }
  if (save && !appState) pendingMusicPreference = !!musicAutoplayRequested;
  if (save && appState) {
    try {
      const result = await api('/api/settings', {method:'PUT', body:JSON.stringify({music_enabled:!!musicAutoplayRequested})});
      appState.settings = result.settings;
    } catch (err) { showToast(err.message); }
  }
}

function resumeBackgroundMusicAfterGesture() {
  if (!musicAutoplayRequested || backgroundMusicEnabled) return;
  const audio = $('#betawiAudio');
  if (!audio) return;
  audio.play().then(() => {
    backgroundMusicEnabled = true;
    $('#settingsMusicToggle').checked = true;
    updateMusicButton(true);
    setMusicStatus('Musik Betawi sedang diputar · berulang');
  }).catch(() => {
    if (audio.error) {
      musicAutoplayRequested = false;
      $('#settingsMusicToggle').checked = false;
      setMusicStatus('File musik belum tersedia. Tambahkan audio Betawi ke folder aplikasi.');
    }
  });
}

function stopBackgroundMusic() {
  const audio = $('#betawiAudio');
  if (audio) { audio.pause(); audio.currentTime = 0; }
  musicAutoplayRequested = false;
  backgroundMusicEnabled = false;
  updateMusicButton(false);
}

const letterNamesId = {
  a:'a',b:'be',c:'ce',d:'de',e:'e',f:'ef',g:'ge',h:'ha',i:'i',j:'je',k:'ka',l:'el',m:'em',
  n:'en',o:'o',p:'pe',q:'ki',r:'er',s:'es',t:'te',u:'u',v:'ve',w:'we',x:'eks',y:'ye',z:'zet',
  '0':'nol','1':'satu','2':'dua','3':'tiga','4':'empat','5':'lima','6':'enam','7':'tujuh','8':'delapan','9':'sembilan'
};
function populateTTSVoices() {
  const select = $('#ttsVoice');
  if (!select || !('speechSynthesis' in window)) return;
  ttsVoices = window.speechSynthesis.getVoices() || [];
  const preferred = select.dataset.preferredVoice || '';
  const prior = select.value || preferred;
  select.innerHTML = '';
  const voices = [...ttsVoices].sort((a,b) => {
    const ai = a.lang?.toLowerCase().startsWith('id') ? 0 : 1;
    const bi = b.lang?.toLowerCase().startsWith('id') ? 0 : 1;
    return ai - bi || a.name.localeCompare(b.name);
  });
  if (!voices.length) {
    const opt = document.createElement('option'); opt.value=''; opt.textContent='Suara perangkat belum tersedia'; select.appendChild(opt);
    $('#ttsStatus').textContent='Belum ada suara Text-to-Speech dari browser/perangkat. Periksa pengaturan suara Windows atau coba Chrome.';
    return;
  }
  voices.forEach(voice => {
    const opt = document.createElement('option');
    opt.value = voice.name;
    opt.textContent = `${voice.name} (${voice.lang || 'bahasa tidak diketahui'})${voice.default ? ' · default' : ''}`;
    select.appendChild(opt);
  });
  const chosen = voices.find(v => v.name === prior) || voices.find(v => /^id(-|$)/i.test(v.lang)) || voices.find(v => v.default) || voices[0];
  select.value = chosen.name;
  select.dataset.preferredVoice = chosen.name;
}

function getTTSVoice() {
  const name = $('#ttsVoice')?.value;
  return ttsVoices.find(v => v.name === name) || ttsVoices.find(v => /^id(-|$)/i.test(v.lang)) || null;
}

function speakText(text, status = 'Sedang membacakan teks…') {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    showToast('Fitur Text-to-Speech tidak tersedia di browser ini. Coba Google Chrome terbaru.');
    return false;
  }
  const clean = String(text || '').replace(/\s+/g,' ').trim().slice(0,5000);
  if (!clean) { showToast('Belum ada teks yang bisa dibacakan.'); return false; }
  window.speechSynthesis.cancel();
  typingSpeechCount = 0;
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'id-ID';
  utterance.rate = Number($('#ttsRate')?.value || 0.9);
  utterance.volume = Number($('#ttsVolume')?.value || 1);
  utterance.pitch = 1;
  const voice = getTTSVoice();
  if (voice) { utterance.voice = voice; utterance.lang = voice.lang || 'id-ID'; }
  utterance.onstart = () => { $('#ttsStatus').textContent = status; };
  utterance.onend = () => { $('#ttsStatus').textContent = 'Selesai dibacakan.'; };
  utterance.onerror = (event) => { $('#ttsStatus').textContent = `Suara tidak dapat diputar (${event.error || 'kesalahan suara'}). Coba pilih suara lain.`; };
  window.speechSynthesis.speak(utterance);
  return true;
}

function spellThenReadWord(text) {
  const word = String(text || '').trim();
  if (!word) { showToast('Masukkan satu kata yang ingin dieja.'); return; }
  if (/\s/.test(word)) { showToast('Untuk fitur eja, masukkan satu kata saja. Kalimat bisa memakai tombol Baca kalimat.'); return; }
  const letters = [...word.toLocaleLowerCase('id-ID')].map(char => letterNamesId[char] || (/[\p{L}\p{N}]/u.test(char) ? char : '')).filter(Boolean);
  if (!letters.length) { showToast('Kata belum berisi huruf atau angka.'); return; }
  speakText(`Mengeja: ${letters.join(', ')}. Kata lengkapnya: ${word}.`, `Mengeja kata ${word}, lalu membacakan kata lengkapnya…`);
}

function readActivePage() {
  const page = $('.page.active');
  if (!page) return;
  const clone = page.cloneNode(true);
  clone.querySelectorAll('button,input,textarea,select,script,svg,.intro-emoji,.tag-soft').forEach(el => el.remove());
  const text = clone.innerText || clone.textContent || '';
  if (text.trim().length > 5000) {
    $('#ttsStatus').textContent = 'Halaman panjang. Salin bagian teks yang ingin didengar ke kotak teks, lalu tekan Baca kalimat.';
    showToast('Halaman terlalu panjang untuk sekali baca. Gunakan kotak teks.');
    return;
  }
  speakText(text, 'Membacakan isi halaman aktif…');
}

function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  typingSpeechCount = 0;
  typingEchoToken += 1;
  clearTimeout(typingEchoTimer);
  $('#ttsStatus').textContent = 'Pembacaan dihentikan.';
}

function bindTTSVoiceEvents() {
  if (!('speechSynthesis' in window)) {
    $('#ttsStatus').textContent = 'Browser ini tidak menyediakan Text-to-Speech. Gunakan Chrome atau Edge terbaru.';
    ['ttsReadText','ttsSpellWord','ttsReadPage','ttsStop','ttsVoice','ttsRate'].forEach(id => { const el=$('#'+id); if(el)el.disabled=true; });
    return;
  }
  populateTTSVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', populateTTSVoices);
  if (!window.speechSynthesis.addEventListener) window.speechSynthesis.onvoiceschanged = populateTTSVoices;
}


function normalizedLabel(element) {
  if (!element) return '';
  const explicit = element.getAttribute('aria-label');
  if (explicit) return explicit.trim();
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const names = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
    if (names) return names;
  }
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label) return label.textContent.replace(/\s+/g, ' ').trim();
  }
  const wrappedLabel = element.closest('label');
  if (wrappedLabel) return wrappedLabel.textContent.replace(/\s+/g, ' ').trim();
  const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
  return text || element.getAttribute('title') || element.getAttribute('placeholder') || '';
}

function describeFocusedElement(element) {
  const tag = element.tagName?.toLowerCase();
  const label = normalizedLabel(element).slice(0, 220);
  if (!label) return '';
  if (tag === 'button') return `Tombol. ${label}.`;
  if (tag === 'a') return `Tautan. ${label}.`;
  if (tag === 'select') return `Pilihan. ${label}. Nilai saat ini ${element.selectedOptions?.[0]?.textContent || ''}.`;
  if (tag === 'textarea' || (tag === 'input' && !['checkbox','radio','range','submit','button','password','file'].includes(element.type))) return `Kolom teks. ${label}.`;
  if (tag === 'input' && element.type === 'checkbox') return `Kotak centang. ${label}. ${element.checked ? 'Aktif' : 'Tidak aktif'}.`;
  if (tag === 'input' && element.type === 'radio') return `Pilihan. ${label}. ${element.checked ? 'Terpilih' : 'Belum terpilih'}.`;
  if (tag === 'input' && element.type === 'range') return `${label}. Nilai ${element.value}.`;
  if (element.getAttribute('role') === 'button') return `Tombol. ${label}.`;
  return label;
}

function handleVoiceFocus(event) {
  if (!$('#voiceFocusToggle')?.checked) return;
  const rawTarget = event.target;
  if (!(rawTarget instanceof HTMLElement)) return;
  const target = rawTarget.closest('button,a,input,textarea,select,[role="button"],[tabindex]:not([tabindex="-1"])');
  if (!target) return;
  if (target.closest('.intro-overlay.hidden, .loading-screen.loaded')) return;
  if (target.matches('input[type="password"], input[type="file"]')) {
    const safeLabel = normalizedLabel(target) || 'Kolom privat';
    speakText(`Kolom privat. ${safeLabel}. Isi tidak akan dibacakan.`, 'Jelajah Suara');
    return;
  }
  const description = describeFocusedElement(target);
  if (!description) return;
  const now = Date.now();
  if (now - lastFocusAnnouncementAt < 450) return;
  lastFocusAnnouncementAt = now;
  speakText(description, 'Jelajah Suara');
}

function speakQueued(text) {
  if (!('speechSynthesis' in window) || !text) return;
  // Prevent an excessively long character queue when someone types rapidly.
  if (typingSpeechCount >= 10) {
    window.speechSynthesis.cancel();
    typingSpeechCount = 0;
  }
  const utterance = new SpeechSynthesisUtterance(String(text).slice(0, 100));
  utterance.lang = getTTSVoice()?.lang || 'id-ID';
  utterance.voice = getTTSVoice();
  utterance.rate = Number($('#ttsRate')?.value || 0.9);
  utterance.volume = Number($('#ttsVolume')?.value || 1);
  utterance.onend = () => { typingSpeechCount = Math.max(0, typingSpeechCount - 1); };
  utterance.onerror = () => { typingSpeechCount = Math.max(0, typingSpeechCount - 1); };
  typingSpeechCount += 1;
  window.speechSynthesis.speak(utterance);
}

function handleTypingVoice(event) {
  if (!$('#voiceTypingToggle')?.checked) return;
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
  if (field.type === 'password' || field.type === 'file' || field.disabled || field.readOnly) return;
  if (field.id === 'teacherPin') return;
  const mode = $('#typingEcho')?.value || 'word';
  if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteContentForward') {
    if (mode === 'letter' || mode === 'both') speakQueued('hapus');
  } else if ((mode === 'letter' || mode === 'both') && typeof event.data === 'string' && event.data.length === 1 && /[\p{L}\p{N}]/u.test(event.data)) {
    const name = letterNamesId[event.data.toLowerCase()] || event.data;
    speakQueued(name);
  }
  clearTimeout(typingEchoTimer);
  typingEchoToken += 1;
  const token = typingEchoToken;
  if (mode === 'word' || mode === 'both') {
    typingEchoTimer = setTimeout(() => {
      const last = getLastWord(field.value || '');
      const speakWordWhenReady = (attempt = 0) => {
        if (token !== typingEchoToken || !last) return;
        if (mode === 'both' && typingSpeechCount > 0 && attempt < 80) {
          setTimeout(() => speakWordWhenReady(attempt + 1), 100);
          return;
        }
        speakText(last, 'Membacakan kata yang baru diketik…');
      };
      speakWordWhenReady();
    }, 850);
  }
}

function announceGameArea() {
  if (!$('#voiceGameToggle')?.checked) return;
  const area = $('#gameArea');
  if (!area) return;
  const feedback = area.querySelector('.feedback-box');
  let text = '';
  if (feedback) {
    text = feedback.textContent.replace(/\s+/g, ' ').trim();
  } else {
    const heading = area.querySelector('.game-shell h3, .game-shell h2')?.textContent || '';
    const prompt = area.querySelector('.question-text, .rhyme-card, .game-shell > .muted-note, .game-shell p')?.textContent || '';
    const counter = area.querySelector('.question-count')?.textContent || '';
    text = [heading, counter, prompt].filter(Boolean).join('. ').replace(/\s+/g, ' ').trim();
  }
  if (!text || text === lastGameAnnouncement) return;
  lastGameAnnouncement = text;
  speakText(text, 'Game Voice');
}

function initVoiceAssistant() {
  document.addEventListener('focusin', handleVoiceFocus, true);
  document.addEventListener('pointerup', handleVoiceFocus, true);
  document.addEventListener('input', handleTypingVoice, true);
  const gameArea = $('#gameArea');
  if (gameArea && 'MutationObserver' in window) {
    gameVoiceObserver = new MutationObserver(() => {
      clearTimeout(gameVoiceTimer);
      gameVoiceTimer = setTimeout(announceGameArea, 350);
    });
    gameVoiceObserver.observe(gameArea, {childList: true, subtree: true, characterData: true});
  }
}
let gameVoiceTimer = null;

function setLoading(percent, message) {
  const progress = Math.max(0, Math.min(100, percent));
  if ($('#loadingProgress')) $('#loadingProgress').style.width = `${progress}%`;
  if ($('#loadingPercent')) $('#loadingPercent').textContent = `${Math.round(progress)}%`;
  if ($('#loadingMessage') && message) $('#loadingMessage').textContent = message;
}
function hideLoading() {
  const loader = $('#loadingScreen');
  if (!loader) return;
  loader.classList.add('loaded');
  setTimeout(() => loader.remove(), 650);
}

function waitForLoadingScreen() {
  return new Promise(resolve => {
    const skipButton = $('#loadingSkip');
    const reduced = document.body.classList.contains('reduced-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const totalDuration = reduced ? 1800 : 5600;
    const remaining = Math.max(0, totalDuration - (performance.now() - loadingStartedAt));
    const intervalMs = 180;
    let progress = 72;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(progressTimer);
      clearTimeout(skipTimer);
      clearTimeout(endTimer);
      skipButton?.classList.add('hidden');
      loadingSkipResolver = null;
      resolve();
    };
    loadingSkipResolver = finish;
    const progressTimer = setInterval(() => {
      progress = Math.min(96, progress + (reduced ? 4 : 0.8));
      const labels = ['Menyiapkan ruang cerita…','Menyelaraskan pengaturan…','Menata ruang belajar…'];
      const labelIndex = Math.min(labels.length - 1, Math.floor((progress - 72) / 9));
      setLoading(progress, labels[labelIndex]);
    }, intervalMs);
    const skipTimer = setTimeout(() => skipButton?.classList.remove('hidden'), reduced ? 500 : 1700);
    const endTimer = setTimeout(finish, remaining);
  });
}
function showIntro(step = 0) {
  introStep = Math.max(0, Math.min(2, step));
  $('#introOverlay').classList.remove('hidden');
  renderIntroStep();
}
function renderIntroStep() {
  $$('.intro-step').forEach(el => el.classList.toggle('active', Number(el.dataset.introStep) === introStep));
  $$('.intro-dots i').forEach((el, i) => el.classList.toggle('active', i === introStep));
  $('#introBack').classList.toggle('hidden', introStep === 0);
  $('#introNext').classList.toggle('hidden', introStep === 2);
  $('#introSkip').classList.toggle('hidden', introStep === 2);
  $('#teacherPinArea').classList.add('hidden');
}
function finishIntro(role = 'participant') {
  localStorage.setItem('nadi_budaya_intro_done', '1');
  localStorage.setItem('nadi_budaya_role', role);
  $('#introOverlay').classList.add('hidden');
  teacherAuthorized = role === 'teacher';
  $('#teacherNav').classList.toggle('hidden', !teacherAuthorized);
  if (teacherAuthorized) {
    setPage('teacher');
    renderTeacherAssessments();
  } else {
    setPage('home');
  }
}
async function loginTeacher() {
  const pin = $('#teacherPin').value.trim();
  if (!pin) { showToast('Masukkan PIN Ruang Guru.'); return; }
  try {
    await api('/api/teacher/verify', {method:'POST', body:JSON.stringify({pin})});
    $('#teacherPin').value = '';
    finishIntro('teacher');
    showToast('Ruang Guru terbuka.');
  } catch (err) { showToast(err.message); }
}
async function saveTeacherAssessment() {
  const payload = {
    participant_code: $('#teacherParticipantCode').value.trim(),
    teacher_name: $('#teacherName').value.trim(),
    area: $('#teacherArea').value,
    assessment_stage: $('#teacherStage').value,
    score: Number($('#teacherScore').value),
    evidence: $('#teacherEvidence').value.trim()
  };
  if (payload.participant_code.length < 2 || payload.teacher_name.length < 2 || payload.evidence.length < 3) {
    showToast('Lengkapi kode peserta, nama penilai, dan bukti observasi.'); return;
  }
  try {
    await api('/api/teacher/assessment', {method:'POST', body:JSON.stringify(payload)});
    $('#teacherEvidence').value = '';
    await renderTeacherAssessments();
    showToast('Penilaian tersimpan secara lokal.');
  } catch (err) { showToast(err.message); }
}
async function renderTeacherAssessments() {
  if (!teacherAuthorized) return;
  try {
    const data = await api('/api/teacher/assessments');
    const items = data.items || [];
    $('#teacherAssessmentCount').textContent = `${items.length} CATATAN`;
    $('#teacherAssessmentList').innerHTML = items.length ? items.map(item => `<article class="teacher-assessment-item"><div><b>${escapeHTML(item.participant_code)}</b><small>${escapeHTML(item.teacher_name)} · ${escapeHTML(formatDate(item.at))}</small></div><span class="teacher-score">${item.score}/4</span><div class="teacher-assessment-detail"><b>${({initial:'Penilaian awal',ongoing:'Penilaian proses',final:'Penilaian akhir'}[item.assessment_stage]||'Penilaian')} · ${escapeHTML(competencyMeta[item.area]?.label || item.area)}</b><p>${escapeHTML(item.evidence || 'Tidak ada catatan tambahan.')}</p></div></article>`).join('') : '<div class="empty-state">Belum ada catatan penilaian.</div>';
  } catch (err) { showToast(err.message); }
}
async function logoutTeacher() {
  try { await api('/api/teacher/logout',{method:'POST',body:'{}'}); } catch (_) {}
  teacherAuthorized = false;
  localStorage.removeItem('nadi_budaya_role');
  $('#teacherNav').classList.add('hidden');
  setPage('home');
  showToast('Keluar dari Ruang Guru.');
}

function bindEvents(){
  $$('[data-page]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
  $('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $$('.game-tab').forEach(b=>b.addEventListener('click',()=>selectGame(b.dataset.game)));
  $('#analyzePantun').addEventListener('click',creatorAnalyze);$('#savePantun').addEventListener('click',savePantun);$('#addStanza').addEventListener('click',addStanza);
  $$('.theme-chips button').forEach(b=>b.addEventListener('click',()=>{$('#wordSuggestion').textContent=wordIdeas[b.dataset.word]||'';}));
  $('#newPrompt').addEventListener('click',()=>{const p=stagePrompts[Math.floor(Math.random()*stagePrompts.length)];$('#stagePrompt').innerHTML=p.map(escapeHTML).join('<br>');});
  $('#stageCheck').addEventListener('click',stageCheck);$('#recordStart').addEventListener('click',startVoiceRecording);$('#recordStop').addEventListener('click',stopVoiceRecording);$('#downloadRecording').addEventListener('click',downloadVoiceRecording);
  $('#saveCompetency').addEventListener('click',saveCompetencies);
  $('#cameraStart').addEventListener('click',startCamera);$('#cameraStop').addEventListener('click',stopCamera);if($('#cameraFullscreen'))$('#cameraFullscreen').addEventListener('click',toggleCameraFullscreen);
  $('#cameraModeSelect').addEventListener('change',()=>{if(!$('#cameraStop').disabled){showToast('Matikan kamera lalu mulai lagi untuk menerapkan mode baru.');}});
  $('#cameraFilterSelect').addEventListener('change',()=>updateAccessorySelection($('#cameraFilterSelect').value));
  $('#cameraGroupMode').addEventListener('change',async()=>{
    const mixed=$('#cameraGroupMode').value==='mix';
    $('#cameraGroupHint').textContent=mixed?'Mode variasi: setiap wajah mendapat aksesori berbeda. Sistem mendeteksi maksimal empat wajah; urutan efek mengikuti urutan deteksi.':'Mode seragam: semua wajah memakai aksesori yang sama.';
    if(browserCameraActive && window.NadiBrowserCamera){
      window.NadiBrowserCamera.setFilter($('#cameraFilterSelect').value,$('#cameraGroupMode').value);
      $('#cameraMessage').textContent=mixed?'Mode grup aktif: tiap wajah mendapat aksesori berbeda.':'Mode seragam aktif: semua wajah memakai aksesori yang sama.';
      showToast('Mode efek grup diperbarui.');
    }else if($('#cameraStop')&&!$('#cameraStop').disabled){
      try{await api('/api/camera/filter',{method:'POST',body:JSON.stringify({filter_name:$('#cameraFilterSelect').value,effect_mode:$('#cameraGroupMode').value})});$('#cameraMessage').textContent=mixed?'Mode grup aktif: tiap wajah mendapat aksesori berbeda.':'Mode seragam aktif: semua wajah memakai aksesori yang sama.';showToast('Mode efek grup diperbarui.');}
      catch(err){showToast(err.message);}
    }else{showToast('Mode efek akan diterapkan saat kamera dinyalakan.');}
  });
  $('#danceClipStart').addEventListener('input',updateClipRangePreview);
  $('#applyDanceClip').addEventListener('click',applyDanceClip);
  updateClipRangePreview();
  $$('[data-camera-filter]').forEach(button=>button.addEventListener('click',()=>chooseCameraFilter(button.dataset.cameraFilter)));
  updateAccessorySelection($('#cameraFilterSelect').value||'iket');
  $('#cameraGroupHint').textContent='Filter yang dipilih akan dipakai bersama oleh semua wajah yang terdeteksi (maksimal 4 orang).';
  $('#danceStepPrev').addEventListener('click',()=>{danceStepIndex=Math.max(0,danceStepIndex-1);renderDanceStep(true);});
  $('#danceStepNext').addEventListener('click',()=>{danceStepIndex=danceStepIndex===danceGuide.length-1?0:danceStepIndex+1;renderDanceStep(true);});
  $('#stageRecordStart').addEventListener('click',startStageRecording);$('#stageRecordStop').addEventListener('click',stopStageRecording);$('#saveStageToPassport').addEventListener('click',saveStageToPassport);
  renderDanceStep();
  if($('#rhythmStart'))$('#rhythmStart').addEventListener('click',startRhythm);
  if($('#rhythmStop'))$('#rhythmStop').addEventListener('click',stopRhythm);
  if($('#rhythmBpm'))$('#rhythmBpm').addEventListener('input',()=>{ $('#rhythmBpmLabel').textContent=$('#rhythmBpm').value+' BPM'; if(rhythmTimer)startRhythm(); });
  $('#fontScale').addEventListener('input',()=>{$('#fontScaleLabel').textContent=$('#fontScale').value+'%';document.documentElement.style.setProperty('--font-scale',String(Number($('#fontScale').value)/100));});
  ['inclusiveToggle','motionToggle','captionsToggle','buttonsToggle','simpleToggle'].forEach(id=>$('#'+id).addEventListener('change',()=>{document.body.classList.toggle('inclusive',$('#inclusiveToggle').checked);document.body.classList.toggle('reduced-motion',$('#motionToggle').checked);document.body.classList.toggle('simple-mode',$('#simpleToggle').checked);saveSettings();}));
  $$('.theme-choice[data-theme]').forEach(b=>b.addEventListener('click',()=>{document.body.dataset.theme=b.dataset.theme;$$('.theme-choice').forEach(x=>x.classList.toggle('selected',x===b));saveSettings();}));
  $('#readingFont').addEventListener('change',saveSettings);
  $('#letterSpacing').addEventListener('input',()=>{$('#letterSpacingLabel').textContent=$('#letterSpacing').value;document.documentElement.style.setProperty('--letter-spacing',`${$('#letterSpacing').value}em`);});
  $('#lineSpacing').addEventListener('input',()=>{$('#lineSpacingLabel').textContent=$('#lineSpacing').value;document.documentElement.style.setProperty('--line-spacing',$('#lineSpacing').value);});
  ['letterSpacing','lineSpacing'].forEach(id=>$('#'+id).addEventListener('change',saveSettings));
  $('#settingsMusicToggle').addEventListener('change',e=>setBackgroundMusic(e.target.checked));
  $('#readPageQuick').addEventListener('click',readActivePage);
  $('#musicToggle').addEventListener('click',()=>setBackgroundMusic(!(musicAutoplayRequested || backgroundMusicEnabled)));
  $('#loadingMusicToggle').addEventListener('click',()=>setBackgroundMusic(!(musicAutoplayRequested || backgroundMusicEnabled)));
  $('#musicTest').addEventListener('click',()=>setBackgroundMusic(!(musicAutoplayRequested || backgroundMusicEnabled)));
  $('#musicVolume').addEventListener('input',()=>{
    const value=Number($('#musicVolume').value); $('#musicVolumeLabel').textContent=`${Math.round(value*100)}%`;
    $('#betawiAudio').volume=value;
  });
  $('#musicVolume').addEventListener('change',saveSettings);
  $('#betawiAudio').addEventListener('error',()=>{
    musicAutoplayRequested = false;
    backgroundMusicEnabled = false;
    $('#settingsMusicToggle').checked = false;
    updateMusicButton(false);
    setMusicStatus('File musik belum dipasang. Tambahkan app/static/audio/betawi-background.mp3.');
  });
  document.addEventListener('pointerdown', resumeBackgroundMusicAfterGesture, true);
  document.addEventListener('keydown', resumeBackgroundMusicAfterGesture, true);
  $('#voiceFocusToggle').addEventListener('change',saveSettings);
  $('#voiceTypingToggle').addEventListener('change',saveSettings);
  $('#voiceGameToggle').addEventListener('change',()=>{lastGameAnnouncement='';saveSettings();if($('#voiceGameToggle').checked)announceGameArea();});
  $('#typingEcho').addEventListener('change',saveSettings);
  $('#ttsVolume').addEventListener('input',()=>$('#ttsVolumeLabel').textContent=`${Math.round(Number($('#ttsVolume').value)*100)}%`);
  $('#ttsVolume').addEventListener('change',saveSettings);
  $('#loadingSkip').addEventListener('click',()=>loadingSkipResolver?.());
  $('#ttsReadText').addEventListener('click',()=>speakText($('#ttsText').value,'Membacakan teks yang kamu masukkan…'));
  $('#ttsSpellWord').addEventListener('click',()=>spellThenReadWord($('#ttsText').value));
  $('#ttsReadPage').addEventListener('click',readActivePage);
  $('#ttsStop').addEventListener('click',stopSpeech);
  $('#ttsRate').addEventListener('input',()=>$('#ttsRateLabel').textContent=`${Number($('#ttsRate').value).toLocaleString('id-ID')}×`);
  $('#ttsRate').addEventListener('change',saveSettings);
  $('#ttsVoice').addEventListener('change',()=>{ $('#ttsVoice').dataset.preferredVoice=$('#ttsVoice').value; saveSettings(); });
  $('#introNext').addEventListener('click',()=>{introStep=Math.min(2,introStep+1);renderIntroStep();});
  $('#introBack').addEventListener('click',()=>{introStep=Math.max(0,introStep-1);renderIntroStep();});
  $('#introSkip').addEventListener('click',()=>finishIntro('participant'));
  $('#introParticipant').addEventListener('click',()=>finishIntro('participant'));
  $('#introTeacher').addEventListener('click',()=>$('#teacherPinArea').classList.toggle('hidden'));
  $('#teacherLogin').addEventListener('click',loginTeacher);
  $('#teacherPin').addEventListener('keydown',e=>{if(e.key==='Enter')loginTeacher();});
  $('#reopenIntro').addEventListener('click',()=>showIntro(2));
  $('#saveTeacherAssessment').addEventListener('click',saveTeacherAssessment);
  $('#teacherRefresh').addEventListener('click',renderTeacherAssessments);
  $('#teacherLogout').addEventListener('click',logoutTeacher);
  $('#saveProfile').addEventListener('click',saveProfile);$('#saveReview').addEventListener('click',saveReview);
  $('#exportData').addEventListener('click',()=>{window.location.href='/api/export.csv';});
  window.addEventListener('beforeunload',()=>{stopRhythm();stopVoiceRecording();stopStageRecording();stopSpeech();stopBackgroundMusic();if(browserCameraActive&&window.NadiBrowserCamera)window.NadiBrowserCamera.stop();else if(activePage==='camera')fetch('/api/camera/stop',{method:'POST',keepalive:true}).catch(()=>{});});
}
async function init(){
  loadingStartedAt = performance.now();
  bindEvents(); bindTTSVoiceEvents(); initVoiceAssistant(); setLoading(8,'Menyiapkan tampilan...');
  try {
    const health=await api('/api/health'); if(!health.ok)throw new Error('Server belum siap.'); runtimeHealth=health; document.body.dataset.cameraBackend=health.camera_backend||'python';
    if(health.deployment==='vercel'&&!health.storage_ready){const notice=$('#deploymentNotice');if(notice){notice.classList.remove('hidden');notice.innerHTML='<strong>Mode preview:</strong> website dapat dijelajahi, tetapi penyimpanan belum aktif. Admin perlu mengisi Supabase dan NADI_SESSION_SECRET di Vercel sebelum data peserta dan video dapat disimpan secara permanen.';}}
    if(health.deployment==='vercel'&&!health.teacher_auth_ready){const notice=$('#deploymentNotice');if(notice){notice.classList.remove('hidden');notice.innerHTML='<strong>Konfigurasi belum lengkap:</strong> atur Supabase, NADI_SESSION_SECRET, dan NADI_GURU_PIN di Vercel Environment Variables sebelum membuka aplikasi untuk umum.';}}
    setLoading(30,'Menghubungkan ruang belajar...');
    await refreshState();
    if (pendingMusicPreference !== null) {
      const savedPreference = await api('/api/settings', {method:'PUT', body:JSON.stringify({music_enabled:pendingMusicPreference})});
      appState.settings = savedPreference.settings;
      pendingMusicPreference = null;
    }
    setLoading(55,'Memuat progres dan pengaturan...');
    const hash=location.hash.replace('#','');
    setPage($('#page-'+hash)&&hash!=='teacher'?hash:'home');
    $('#profileName').value=appState.profile?.name||'';
    $('#gameArea').innerHTML=''; selectGame('quiz');
    renderCompetency(); renderPath(); renderPassport();
    applySettings(appState.settings || {});
    if (appState.settings?.music_enabled) {
      // Try on first interaction: browsers may block audible autoplay at initial page load.
      musicAutoplayRequested = true;
      $('#settingsMusicToggle').checked = true;
      setMusicStatus('Musik aktif sesuai pengaturan. Musik mulai setelah interaksi pertama jika browser menahan autoplay.');
    }
    setLoading(72,'Menata ruang belajar...');
    await waitForLoadingScreen();
    setLoading(100,'Nadi Budaya siap dijelajahi.');
    hideLoading();
    if(!localStorage.getItem('nadi_budaya_intro_done')) showIntro(0);
  } catch(err) {
    setLoading(100,'Aplikasi belum dapat dihubungkan.');
    const loader=$('#loadingScreen');
    if(loader){$('#loadingMessage').textContent=`Gagal memuat: ${err.message}`;$('#loadingPercent').textContent='!';$('#loadingProgress').style.background='#b94d38';}
    console.error(err);
  }
}
document.addEventListener('DOMContentLoaded',init);
