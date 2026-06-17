// One-off generator for PWA icons. Produces solid-background PNGs with a "%" glyph block.
// Run: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
}

function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(size, draw) {
    const bg = [15, 23, 42]; // #0f172a
    const fg = [56, 189, 248]; // #38bdf8
    const bytesPerPixel = 3;
    const stride = size * bytesPerPixel + 1;
    const raw = Buffer.alloc(stride * size);
    for (let y = 0; y < size; y++) {
        raw[y * stride] = 0; // filter type none
        for (let x = 0; x < size; x++) {
            const on = draw(x, y, size);
            const [r, g, b] = on ? fg : bg;
            const off = y * stride + 1 + x * bytesPerPixel;
            raw[off] = r;
            raw[off + 1] = g;
            raw[off + 2] = b;
        }
    }
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // color type RGB
    const idat = deflateSync(raw);
    return Buffer.concat([
        sig,
        chunk('IHDR', ihdr),
        chunk('IDAT', idat),
        chunk('IEND', Buffer.alloc(0))
    ]);
}

// Draw two diagonal-corner dots and a slash to evoke a "%" sign.
function percentGlyph(x, y, size) {
    const u = x / size;
    const v = y / size;
    const r = 0.13;
    const d1 = Math.hypot(u - 0.3, v - 0.3) < r;
    const d2 = Math.hypot(u - 0.7, v - 0.7) < r;
    const slash = Math.abs(u + v - 1) < 0.09 && u > 0.2 && u < 0.8;
    return d1 || d2 || slash;
}

mkdirSync('public', { recursive: true });
for (const size of [192, 512]) {
    const png = makePng(size, percentGlyph);
    writeFileSync(`public/pwa-${size}x${size}.png`, png);
    console.log(`wrote public/pwa-${size}x${size}.png (${png.length} bytes)`);
}
