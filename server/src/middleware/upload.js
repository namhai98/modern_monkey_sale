import multer from 'multer';

// Uploads are held in memory only — the client's file is never written to disk.
// The image processor validates the actual bytes; this is the first gate.
const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png']);
const ACCEPTED_EXT = /\.(jpe?g|png)$/i;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const okMime = ACCEPTED_MIME.has(file.mimetype);
    const okExt = ACCEPTED_EXT.test(file.originalname || '');
    if (okMime && okExt) return cb(null, true);
    cb(new Error('Only JPG or PNG images are accepted'), false);
  },
}).single('image');

// 4-arg error handler placed right after uploadSingleImage in the route chain.
export function handleUploadErrors(err, req, res, next) {
  if (!err) return next();
  let msg = err.message;
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') msg = 'Image must be 10MB or smaller';
    else if (err.code === 'LIMIT_FILE_COUNT') msg = 'Upload one image at a time';
  }
  res.status(400).json({ error: msg, code: 'UPLOAD_ERROR' });
}
