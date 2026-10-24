# Gembulnime · Nonton Anime Sub Indo

Frontend streaming anime (vanilla HTML/CSS/JS) di atas [wajik-anime-api](https://github.com/wajik45/wajik-anime-api), sumber Otakudesu.

## Jalankan

```sh
npm run setup   # install dependensi API (sekali saja)
npm start       # API di :3001 + website di http://localhost:5173
```

## Fitur

- Data AniList dicari pakai judul Jepang dulu, lalu judul biasa / tanpa "Season N" / sebelum ":" (ejaan Otakudesu sering beda). Kalau satu trailer menolak di-embed, trailer cadangan dicoba. Disimpan 12 jam di browser
- Halaman detail: trailer di latar, banner AniList, warna khas anime, hitung mundur episode berikutnya (jam tayang Jepang), tombol "Tonton trailer" (modal bersuara, Esc untuk tutup)
- Desktop: kursor diam di kartu anime 0,65 detik memunculkan pratinjau (trailer, skor, genre, sinopsis, tombol tonton/detail/simpan)
- Trailer resmi (YouTube, ID dari AniList) diputar di latar hero tanpa suara; selesai = lanjut ke anime berikutnya. Ada tombol jeda/putar dan suara. Tanpa trailer, slide pindah tiap 7 detik. Selalu mulai otomatis; tombol jeda berlaku sampai beranda ditinggal
- Hero slider anime ongoing dengan strip thumbnail (klik, panah kiri/kanan, swipe di HP; berhenti saat kursor/fokus di atasnya)
- Pencarian langsung dengan saran berposter, riwayat pencarian, navigasi keyboard (tekan `/`)
- Ongoing dengan filter hari rilis, Tamat, Jadwal per hari (favorit ditandai dan diurutkan ke atas), Genre
- Detail anime: daftar episode (sudah ditonton / terakhir ditonton), filter + urutan, simpan, bagikan link
- Player: auto-pilih server yang bisa di-embed dan ingat server terakhir yang berhasil, mode bioskop, download
- Pintasan di halaman nonton: `N` episode berikutnya, `P` sebelumnya, `T` mode bioskop, `Esc` keluar
- Koleksi: tab Favorit / Riwayat, hapus per judul dengan tombol Urungkan
- HP: tab bar bawah, tap target minimal 44px, tanpa scroll horizontal

## Sumber kedua: Samehadaku

- Lewat Sanka API: `/anime/samehadaku/home`, `/search?q=`, `/anime/:id`, `/episode/:id`, `/server/:serverId` (url mirror diambil saat tombol server ditekan)
- Pencarian menampilkan hasil Otakudesu lalu bagian "Dari Samehadaku" (hasil episode digabung per seri); beranda punya baris "Rilis terbaru di Samehadaku"
- Halaman seri `#/op/anime/<animeId>` dan nonton `#/op/watch/<episodeId>`. Riwayat & favorit bisa campur dua sumber (id diawali `op:`, entri riwayat Samehadaku punya `src: "sh"`)
- Entri riwayat Oploverz lama (`op:` tanpa `src`) otomatis dipindah ke Otakudesu kalau judul & nomor episodenya ketemu

## Episode yang hilang di Otakudesu

- Kalau nomor episode Otakudesu meloncat (mis. One Piece 201–900), daftar episode menampilkan kotak "Episode X–Y sedang dalam tahap pengerjaan"
- Celah sengaja tidak diisi dari sumber lain: server Samehadaku/Stream untuk episode lama sering mati, dan embed Sankanime (babastream) mengalihkan ke situs iklan
- Halaman nonton Stream (`#/st/watch/<slug>`) tetap ada supaya entri riwayat lama berawalan `st:` masih bisa dibuka
- Jangan memanggil URL tebakan di sankavollerei.web.id: detektor "Plana AI" mengancam ban IP 30 menit. Daftar endpoint ada di halaman https://www.sankavollerei.web.id/anime (buka lewat browser)

## Komik

- Tab "Komik" (`#/comic`) memakai Sanka Comic API (`https://www.sankavollerei.web.id/comic`, sumber Komiku): `/trending`, `/terbaru`, `/populer`, `/search?q=`, `/genres`, `/genre/:g`, `/comic/:slug`, `/chapter/:slug`
- Rute: `#/comic`, `#/comic/terbaru`, `#/comic/populer`, `#/comic/genre/<g>`, `#/comic/search?q=`, detail `#/comic/d/<slug>`, baca `#/comic/read/<chapterSlug>` (pintasan N/P)
- Di bagian komik, kolom cari di nav mencari komik. Riwayat baca ("Lanjut baca") tersimpan di `kaze_comic_history`
- Gambar chapter dimuat langsung dari Komiku; kalau gagal, otomatis lewat `imagesproxy` Sanka

## Catatan

- Server `odcdn` / `odstream` / `ondesuhd` (desustream) memblokir embed di luar domain otakudesu (CSP `frame-ancestors`). Player otomatis pakai `vidhide` / `mega`.
- Domain sumber sering ganti. Update di `api/src/configs/otakudesu.config.ts`, lalu `npm --prefix api run build` (atau edit langsung `api/dist/configs/otakudesu.config.js`).
- Kalau API di-deploy ke tempat lain, ganti alamatnya di `assets/js/config.js`.
