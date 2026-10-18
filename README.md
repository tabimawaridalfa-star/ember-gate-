# Ember Gate — The Last Flame

Game platformer aksi 2D bertema fantasy dungeon oleh **Alfa Tabi Mawarid**, dikembangkan melalui iterasi bersama asisten AI. Jelajahi empat kawasan, kumpulkan tiga segel, kalahkan Ash Warden, lalu buka gerbang terakhir.

## Fitur

- Empat kawasan dalam satu kampanye: Ruins, Crossing, Embers, dan Warden.
- Animasi karakter, zombie, slime, serta bos Ash Warden.
- Serangan pedang, dash, ramuan, checkpoint, dan rintangan duri/api/lava.
- Mode Santai dan Normal.
- Musik serta efek suara prosedural melalui Web Audio, dimulai setelah pemain menekan tombol main.
- Simpan progres dan skor terbaik di browser, tanpa akun atau backend.
- Kontrol keyboard dan kontrol sentuh multitouch di atas kanvas.
- Mode HP landscape, jeda otomatis saat portrait, dan fullscreen jika browser mendukungnya.
- Kredit pembuat pada menu, footer, dan layar tamat.

## Menjalankan source

Pasang Node.js, buka terminal di folder proyek, lalu jalankan:

```sh
npm start
```

Buka alamat lokal yang dicetak server (`http://127.0.0.1:4173`). Tidak ada dependensi npm tambahan atau proses instalasi paket. Versi source memakai JavaScript modules sehingga sebaiknya dibuka melalui server, bukan klik ganda index.html.

## Kontrol

| Aksi | Keyboard |
| --- | --- |
| Jalan | A/D atau panah kiri/kanan |
| Lompat | Spasi, W, atau panah atas |
| Pedang | J atau X |
| Dash | Shift |
| Ramuan | E |
| Jeda | Esc atau tombol jeda |
| Hitbox debug | F3 |

Di HP, putar layar mendatar dan gunakan tombol sentuh. Fullscreen serta penguncian orientasi bergantung pada dukungan browser; kegagalan fitur tersebut tidak menghentikan game.

## Uji dan build offline

```sh
npm test
npm run build
```

Build membuat `MAIN-KLIK-DUA-KALI.html` dengan CSS, JavaScript, dan gambar tertanam. File tersebut dapat dibuka langsung atau disalin sebagai `index.html` untuk hosting statis. File hasil build diabaikan Git agar source tetap ringkas.

## Deploy ke Netlify

Untuk unggahan manual, gunakan paket Netlify terpisah: ekstrak lalu unggah folder yang langsung berisi `index.html`. Semua aset dan musik sudah tercakup; tidak perlu build di Netlify.

Jika menghubungkan repository ini langsung ke Netlify, kosongkan build command dan gunakan publish directory `.` (akar repository). Netlify dapat melayani versi source beserta folder js/ dan assets/.

## Struktur

- `index.html`, `style.css` — halaman dan antarmuka responsif.
- `js/` — pemain, level, kamera, aset, audio, aktor, dunia, visual, kontrol HP, dan logika utama.
- `assets/` — sprite PNG serta metadata JSON.
- `check.mjs`, `gameplay.test.mjs` — tes mekanik dan regresi gameplay.
- `build.mjs` — pembuat HTML offline.
- `INTEGRATION.md` — catatan integrasi aset dan batas validasi sebelumnya.

## Progres dan privasi

Progres disimpan lokal melalui localStorage. Melanjutkan dimulai dari checkpoint terakhir dengan nyawa penuh. Save tidak tersinkron antarperangkat, dan dapat hilang ketika data browser dibersihkan. Permainan tetap berjalan jika penyimpanan tidak tersedia. Game tidak memakai akun, analitik, atau layanan backend; hosting tetap menerima permintaan halaman biasa.

## Status validasi

Tes Node dan build diperiksa ulang saat pengemasan paket ini. Pada percakapan pengembangan, emulasi sentuh 844×390, 667×375, 932×430, dan portrait 390×844 dilaporkan lulus. Ini bukan pengujian baru pada HP fisik. Skenario bos/ending dalam pemeriksaan browser sebelumnya menggunakan fixture, bukan bukti playthrough manual penuh.

## Kredit dan aset

Konsep, arahan fitur, dan iterasi oleh Alfa Tabi Mawarid bersama asisten AI. Aset gambar disediakan dalam proyek pengguna; musik dan efek suara dibuat secara prosedural. Tidak ada lisensi baru yang ditetapkan untuk kode atau gambar dalam paket ini. Asal dan hak penggunaan gambar mengikuti materi sumber masing-masing.

URL demo dan repository akan ditambahkan setelah publikasi; belum ada tautan contoh yang dianggap aktif.
