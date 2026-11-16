# Checklist Deploy Publik Nadi Budaya V10

## Sebelum push GitHub

- [ ] Repository dibuat Private untuk review awal.
- [ ] `git status` tidak menampilkan `.env`, `.venv`, JSON lokal, folder video, atau data peserta.
- [ ] MP3 tidak masuk Git sampai izin distribusi dikonfirmasi.
- [ ] Tidak ada secret, PIN, cookie, token, atau URL signed dalam source code.
- [ ] `python -m unittest discover -s tests -v` lulus.
- [ ] `node --check app/static/app.js` lulus.
- [ ] `node --check app/static/browser_camera.js` lulus.

## Supabase

- [ ] Proyek Supabase dibuat pada region yang dekat dengan target deployment/pengguna.
- [ ] `supabase/schema.sql` dijalankan.
- [ ] Tabel `nadi_participant_states` tersedia dan RLS aktif.
- [ ] Bucket `nadi-performances` bersifat private dan batas 20 MB.
- [ ] Allowed Origins/CORS Storage mengizinkan domain Preview dan Production Vercel.
- [ ] Secret key hanya berada di environment backend Vercel.

## Vercel Environment Variables

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SECRET_KEY` (server-side only)
- [ ] `SUPABASE_STORAGE_BUCKET=nadi-performances`
- [ ] `NADI_SESSION_SECRET` (acak, minimal 32 karakter)
- [ ] `NADI_GURU_PIN` (unik, minimal 8 karakter; bukan PIN demo)
- [ ] `NADI_CAMERA_BACKEND=browser`

## Preview Deployment

- [ ] `/api/health` mengembalikan versi `10.0.0`.
- [ ] `storage_ready`, `security_ready`, dan `teacher_auth_ready` bernilai true.
- [ ] Webcam meminta izin melalui HTTPS dan berjalan di browser pengunjung.
- [ ] TTS, musik, reduced motion, keyboard navigation, serta screen reader diuji.
- [ ] Data peserta berbeda tidak saling terlihat.
- [ ] Guru dapat masuk; endpoint penilaian ditolak tanpa sesi guru.
- [ ] Pantun dan progres bertahan setelah refresh dan login dari browser yang sama.
- [ ] Rekaman diunggah hanya setelah persetujuan pengguna, masuk ke bucket private, bisa diputar, dan dapat dihapus.
- [ ] Penghapusan metadata juga menghapus objek Storage terkait.
- [ ] Kamera, rekaman, dan tampilan diuji pada laptop/ponsel nyata.

## Sebelum Production

- [ ] Praktisi menelaah materi, aksesori, koreografi, dan rubrik.
- [ ] Hak musik, video, logo, ilustrasi, dan model diperiksa.
- [ ] Persetujuan peserta/wali, privasi, masa simpan, dan prosedur penghapusan data ditetapkan.
- [ ] Backup database dan prosedur pemulihan diuji.
- [ ] Firewall/rate limiting diterapkan pada autentikasi Guru.
- [ ] Preview Deployment disetujui sebelum merge/push ke branch production.
