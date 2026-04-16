import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { AppError } from '../errors/app.error';

const MAX_PROFILE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PROFILE_IMAGE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_PROFILE_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError(400, 'Invalid file type. Allowed types: JPG, PNG, WEBP.'));
      return;
    }

    cb(null, true);
  },
});

export const profileImageUpload = (req: Request, res: Response, next: NextFunction) => {
  uploader.single('profileImage')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'Profile image is too large. Maximum size is 2MB.' });
      return;
    }

    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    res.status(400).json({ message: 'Failed to process profile image upload.' });
  });
};