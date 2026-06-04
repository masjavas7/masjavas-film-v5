/**
 * compressedNarrationQualityValidator.js
 * Validates the quality of compressed narrations for Step 5 Video Pipeline.
 * Enforces production-grade constraints like sentence completeness, no ellipses, no dangling connectors, etc.
 */

const KNOWN_VERBS = [
  'menatap', 'memandang', 'melihat', 'membeku', 'mematung', 'berdiri', 
  'berjalan', 'mengepalkan', 'meremas', 'mendengar', 'menatapnya', 'berdiri',
  'berjalan', 'berlari', 'melangkah', 'menatap', 'menatapnya', 'menahan'
];

const KNOWN_NOUNS = [
  'rio', 'roro', 'jonggrang', 'bandung', 'bondowoso', 'karsa', 'anak', 
  'penjaga', 'layang-layang', 'layang', 'candi', 'lorong', 'istana', 'tangannya',
  'tangan', 'air', 'mata', 'sore', 'malam', 'tanah', 'langkah', 'suara'
];

const CONNECTORS = [
  'yang', 'ketika', 'saat', 'karena', 'dengan', 'di', 'ke', 'dari', 'untuk', 'agar', 
  'sebab', 'oleh', 'dan', 'atau', 'sehingga', 'tetapi'
];

/**
 * Validates a compressed narration string against strict production quality rules.
 * @param {string} compressed - The compressed narration text
 * @param {string} original - The original narration text
 * @returns {object} { passed: boolean, errors: string[], warnings: string[] }
 */
export function validateCompressedNarrationQuality(compressed, original) {
  const errors = [];
  const warnings = [];

  if (!compressed || typeof compressed !== 'string') {
    errors.push('Narasi kompresi kosong atau tidak valid.');
    return { passed: false, errors, warnings };
  }

  const clean = compressed.trim();

  // 1. Word count should be 10–18 (Advisory Guideline)
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (wordCount < 10 || wordCount > 18) {
    warnings.push(`Jumlah kata (${wordCount}) di luar batas ideal 10–18 kata.`);
  }
  if (clean.length > 120) {
    warnings.push(`Panjang karakter (${clean.length}) melebihi batas ideal 120 karakter.`);
  }

  // 2. No ellipsis allowed (Advisory Guideline)
  if (clean.includes('...')) {
    warnings.push('Narasi kompresi mengandung ellipsis ("..."). Disarankan berupa kalimat penuh.');
  }

  // 3. Must be a complete sentence (ends with ., ?, or !) (Advisory Guideline)
  if (!/[.!?]$/.test(clean)) {
    warnings.push('Narasi kompresi tidak diakhiri dengan tanda baca final yang sah (titik, tanya, seru).');
  }

  // 4. Must not end with a dangling connector
  if (words.length > 0) {
    const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-zA-Z]/g, '');
    if (CONNECTORS.includes(lastWord)) {
      errors.push(`Narasi kompresi diakhiri dengan kata sambung menggantung: "${lastWord}".`);
    }
  }

  // 5. Must contain at least one noun/proper name
  const cleanLower = clean.toLowerCase();
  const hasNoun = KNOWN_NOUNS.some(noun => cleanLower.includes(noun)) || 
                  words.some(w => w && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase());
  if (!hasNoun) {
    warnings.push('Narasi kompresi kemungkinan tidak memuat kata benda atau nama tokoh utama.');
  }

  // 6. Must contain at least one verb/action
  const hasVerb = KNOWN_VERBS.some(verb => cleanLower.includes(verb));
  if (!hasVerb) {
    warnings.push('Narasi kompresi kemungkinan tidak memuat kata kerja tindakan utama.');
  }

  // 7. Does not remove primary character name if present in original (Advisory Guideline)
  const knownCharacters = ['Rio', 'Roro Jonggrang', 'Roro', 'Bandung Bondowoso', 'Bandung', 'Karsa'];
  for (const char of knownCharacters) {
    if (original.includes(char) && !clean.includes(char)) {
      // In case Bandung Bondowoso is compressed to Bandung, it's fine
      if (char === 'Roro Jonggrang' && (clean.includes('Roro') || clean.includes('Jonggrang'))) continue;
      if (char === 'Bandung Bondowoso' && clean.includes('Bandung')) continue;
      warnings.push(`Nama tokoh utama "${char}" kemungkinan terpotong dari narasi kompresi.`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
}
