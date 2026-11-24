# Video-to-Prompt Analyzer

Aplikasi ini menganalisis frame video dengan model AI vision dan menghasilkan JSON prompt terstruktur untuk Google Flow serta generator video AI lain. Aplikasi tidak hanya membaca durasi dan resolusi: frame video dikirim ke backend AI untuk menganalisis adegan, subjek, gerakan, kamera, pencahayaan, warna, lingkungan, audio yang terlihat/terindikasi, continuity, prompt per adegan, dan negative prompt.

## Cara menjalankan

Gunakan Node.js 18 atau lebih baru:

```bash
cp .env.example .env
# Isi OPENAI_API_KEY dan VISION_MODEL di .env
export OPENAI_API_KEY="..."
export VISION_MODEL="gpt-4o-mini"
npm start
```

Buka <http://localhost:8765>.

Server memakai API OpenAI-compatible. `OPENAI_API_BASE` dapat diarahkan ke provider lain yang mendukung input gambar dan JSON output. API key hanya dibaca oleh `server.mjs`; jangan pernah menaruhnya di `index.html`, JavaScript frontend, atau repository GitHub.

## Output JSON

JSON hasil berisi:

- `global_style`: gaya visual, palet warna, pencahayaan, pacing, dan rasio;
- `scenes`: analisis per adegan dengan timestamp, subjek, aksi, kamera, environment, audio, continuity, prompt Flow, prompt generik, dan negative prompt;
- `flow_prompt`: prompt gabungan untuk Google Flow;
- `generic_video_ai_prompt`: prompt gabungan untuk generator lain;
- `reference_video_required`: selalu `true`, karena prompt saja tidak dapat menjamin video identik;
- `analysis_note`: catatan ketidakpastian dan batasan hasil.

## Deploy

GitHub Pages hanya dapat menyajikan frontend statis dan **tidak boleh** menyimpan API key. Untuk memakai fitur AI, jalankan `server.mjs` pada hosting backend yang aman, lalu sesuaikan URL API pada frontend atau gunakan reverse proxy dengan route `/api/analyze`. Untuk demo tanpa backend, halaman tetap dapat dibuka tetapi tombol analisis tidak akan berhasil sampai backend dikonfigurasi.

## Batasan penting

Tidak ada generator video AI yang dapat menjamin hasil regenerasi piksel-per-piksel identik hanya dari prompt. Untuk hasil paling mirip, unggah video asli sebagai reference video pada Flow atau generator yang mendukung reference input. Prompt ini membantu menjaga identitas, urutan adegan, gerakan, kamera, warna, audio, dan continuity, tetapi bukan pengganti file reference.
