import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { randomToken } from '../../utils/crypto.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function uploadToLocal(buffer, folder) {
  const image = sharp(buffer).rotate();
  const meta = await image.metadata();
  if ((meta.width || 0) < 200 || (meta.height || 0) < 200) {
    throw new ApiError(400, 'Images must be at least 200×200 pixels.', 'IMAGE_TOO_SMALL');
  }
  if ((meta.width || 0) > 8000 || (meta.height || 0) > 8000) {
    throw new ApiError(400, 'Images cannot exceed 8000 pixels on either side.', 'IMAGE_TOO_LARGE');
  }

  const id = randomToken(16);
  const dest = path.join(UPLOAD_ROOT, folder.replace(/[^a-z0-9/_-]/gi, ''));
  await ensureDir(dest);

  const originalName = `${id}.jpg`;
  const thumbName = `${id}-thumb.webp`;
  const webpName = `${id}.webp`;

  const originalPath = path.join(dest, originalName);
  const thumbPath = path.join(dest, thumbName);
  const webpPath = path.join(dest, webpName);

  const resized = image.clone().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true });
  await resized.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(originalPath);
  await resized.clone().webp({ quality: 80 }).toFile(webpPath);
  await image.clone().resize(400, 400, { fit: 'cover' }).webp({ quality: 75 }).toFile(thumbPath);

  const publicBase = `${env.apiUrl}/uploads/${folder}`;
  const info = await sharp(originalPath).metadata();

  return {
    url: `${publicBase}/${originalName}`,
    thumbnailUrl: `${publicBase}/${thumbName}`,
    webpUrl: `${publicBase}/${webpName}`,
    publicId: path.posix.join(folder, id),
    width: info.width,
    height: info.height,
    localPaths: [originalPath, thumbPath, webpPath],
  };
}

export async function deleteFromLocal(image) {
  const paths = image.localPaths;
  if (paths?.length) {
    await Promise.allSettled(paths.map((p) => fs.unlink(p)));
    return;
  }
  if (!image.publicId) return;
  const dest = path.join(UPLOAD_ROOT, `${image.publicId}.jpg`);
  const thumb = path.join(UPLOAD_ROOT, `${image.publicId}-thumb.webp`);
  const webp = path.join(UPLOAD_ROOT, `${image.publicId}.webp`);
  await Promise.allSettled([dest, thumb, webp].map((p) => fs.unlink(p)));
}
