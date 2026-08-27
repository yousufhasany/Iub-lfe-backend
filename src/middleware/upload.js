import multer from 'multer';
import { ApiError } from '../utils/api.js';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPEG, PNG, WebP, and GIF images are allowed.', 'INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

export const MAX_FILE_BYTES_CONST = MAX_FILE_BYTES;
