import { randomUUID } from 'node:crypto';
import type { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { cloudinary } from '../configs/cloudinary';

type UploadImageOptions = {
  publicId: string;
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
};

const buildFileName = (value: string) => {
  const baseName = value
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return baseName.length > 0 ? baseName : 'image';
};

const uploadBufferToCloudinary = async (fileBuffer: Buffer, options: UploadImageOptions) => {
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: options.folder,
        public_id: options.publicId,
        overwrite: false,
        transformation: [
          {
            width: options.maxWidth ?? 1024,
            height: options.maxHeight ?? 1024,
            crop: 'limit',
          },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error?: UploadApiErrorResponse, uploadResult?: UploadApiResponse) => {
        if (error) {
          reject(error);
          return;
        }

        if (!uploadResult) {
          reject(new Error('Failed to upload image to Cloudinary'));
          return;
        }

        resolve(uploadResult);
      },
    );

    uploadStream.end(fileBuffer);
  });

  return {
    secureUrl: result.secure_url,
  };
};

export const uploadProfileImageToCloudinary = async (fileBuffer: Buffer, userId: string, username: string) => {
  const safeFileName = buildFileName(username);
  const publicId = `${safeFileName}-${Date.now()}-${randomUUID()}`;

  return uploadBufferToCloudinary(fileBuffer, {
    publicId,
    folder: `minpro/profile-picture/${userId}`,
    maxWidth: 1024,
    maxHeight: 1024,
  });
};

export const uploadPaymentProofToCloudinary = async (fileBuffer: Buffer) => {
  return uploadBufferToCloudinary(fileBuffer, {
    publicId: `payment-proof-${Date.now()}-${randomUUID()}`,
    maxWidth: 1600,
    maxHeight: 1600,
  });
};