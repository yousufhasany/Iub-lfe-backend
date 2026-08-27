import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api.js';
import { getSharp } from './loadSharp.js';

let configured = false;

function ensureConfig() {
  if (configured) return;
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
  configured = true;
}

export async function uploadToCloudinary(buffer, folder) {
  ensureConfig();
  let toUpload = buffer;
  try {
    const sharp = await getSharp();
    const meta = await sharp(buffer).metadata();
    if ((meta.width || 0) < 200 || (meta.height || 0) < 200) {
      throw new ApiError(400, 'Images must be at least 200×200 pixels.', 'IMAGE_TOO_SMALL');
    }
    toUpload = await sharp(buffer).rotate().withMetadata({ exif: {} }).toBuffer();
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        overwrite: false,
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        eager: [
          { width: 400, height: 400, crop: 'fill', fetch_format: 'auto', quality: 'auto' },
          { width: 1200, crop: 'limit', fetch_format: 'webp', quality: 'auto' },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(new ApiError(502, 'Unable to upload image to Cloudinary.', 'IMAGE_UPLOAD_FAILED'));
          return;
        }
        const thumb = result.eager?.[0]?.secure_url || result.secure_url;
        const webp = result.eager?.[1]?.secure_url || result.secure_url;
        resolve({
          url: result.secure_url,
          thumbnailUrl: thumb,
          webpUrl: webp,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      },
    );
    stream.end(toUpload);
  });
}

export async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  ensureConfig();
  await cloudinary.uploader.destroy(publicId);
}
