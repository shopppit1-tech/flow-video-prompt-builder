import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 8765);
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
const API_BASE = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  ? process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta/openai/'
  : process.env.OPENAI_API_BASE || 'https://api.openai.com/v1').replace(/\/$/, '');
const MODEL = process.env.VISION_MODEL || 'gpt-4o-mini';
const MAX_BODY = 24 * 1024 * 1024;

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    source_file: { type: 'string' },
    analysis_note: { type: 'string' },
    reference_video_required: { type: 'boolean' },
    global_style: { type: 'object', additionalProperties: false, properties: {
      visual_style: { type: 'string' }, color_palette: { type: 'string' }, lighting: { type: 'string' }, pacing: { type: 'string' }, aspect_ratio: { type: 'string' }
    }, required: ['visual_style','color_palette','lighting','pacing','aspect_ratio'] },
    scenes: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      scene_number: { type: 'integer' }, start_time_seconds: { type: 'number' }, end_time_seconds: { type: 'number' }, visual_description: { type: 'string' }, subjects: { type: 'string' }, action_and_motion: { type: 'string' }, camera: { type: 'string' }, lighting_and_color: { type: 'string' }, environment: { type: 'string' }, audio_and_dialogue: { type: 'string' }, continuity_constraints: { type: 'string' }, flow_prompt: { type: 'string' }, generic_video_ai_prompt: { type: 'string' }, negative_prompt: { type: 'string' }
    }, required: ['scene_number','start_time_seconds','end_time_seconds','visual_description','subjects','action_and_motion','camera','lighting_and_color','environment','audio_and_dialogue','continuity_constraints','flow_prompt','generic_video_ai_prompt','negative_prompt'] } },
    flow_prompt: { type: 'string' }, generic_video_ai_prompt: { type: 'string' }, negative_prompt: { type: 'string' }, audio_note: { type: 'string' }
  }, required: ['source_file','analysis_note','reference_video_required','global_style','scenes','flow_prompt','generic_video_ai_prompt','negative_prompt','audio_note']
};

function send(res, status, data, type = 'application/json') { res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(data) : data); }
function readBody(req) { return new Promise((resolve, reject) => { let size = 0, chunks = []; req.on('data', chunk => { size += chunk.length; if (size > MAX_BODY) { reject(new Error('Request terlalu besar. Kurangi jumlah atau kualitas frame.')); req.destroy(); } else chunks.push(chunk); }); req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('Body JSON tidak valid.')); } }); req.on('error', reject); }); }
function promptFor(body) { return `You are an expert video continuity analyst. Analyze the supplied video reference frames in chronological order. Infer only what is visible or reasonably supported; mark uncertain audio as unknown. The goal is to create editable prompts for Google Flow and other AI video generators, not to claim pixel-identical reproduction. Preserve identity, wardrobe, spatial layout, action order, camera movement, lens feel, lighting, color, timing, and continuity. Return JSON matching the supplied schema. Use the frame timestamps to estimate scene boundaries. Write prompts in English because most video models perform better with English.\n\nSource metadata: ${JSON.stringify(body.source_metadata)}\nSource file: ${body.source_file}\n\nImportant: set reference_video_required=true. Include a limitation in analysis_note that prompts cannot guarantee identical pixels and the original video should be uploaded as reference when supported.`; }
async function analyze(body) {
  if (!API_KEY) throw new Error('OPENAI_API_KEY belum dikonfigurasi di server.');
  if (!body?.frames?.length) throw new Error('Tidak ada frame untuk dianalisis.');
  const content = [{ type: 'text', text: promptFor(body) }, ...body.frames.map(frame => ({ type: 'text', text: `Frame timestamp: ${frame.time_seconds}s` })).concat(body.frames.map(frame => ({ type: 'image_url', image_url: { url: frame.image_data_url, detail: 'low' } })) )];
  const response = await fetch(`${API_BASE}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` }, body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: 'Output valid JSON only. Do not invent details not supported by the frames. Follow this JSON shape: source_file, analysis_note, reference_video_required, global_style, scenes, flow_prompt, generic_video_ai_prompt, negative_prompt, audio_note.' }, { role: 'user', content }], temperature: 0.2, max_tokens: 6000, response_format: { type: 'json_object' } }) });
  const raw = await response.text(); let result; try { result = JSON.parse(raw); } catch { throw new Error(`Respons AI bukan JSON (${response.status}).`); }
  if (!response.ok) throw new Error(result.error?.message || `AI request gagal (${response.status}).`);
  const message = result.choices?.[0]?.message || {};
  const text = Array.isArray(message.content) ? message.content.map(part => part.text || '').join('') : message.content || message.output_text;
  if (!text) throw new Error(message.refusal || `AI tidak mengembalikan analisis teks (finish_reason: ${result.choices?.[0]?.finish_reason || 'unknown'}). Pastikan VISION_MODEL mendukung input gambar/vision.`);
  const cleaned = String(text).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try { return JSON.parse(cleaned); } catch { throw new Error('AI mengembalikan JSON yang tidak valid. Coba model vision lain melalui VISION_MODEL.'); }
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.md': 'text/markdown', '.json': 'application/json', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/analyze') return send(res, 200, await analyze(await readBody(req)));
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method tidak didukung.' });
    const requested = decodeURIComponent((req.url || '/').split('?')[0]); const safe = normalize(requested === '/' ? '/index.html' : requested); const file = join(ROOT, safe);
    if (!file.startsWith(ROOT)) return send(res, 403, { error: 'Forbidden.' });
    const data = await readFile(file); res.writeHead(200, { 'Content-Type': `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8` }); if (req.method === 'GET') res.end(data); else res.end();
  } catch (error) { send(res, error.message.includes('Request terlalu besar') ? 413 : 500, { error: error.message || 'Server error.' }); }
});
server.listen(PORT, () => console.log(`Video-to-Prompt Analyzer berjalan di http://localhost:${PORT}`));
