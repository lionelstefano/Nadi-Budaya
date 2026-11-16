# Security Notes — Nadi Budaya V10

## Sebelum deployment publik

- Jangan commit `.env`, token Supabase, `NADI_SESSION_SECRET`, atau `NADI_GURU_PIN`.
- Gunakan `SUPABASE_SECRET_KEY` hanya pada backend/Vercel Environment Variables. Jangan gunakan secret/service-role key di browser.
- Jalankan `supabase/schema.sql`; pastikan bucket `nadi-performances` private.
- Set `NADI_SESSION_SECRET` acak, minimal 32 karakter.
- Set `NADI_GURU_PIN` yang kuat (minimal 8 karakter); jangan gunakan PIN lokal demo `2468`.
- Konfigurasi Allowed Origins/CORS Storage Supabase hanya untuk domain website yang benar.
- Uji isolasi cookie peserta, akses Guru, penyimpanan, playback, dan penghapusan video pada Preview Deployment.
- Atur rate limiting / firewall untuk endpoint autentikasi Guru di platform hosting sebelum akses publik luas.
- Jangan mengunggah video atau data peserta nyata ke GitHub. Persetujuan peserta/wali dan kebijakan retensi harus disiapkan sebelum pengumpulan data.

## Penyimpanan

Mode lokal menyimpan data pada JSON dan file dalam folder proyek. Mode Vercel mengharuskan Supabase; bila kredensial cloud tidak tersedia, endpoint mutasi akan gagal secara eksplisit dan tidak menulis ke filesystem sementara.

## Pelaporan masalah

Jangan menyertakan secret, PIN, cookie sesi, rekaman peserta, atau data pribadi ketika membagikan log. Hapus/redaksi nilai sensitif terlebih dahulu.
