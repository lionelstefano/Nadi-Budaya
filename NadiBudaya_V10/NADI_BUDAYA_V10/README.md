# NADI BUDAYA V10 — Release Candidate

**Nadi Budaya — Ruang Cerita Betawi** adalah prototipe pembelajaran dan pendampingan budaya Betawi yang dikembangkan dari V9. V10 menyiapkan dua cara menjalankan aplikasi: lokal melalui VS Code dan online melalui Vercel + Supabase.

> V10 adalah paket siap diuji dan siap dikonfigurasi untuk deployment. Paket ini belum otomatis membuat repository GitHub, proyek Supabase, atau deployment Vercel di akun pengguna. Pengaturan akun, environment variables, dan persetujuan aset tetap perlu dilakukan oleh pemilik akun.

## Fitur yang dipertahankan

- Beranda, Peta Belajar, materi pantun, Arena Permainan, Panggung Rancag, dan Studio Pantun.
- Empat komponen Nadi Kit: Peta Kompetensi, Pencocokan Kebutuhan Belajar, Jalur Pendampingan Adaptif, dan Paspor Perkembangan Budaya.
- Ruang Guru/Penelaah dengan PIN dan sesi bertanda tangan.
- Panggung Betawi: aksesori wajah ilustratif, filter grup hingga empat wajah, referensi video 30 detik, panduan latihan, countdown 3–2–1, dan rekaman maksimal 30 detik.
- Nadi Voice Assistant, mode baca nyaman, font/ukuran teks, tema, reduced motion, dan pengaturan musik.
- Logo resmi Nadi Budaya, favicon, ilustrasi Ondel-Ondel, dan musik Betawi.

## Perubahan teknis V10

- **Kamera browser-side:** pada mode browser, webcam dibuka di perangkat pengunjung menggunakan `getUserMedia`; pemrosesan wajah/pose berjalan di browser dengan MediaPipe Tasks Vision. Backend Vercel tidak mencoba membuka webcam server.
- **Backend FastAPI:** root `main.py` mengekspor objek ASGI `app` untuk runtime Python Vercel.
- **Penyimpanan lokal:** saat berjalan di VS Code, profil/progres/metadata tersimpan di JSON lokal dan video disimpan di `app/data/performances/` setelah peserta menekan Simpan.
- **Penyimpanan online:** jika Supabase dikonfigurasi, state peserta disimpan per cookie peserta bertanda tangan dan video diunggah langsung dari browser ke bucket privat melalui signed upload URL. Secret Supabase hanya dibaca backend.
- **Mode preview online:** bila Supabase atau secret sesi belum dikonfigurasi, website dapat dimuat untuk preview, tetapi operasi penyimpanan akan menampilkan pesan konfigurasi dan tidak berpura-pura menyimpan secara permanen.
- **Keamanan dasar:** PIN guru tidak memakai nilai demo di deployment; cookie guru bertanda tangan dan HttpOnly; endpoint penilaian dilindungi; request mutasi lintas-origin ditolak; file `.env` dan data lokal diabaikan Git.

## A. Menjalankan secara lokal di Windows / VS Code

### Persyaratan

- Windows 10/11 64-bit.
- Python 3.11 64-bit (`py -3.11 --version`).
- Koneksi internet saat instalasi paket dan saat pertama kali memuat model MediaPipe di browser.
- Chrome atau Edge versi modern untuk kamera dan MediaRecorder.

### Instalasi

1. Extract ZIP ke folder `NADI_BUDAYA_V10`.
2. Di VS Code pilih **File → Open Folder** dan buka folder yang langsung berisi `setup_windows.bat`.
3. Pilih **Terminal → New Terminal** dengan PowerShell.
4. Jalankan satu kali:

   ```powershell
   .\setup_windows.bat
   ```

5. Setelah selesai, jalankan:

   ```powershell
   .\run_windows.bat
   ```

6. Buka `http://127.0.0.1:8010`.
7. Opsional: klik dua kali `pasang_mulai_v10.bat`. Buka terminal PowerShell baru lalu ketik `mulai`.

`run_windows.bat` mengatur kamera ke mode browser agar webcam yang dipakai adalah webcam komputer pengguna yang membuka website. Untuk memilih backend kamera Python/OpenCV lokal secara manual, ubah `NADI_CAMERA_BACKEND=python` sebelum menjalankan Uvicorn.

### Menjalankan tes lokal

```powershell
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

## B. Menyiapkan Supabase

Supabase diperlukan untuk penyimpanan permanen ketika website di-deploy ke Vercel.

1. Buat proyek Supabase.
2. Buka **SQL Editor** dan jalankan isi `supabase/schema.sql`.
3. Pastikan bucket `nadi-performances` berstatus **private**.
4. Ambil Project URL dan server-side Secret key dari pengaturan API proyek.
5. Jangan pernah menaruh Secret key atau `service_role` key di JavaScript, HTML, atau repository publik.
6. Konfigurasikan CORS Storage agar mengizinkan domain Vercel yang akan dipakai.

V10 menerima `SUPABASE_SECRET_KEY` (direkomendasikan) atau `SUPABASE_SERVICE_ROLE_KEY` lama sebagai fallback. Kunci server ini hanya dipakai oleh backend. Tabel mengaktifkan RLS dan menolak akses `anon`/`authenticated`; backend menggunakan kunci server untuk akses administratif. Karena signed upload dilakukan langsung dari browser ke Storage, tambahkan domain deployment (misalnya `https://nama-proyek.vercel.app`) ke pengaturan CORS/Allowed Origins Storage Supabase. Uji upload, playback, dan delete pada Preview Deployment sebelum memakai data penelitian nyata.

## C. Environment Variables Vercel

Tambahkan variabel berikut pada **Project → Settings → Environment Variables**. Setel untuk Production dan Preview sesuai kebutuhan.

| Nama | Isi |
|---|---|
| `SUPABASE_URL` | URL proyek Supabase, contoh `https://xxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | Secret key server-side Supabase (`sb_secret_...`) |
| `SUPABASE_STORAGE_BUCKET` | `nadi-performances` |
| `NADI_SESSION_SECRET` | Rahasia acak minimal 32 karakter, unik untuk deployment |
| `NADI_GURU_PIN` | PIN/secret Guru minimal 8 karakter, bukan `2468` |
| `NADI_CAMERA_BACKEND` | `browser` |

File `.env.example` berisi nama variabel contoh tanpa kredensial. Untuk lokal, salin ke `.env` jika menguji Supabase. File `.env` tidak boleh dikomit. Buat `NADI_SESSION_SECRET` dengan generator rahasia acak (minimal 32 karakter) dan gunakan nilai unik untuk setiap environment. Jangan gunakan PIN demo lokal `2468` pada deployment.

**Penting:** tanpa `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, dan `NADI_SESSION_SECRET`, deployment berada pada mode preview tanpa penyimpanan permanen. Tanpa `NADI_GURU_PIN`, Ruang Guru online tidak dapat dibuka.

## D. GitHub dan Vercel

### GitHub

1. Buat repository baru, disarankan **Private** selama review.
2. Extract V10 lalu buka terminal pada root proyek.
3. Inisialisasi dan push kode:

   ```bash
   git init
   git add .
   git commit -m "Nadi Budaya V10 release candidate"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPOSITORY.git
   git push -u origin main
   ```

4. Sebelum push, pastikan `.env`, `.venv`, `app/data/*.json`, dan rekaman peserta tidak muncul dalam `git status`.
5. Workflow GitHub Actions di `.github/workflows/tests.yml` menjalankan tes Python pada push dan pull request.

### Vercel

1. Masuk Vercel dan pilih **Add New → Project**.
2. Hubungkan GitHub lalu import repository Nadi Budaya V10.
3. Root Directory adalah root repository (folder yang berisi `main.py`, `pyproject.toml`, dan `requirements.txt`).
4. Framework/runtime akan dideteksi dari dependency FastAPI dan entrypoint `main.py`. Tidak perlu menjalankan `setup_windows.bat` di Vercel.
5. Isi Environment Variables dari bagian C.
6. Pastikan domain Preview/Production ditambahkan ke Allowed Origins Storage Supabase.
7. Deploy sebagai Preview terlebih dahulu, uji alur login Guru, penyimpanan pantun/progres, kamera, dan upload video.
8. Setelah semua konfigurasi dan pengujian lolos, merge/push ke branch produksi `main`.

`main.py` adalah entrypoint ASGI FastAPI yang dikenali Vercel. `vercel.json` menyertakan aset `app/static/**` ke function. `.python-version` dan `pyproject.toml` mem-pin Python 3.12 untuk deployment. `requirements.txt` sengaja hanya berisi dependency server; OpenCV/MediaPipe Python ada di `requirements-local.txt` dan tidak dibawa ke function Vercel. Kamera online memakai JavaScript browser. Vercel mendeteksi entrypoint FastAPI standar dan membaca versi Python dari konfigurasi proyek; dokumentasi resminya menjelaskan dukungan Python Runtime dan konfigurasi file yang disertakan. [Vercel FastAPI](https://vercel.com/i/what-is-fastapi) · [Python Runtime](https://vercel.com/docs/functions/runtimes/python).

### Catatan audio untuk repository publik

File MP3 yang diberikan pengguna ikut berada di paket ZIP lokal, tetapi `app/static/audio/*.mp3` sengaja diabaikan oleh Git sampai izin distribusi/hosting publiknya dipastikan. Nama file yang menyebut “No Copyright” saja belum menjadi bukti lisensi. Jika izin penggunaan publik sudah jelas, hapus aturan tersebut dari `.gitignore`, lalu tambahkan file MP3 ke repository dan deploy ulang. Alternatif untuk menambahkannya tanpa menghapus aturan ignore adalah `git add -f app/static/audio/betawi-background.mp3`, tetapi lakukan hanya setelah izin distribusi tertulis/terverifikasi. Tanpa langkah itu, mode lokal tetap memiliki musik, sedangkan deployment GitHub/Vercel tidak akan menyertakan MP3 tersebut.

## E. Perbedaan penyimpanan lokal dan online

| Bagian | VS Code lokal | Vercel online |
|---|---|---|
| Profil, progres, pantun | JSON lokal | Supabase Postgres |
| Video Paspor | Folder `app/data/performances/` | Supabase Storage privat |
| Webcam | Browser (default) | Browser pengunjung |
| PIN Guru | Demo lokal `2468` jika belum diatur | Wajib `NADI_GURU_PIN` |
| Session secret | Demo lokal | Wajib `NADI_SESSION_SECRET` minimal 32 karakter |

Cookie peserta adalah identitas anonim pada browser tersebut. Jika cookie dihapus atau pengguna berganti browser/perangkat, data anonim tidak otomatis ikut pindah. Untuk akun lintas perangkat, V10 masih perlu integrasi login peserta tersendiri.

Data lokal dari V9 tidak otomatis dipindahkan ke Supabase saat deploy. Lakukan ekspor/backup dan proses migrasi secara terkontrol jika data penelitian ingin dipertahankan.

## F. Privasi, keamanan, dan batasan penelitian

- Webcam dan model pelacakan pada mode browser berjalan pada perangkat pengunjung. Izin kamera/mikrofon diminta oleh browser.
- Rekaman tidak diunggah otomatis. Upload hanya terjadi setelah pengguna memilih **Simpan ke Paspor Budaya**.
- Video online disimpan pada bucket privat dan diputar menggunakan signed URL berumur terbatas.
- Jangan merekam orang lain tanpa persetujuan mereka. Sediakan pilihan latihan tanpa rekaman.
- PIN Guru lokal `2468` hanya untuk demo lokal. Ganti sebelum pengambilan data; di Vercel wajib mengatur secret tersendiri.
- Filter/aksesori dan urutan gerak masih prototipe ilustratif. Praktisi Betawi/Gambang Rancag harus menelaah aksesori, panduan tari, rubrik, dan indikator sebelum dianggap mewakili praktik autentik atau menjadi instrumen penelitian.
- Skor otomatis adalah umpan balik latihan, bukan hasil validasi kompetensi.
- V10 adalah release candidate untuk diuji. Lakukan uji perangkat nyata, beban kamera, aksesibilitas, dan keamanan sebelum mengumpulkan data sensitif atau membuka akses publik luas.

## G. File penting

- `main.py` — Vercel ASGI entrypoint.
- `app/main.py` — FastAPI API.
- `app/cloud_store.py` — adapter server-side Supabase REST/Storage.
- `app/static/` — UI, logo, musik, dan kamera browser.
- `supabase/schema.sql` — schema database dan bucket privat.
- `ASSET_SOURCES.md` — inventaris sumber dan status lisensi aset.
- `DEPLOYMENT_CHECKLIST.md` — checklist rilis GitHub/Vercel.
- `SECURITY.md` — catatan keamanan sebelum publikasi.
- `.env.example` — daftar environment variables tanpa secret.
- `requirements.txt` — dependencies deployment.
- `requirements-local.txt` — dependencies untuk VS Code/local.
- `NADI_BUDAYA_V10.zip` — paket proyek yang dibagikan.
