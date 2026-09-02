import { fileTypeFromBuffer } from 'file-type';
import { ApiError } from '../../utils/api.js';
import { env } from '../../config/env.js';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinaryStorage.js';
import { uploadToLocal, deleteFromLocal } from './localStorage.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 8 * 1024 * 1024;
const MIN_DIMENSION = 200;
const MAX_DIMENSION = 8000;

export async function validateImageBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new ApiError(400, 'No image data received.', 'INVALID_FILE');
  }
  if (buffer.length > MAX_BYTES) {
    throw new ApiError(400, 'That image is too large. Maximum size is 8 MB.', 'FILE_TOO_LARGE');
  }
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED.has(detected.mime)) {
    throw new ApiError(400, 'Only JPEG, PNG, WebP, and GIF images are allowed.', 'INVALID_FILE_TYPE');
  }
  return detected.mime;
}

function cloudinaryKeysPresent() {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  return Boolean(cloudName && apiKey && apiSecret);
}

function useCloudinary() {
  if (!cloudinaryKeysPresent()) return false;
  return env.imageProvider === 'cloudinary' || env.isProd || process.env.VERCEL === '1';
}

function requireCloudinaryInProduction() {
  return env.isProd || process.env.VERCEL === '1';
}

export async function storeImage(buffer, folder = 'lfe/posts') {
  await validateImageBuffer(buffer);
  if (useCloudinary()) {
    return uploadToCloudinary(buffer, folder);
  }
  if (requireCloudinaryInProduction()) {
    throw new ApiError(
      400,
      'Photograph uploads need Cloudinary. In Vercel set IMAGE_STORAGE_API_KEY, IMAGE_STORAGE_API_SECRET, and IMAGE_STORAGE_CLOUD_NAME (or one CLOUDINARY_URL), then Redeploy.',
      'IMAGE_STORAGE_NOT_CONFIGURED',
    );
  }
  return uploadToLocal(buffer, folder);
}

export async function storeImages(files, folder = 'lfe/posts') {
  const uploaded = [];
  try {
    for (const file of files) {
      const stored = await storeImage(file.buffer, folder);
      uploaded.push(stored);
    }
    return uploaded;
  } catch (err) {
    await Promise.allSettled(uploaded.map((img) => removeImage(img)));
    throw err;
  }
}

export async function removeImage(image) {
  if (!image) return;
  if (image.publicId && useCloudinary()) {
    await deleteFromCloudinary(image.publicId);
    return;
  }
  await deleteFromLocal(image);
}
