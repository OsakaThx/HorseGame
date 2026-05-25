// Auto-detecta y recorta cada pieza individual de botones.png
// Uso: node tools/crop_botones.mjs
// Sin dependencias externas: usa el módulo zlib + parser PNG manual minimalista
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const SRC = 'assets/botones/botones.png';
const OUT_DIR = 'assets/botones';

// ---------- PNG parser/encoder minimal (RGBA 8-bit) ----------
function parsePNG(buf) {
    if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('No PNG');
    let p = 8;
    let width=0, height=0, bitDepth=0, colorType=0, idat = [];
    while (p < buf.length) {
        const len = buf.readUInt32BE(p); p += 4;
        const type = buf.slice(p, p+4).toString('ascii'); p += 4;
        const data = buf.slice(p, p+len); p += len + 4; // skip CRC
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            bitDepth = data[8]; colorType = data[9];
        } else if (type === 'IDAT') {
            idat.push(data);
        } else if (type === 'IEND') break;
    }
    if (bitDepth !== 8) throw new Error('Solo 8-bit soportado, encontrado: ' + bitDepth);
    if (colorType !== 6 && colorType !== 2) throw new Error('Solo RGBA(6) o RGB(2) soportado, encontrado: ' + colorType);
    const channels = colorType === 6 ? 4 : 3;
    const inflated = zlib.inflateSync(Buffer.concat(idat));
    // Defilter
    const stride = width * channels;
    const pixels = Buffer.alloc(stride * height);
    let prev = Buffer.alloc(stride);
    let off = 0;
    for (let y = 0; y < height; y++) {
        const filter = inflated[off++];
        const row = inflated.slice(off, off + stride);
        off += stride;
        const out = Buffer.alloc(stride);
        for (let x = 0; x < stride; x++) {
            const a = x >= channels ? out[x - channels] : 0;
            const b = prev[x];
            const c = x >= channels ? prev[x - channels] : 0;
            let val = row[x];
            switch (filter) {
                case 0: break;
                case 1: val = (val + a) & 0xff; break;
                case 2: val = (val + b) & 0xff; break;
                case 3: val = (val + Math.floor((a + b) / 2)) & 0xff; break;
                case 4: {
                    const p0 = a + b - c;
                    const pa = Math.abs(p0 - a), pb = Math.abs(p0 - b), pc = Math.abs(p0 - c);
                    const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
                    val = (val + pr) & 0xff;
                    break;
                }
                default: throw new Error('Filtro desconocido: ' + filter);
            }
            out[x] = val;
        }
        out.copy(pixels, y * stride);
        prev = out;
    }
    // Si es RGB sin alpha, agregar alpha=255
    if (channels === 3) {
        const rgba = Buffer.alloc(width * height * 4);
        for (let i = 0, j = 0; i < pixels.length; i += 3, j += 4) {
            rgba[j]   = pixels[i];
            rgba[j+1] = pixels[i+1];
            rgba[j+2] = pixels[i+2];
            rgba[j+3] = 255;
        }
        return { width, height, pixels: rgba };
    }
    return { width, height, pixels };
}

function encodePNG(width, height, pixels) {
    // RGBA 8-bit
    const stride = width * 4;
    // Add filter byte 0 per scanline
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0;
        pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    const compressed = zlib.deflateSync(raw, { level: 9 });
    const chunks = [];
    function pushChunk(type, data) {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
        const t = Buffer.from(type, 'ascii');
        const crc = crc32(Buffer.concat([t, data]));
        const c = Buffer.alloc(4); c.writeUInt32BE(crc, 0);
        chunks.push(len, t, data, c);
    }
    // CRC32
    const crcTable = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            t[n] = c;
        }
        return t;
    })();
    function crc32(buf) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }
    chunks.push(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    pushChunk('IHDR', ihdr);
    pushChunk('IDAT', compressed);
    pushChunk('IEND', Buffer.alloc(0));
    return Buffer.concat(chunks);
}

// ---------- Detección ----------
const buf = fs.readFileSync(SRC);
const img = parsePNG(buf);
console.log(`Imagen: ${img.width}x${img.height}`);

const W = img.width, H = img.height;
const px = img.pixels;
function hasContent(x, y) {
    const i = (y * W + x) * 4;
    const a = px[i + 3];
    if (a < 30) return false;
    return (px[i] + px[i+1] + px[i+2]) > 90;
}
function rowHas(y) { for (let x = 0; x < W; x++) if (hasContent(x, y)) return true; return false; }
function colHas(x, y1, y2) { for (let y = y1; y < y2; y++) if (hasContent(x, y)) return true; return false; }

// Bandas horizontales
const bands = [];
let inB = false, sy = 0;
for (let y = 0; y < H; y++) {
    const has = rowHas(y);
    if (has && !inB) { sy = y; inB = true; }
    else if (!has && inB) { if (y - 1 - sy >= 25) bands.push([sy, y - 1]); inB = false; }
}
if (inB) bands.push([sy, H - 1]);
console.log(`Bandas: ${bands.length}`);

// Piezas por banda
let idx = 0;
const pieces = [];
for (const [y1, y2e] of bands) {
    const y2 = y2e + 1;
    let inO = false, sx = 0;
    for (let x = 0; x < W; x++) {
        const has = colHas(x, y1, y2);
        if (has && !inO) { sx = x; inO = true; }
        else if (!has && inO) {
            const w = x - sx, h = y2 - y1;
            if (w >= 30) pieces.push({ x: sx, y: y1, w, h });
            inO = false;
        }
    }
    if (inO) pieces.push({ x: sx, y: y1, w: W - sx, h: y2 - y1 });
}
console.log(`Piezas: ${pieces.length}`);

// Recortar y guardar
fs.mkdirSync(OUT_DIR, { recursive: true });
pieces.forEach((p, i) => {
    const out = Buffer.alloc(p.w * p.h * 4);
    for (let y = 0; y < p.h; y++) {
        const srcOff = ((p.y + y) * W + p.x) * 4;
        const dstOff = y * p.w * 4;
        img.pixels.copy(out, dstOff, srcOff, srcOff + p.w * 4);
    }
    const png = encodePNG(p.w, p.h, out);
    const name = `piece_${String(i).padStart(3,'0')}_${p.w}x${p.h}_y${p.y}_x${p.x}.png`;
    fs.writeFileSync(path.join(OUT_DIR, name), png);
});
console.log(`Guardadas ${pieces.length} piezas en ${OUT_DIR}/`);
console.log('Tamaños:', pieces.map(p => `${p.w}x${p.h}@(${p.x},${p.y})`).join('\n  '));
