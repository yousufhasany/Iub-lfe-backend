import multer from 'multer';
import { ApiError } from '../utils/api.js';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 10 },
  fileFilter: (req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    if (!mime || mime === 'application/octet-stream' || ALLOWED.has(mime)) {
      return cb(null, true);
    }
    return cb(new ApiError(400, 'Only JPEG, PNG, WebP, and GIF images are allowed.', 'INVALID_FILE_TYPE'));
  },
});

export const MAX_FILE_BYTES_CONST = MAX_FILE_BYTES;
