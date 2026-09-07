import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// Local disk storage. Fine for a single instance; move to S3/Cloudinary before
// running more than one process or a container with an ephemeral filesystem.
export const UPLOAD_DIR = path.resolve('uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 10);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED.has(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, WebP or GIF images are allowed'), ok);
  },
}).single('image');

// 4-arg error handler placed right after uploadImage in the route chain.
export function handleUploadErrors(err, req, res, next) {
  if (!err) return next();
  const msg =
    err instanceof multer.MulterError
      ? err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 5MB or smaller'
        : err.message
      : err.message;
  res.status(400).json({ error: msg, code: 'UPLOAD_ERROR' });
}
