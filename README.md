# Flow Video Prompt Builder

Web app statis tanpa AI dan tanpa API untuk membaca metadata dasar video secara lokal di browser, lalu membuat JSON instruksi reference video.

## Menjalankan secara lokal

Buka `index.html` di browser, pilih video, lalu salin atau unduh JSON. Tidak ada file video yang dikirim ke server.

Jika browser membatasi fitur tertentu saat membuka file lokal, jalankan server statis sederhana:

```bash
python3 -m http.server 8000
```

Kemudian buka <http://localhost:8000>.

## Deploy dengan GitHub Pages

1. Push isi proyek ini ke repository GitHub.
2. Buka **Settings → Pages**.
3. Pada **Build and deployment**, pilih **Deploy from a branch**.
4. Pilih branch `main` dan folder `/ (root)`.
5. Klik **Save**, lalu tunggu URL Pages tersedia.

## Batasan

Aplikasi hanya membaca metadata video melalui elemen video HTML5. Tanpa AI, aplikasi tidak memahami isi adegan atau narasi dan tidak dapat menjamin hasil regenerasi Google Flow identik. Untuk mempertahankan visual yang sama, gunakan video asli sebagai reference di Flow. Untuk gambar yang benar-benar tidak berubah, pertahankan video asli dan edit audionya saja.
