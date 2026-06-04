import fs from 'fs';
import path from 'path';

/**
 * Parses image buffer headers to extract dimensions and mime type.
 * Supported formats: PNG, JPEG, BMP.
 * @param {Buffer} buf - The image file buffer
 * @returns {object|null} { width, height, mime } or null if unsupported/failed
 */
export function parseImageHeaders(buf) {
  if (!buf || buf.length < 24) return null;

  // 1. PNG Check
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4E &&
    buf[3] === 0x47 &&
    buf[4] === 0x0D &&
    buf[5] === 0x0A &&
    buf[6] === 0x1A &&
    buf[7] === 0x0A
  ) {
    // PNG IHDR chunk usually starts at offset 12 with length 13.
    // Confirm 'IHDR' magic bytes at offset 12
    if (buf.readUInt32BE(12) === 0x49484452) {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      return { width, height, mime: 'image/png' };
    }
  }

  // 2. BMP Check
  if (buf[0] === 0x42 && buf[1] === 0x4D) {
    // BMP dimensions reside at offset 18 (width) and 22 (height)
    const width = buf.readInt32LE(18);
    const height = Math.abs(buf.readInt32LE(22)); // height can be negative for top-down BMP
    return { width, height, mime: 'image/bmp' };
  }

  // 3. JPEG Check
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 8) {
      if (buf[i] === 0xff) {
        const marker = buf[i + 1];
        // SOF0 (Start of Frame 0, baseline DCT) or SOF2 (progressive DCT)
        if (marker === 0xc0 || marker === 0xc2) {
          const height = buf.readUInt16BE(i + 5);
          const width = buf.readUInt16BE(i + 7);
          return { width, height, mime: 'image/jpeg' };
        }
        i += 2 + buf.readUInt16BE(i + 2); // skip segment
      } else {
        i++;
      }
    }
  }

  return null;
}

/**
 * Validates a local image file for production-quality constraints before conversion.
 * @param {string} filePath - Absolute path to local file
 * @returns {object} { passed: boolean, mime?: string, width?: number, height?: number, error?: string, wasResized?: boolean }
 */
export function validateImagePreflight(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { passed: false, error: 'File gambar tidak ditemukan pada disk.' };
    }

    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);

    // Guard: Max image size 5MB
    if (fileSizeMB > 5.0) {
      return { passed: false, error: `Ukuran file gambar terlalu besar (${fileSizeMB.toFixed(2)}MB). Maksimal 5MB.` };
    }

    // Read first 10KB to parse headers (in case of large JPEG headers)
    const fd = fs.openSync(filePath, 'r');
    const headerBuf = Buffer.alloc(10240);
    const bytesRead = fs.readSync(fd, headerBuf, 0, 10240, 0);
    fs.closeSync(fd);

    const parsed = parseImageHeaders(headerBuf.subarray(0, bytesRead));
    if (!parsed) {
      return { passed: false, error: 'Tipe file gambar tidak dikenali. Wajib PNG atau JPEG.' };
    }

    const { width, height, mime } = parsed;

    // Validate dimensions >= 256px
    if (width < 256 || height < 256) {
      return { 
        passed: false, 
        error: `Resolusi gambar terlalu rendah (${width}x${height}px). Resolusi minimal wajib 256x256px.` 
      };
    }

    // Resizing/Compression Guard: if > 1.5MB or extremely large dimensions, flag for resizing log
    let wasResized = false;
    if (fileSizeMB > 1.5 || width > 1024 || height > 1024) {
      wasResized = true; // Simulating resizing preflight action
    }

    return {
      passed: true,
      mime,
      width,
      height,
      wasResized
    };
  } catch (err) {
    return { passed: false, error: `Gagal membaca header gambar: ${err.message}` };
  }
}
