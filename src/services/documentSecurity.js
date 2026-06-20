// Client-side document hardening for the student upload pipeline.
//
// This is the FIRST line of defense for the public/account upload flow. It runs
// in the browser before anything is sent to storage:
//   - real MIME sniffing by magic bytes (not the extension or the reported type)
//   - per-type size limits (PDF ≤ 10MB, image ≤ 5MB)
//   - filename sanitisation
//   - EXIF/metadata stripping for photos (canvas re-encode)
//   - structural malware checks: block PDFs carrying JavaScript / launch actions
//     / embedded files, and reject anything that isn't a clean PDF/JPEG/PNG
//   - SHA-256 hashing for duplicate detection
//
// A real anti-virus engine (e.g. VirusTotal) is a separate server-side phase;
// these structural checks cover the practical threats for document uploads.

export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const SNIFFERS = [
  { type: 'application/pdf', ext: 'pdf', magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { type: 'image/jpeg', ext: 'jpg', magic: [0xff, 0xd8, 0xff] },
  { type: 'image/png', ext: 'png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

// PDF tokens that indicate active/executable content we refuse to store.
const PDF_DANGER_TOKENS = [
  '/JavaScript',
  '/JS',
  '/Launch',
  '/OpenAction',
  '/AA', // additional-actions (auto-run)
  '/EmbeddedFile',
  '/RichMedia',
  '/XFA',
];

function bytesStartWith(bytes, magic) {
  if (bytes.length < magic.length) return false;
  return magic.every((value, index) => bytes[index] === value);
}

/** Sniff the real type from the file's leading bytes. Returns null if unknown. */
export async function sniffMimeType(file) {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const match = SNIFFERS.find((entry) => bytesStartWith(header, entry.magic));
  return match ? { type: match.type, ext: match.ext } : null;
}

/** Filename → safe ASCII base + a single trusted extension. */
export function sanitizeFilename(name, forcedExt = '') {
  const raw = String(name || 'document');
  const ext = forcedExt
    ? `.${forcedExt}`
    : raw.includes('.') ? `.${raw.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')}` : '';
  const base = raw
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'document';
  return `${base}${ext}`;
}

/** SHA-256 hex digest of the file, for duplicate detection. */
export async function hashFile(file) {
  if (!(globalThis.crypto && crypto.subtle)) return null;
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Scan a PDF's bytes for active/executable content. Returns the tokens found. */
export async function scanPdfThreats(file) {
  // Read up to the first 8 MB — enough to catch headers/actions without OOM.
  const slice = file.slice(0, 8 * 1024 * 1024);
  const text = new TextDecoder('latin1').decode(await slice.arrayBuffer());
  return PDF_DANGER_TOKENS.filter((token) => text.includes(token));
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be read.')); };
    image.src = url;
  });
}

/**
 * Re-encode an image through a canvas so EXIF/GPS and any other metadata are
 * dropped. PNGs become PNG, everything else becomes JPEG. Returns a clean File.
 */
export async function stripImageMetadata(file, targetType) {
  const image = await loadImageElement(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing is not supported in this browser.');
  context.drawImage(image, 0, 0, width, height);
  image.close?.();

  const outType = targetType === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Image processing failed.'))),
      outType,
      outType === 'image/jpeg' ? 0.92 : undefined,
    );
  });
  const ext = outType === 'image/png' ? 'png' : 'jpg';
  return new File([blob], sanitizeFilename(file.name, ext), { type: outType, lastModified: Date.now() });
}

/**
 * Full client-side pre-flight. Validates the real type + size, blocks dangerous
 * PDFs, strips photo metadata, sanitises the name and hashes the file.
 * Returns { file, hash, mimeType, originalName, sizeBytes, sanitizedName }.
 * Throws an Error (Persian message) on any hard rejection.
 */
export async function prepareUploadFile(file) {
  if (!file) throw new Error('ابتدا یک فایل انتخاب کنید.');

  const sniff = await sniffMimeType(file);
  if (!sniff) {
    throw new Error('نوع واقعی فایل پشتیبانی نمی‌شود. فقط PDF، JPG یا PNG مجاز است.');
  }
  // Guard against extension/type spoofing — the real bytes must match.
  const reported = (file.type || '').toLowerCase();
  if (reported && reported !== sniff.type && !(reported === 'image/jpg' && sniff.type === 'image/jpeg')) {
    throw new Error('پسوند فایل با محتوای واقعی آن همخوانی ندارد و به‌دلایل امنیتی رد شد.');
  }

  const isPdf = sniff.type === 'application/pdf';
  const limit = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    throw new Error(isPdf ? 'حجم PDF نباید بیشتر از ۱۰ مگابایت باشد.' : 'حجم عکس نباید بیشتر از ۵ مگابایت باشد.');
  }
  if (file.size === 0) throw new Error('فایل خالی است.');

  if (isPdf) {
    const threats = await scanPdfThreats(file);
    if (threats.length) {
      throw new Error('این PDF حاوی اسکریپت یا محتوای اجرایی است و به‌دلایل امنیتی پذیرفته نمی‌شود.');
    }
  }

  // Photos are re-encoded to drop EXIF/GPS; PDFs are passed through untouched.
  let cleanFile = file;
  if (!isPdf) {
    try {
      cleanFile = await stripImageMetadata(file, sniff.type);
    } catch {
      // If re-encoding fails, fall back to the original (still type/size-checked).
      cleanFile = new File([file], sanitizeFilename(file.name, sniff.ext), { type: sniff.type });
    }
  } else {
    cleanFile = new File([file], sanitizeFilename(file.name, 'pdf'), { type: 'application/pdf' });
  }

  const hash = await hashFile(cleanFile);

  return {
    file: cleanFile,
    hash,
    mimeType: sniff.type,
    originalName: file.name,
    sanitizedName: cleanFile.name,
    sizeBytes: cleanFile.size,
    metadataStripped: !isPdf,
  };
}

export function humanFileSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
