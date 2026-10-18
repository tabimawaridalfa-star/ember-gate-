# Integrasi aset baru — selesai

Delapan poin pemasangan sudah diterapkan dan diverifikasi. Pada kelanjutan terakhir,
perbaikan source hanya pada waktu tunggu cooldown di gameplay.test.mjs; kode gameplay
hasil pekerjaan sebelumnya dipertahankan. Bundle offline dibangun ulang.

## File yang berubah selama integrasi

- js/actors.js (baru): pemilihan frame JSON, durasi attack 0,22 detik, pengukuran badan,
  baseline/pivot, renderer aktor, serta penempatan slash per frame.
- js/player.js: state attack di darat/udara; tetap 56×56 pada x−16, y−6; knockback.
- js/world.js: hitbox hanya frame aktif 2; zombie/slime; state machine bos dan animasi
  kematian; checkpoint/segel/ramuan/dash tetap ada; save v3 dan migrasi v2.
- js/main.js: memakai sprite baru, menghapus pedang/busur prosedural, debug F3, save v3.
- js/assets.js: daftar 18 aset, termasuk enam sheet baru.
- js/level.js: area tempur aman pertama di Embers; duri/api setelahnya tetap ada.
- index.html: petunjuk F3.
- gameplay.test.mjs: tes regresi combat, AI, animasi, penyimpanan, dan keterjangkauan arena.
- build.mjs: memasukkan modul actors dan memakai daftar aset yang sama dengan loader.
- MAIN-KLIK-DUA-KALI.html: bundle offline terbaru.
- README.md dan INTEGRATION.md: petunjuk/status integrasi.

Aset PNG/JSON, audio.js, camera.js, dan check.mjs tidak diubah.
Skulls lama hanya tetap sebagai dekorasi latar, bukan musuh atau bos.

## Validasi

1. node check.mjs — PASS.
2. node gameplay.test.mjs — PASS, termasuk semua 15 permukaan arena terjangkau.
3. node build.mjs — berhasil membuat HTML offline.
4. Chrome offline — 18 aset termuat, keyboard attack, F3, tujuh state bos,
   gerbang menunggu death, ending/replay, save v3/reload; tanpa error JS/jaringan.

Skenario bos/ending pada pengujian browser memakai fixture untuk mencapai keadaan
tersebut; ini bukan klaim playthrough manual seluruh kampanye.

## Batas yang masih ada

- Gait zombie dan beberapa transisi telegraph/charge tetap mengikuti kualitas sheet
  yang ada; gerakannya belum sehalus animasi yang digambar ulang oleh pixel artist.
- Hitbox memakai persegi badan yang diukur per pose, bukan collision per piksel.
- Balance empat musuh baru dan charge bos masih dapat disempurnakan dari pengalaman
  bermain nyata. Tes memeriksa mekanik dan ruang aman, bukan menggantikan playtest.
- Migrasi mempertahankan progres utama v2, tetapi ID tengkorak numerik tidak diterapkan
  pada zombie/slime baru; musuh baru muncul kembali. Ini mencegah ID salah tersimpan.

F3: pemain biru, musuh hijau, bos ungu, serangan aktif merah, proyektil kuning.
Hitbox serangan tidak muncul pada fase antisipasi/pemulihan.
