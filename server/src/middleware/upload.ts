import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { ALLOWED_MIME_TYPES } from '../modules/documents/documents.service';

// In-memory storage: files are streamed straight to the StorageProvider
// (S3 / local disk) rather than written to the API's own filesystem.
const multerSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
}).single('file');

const multerFields = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
}).fields([
  { name: 'registrationProof', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 },
]);

/** Wraps multer so size/type errors surface as clean 400s rather than 500s. */
export function uploadSingleFile(req: Request, res: Response, next: NextFunction): void {
  multerSingle(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(ApiError.badRequest('File exceeds the maximum allowed size'));
        return;
      }
      next(ApiError.badRequest(err.message));
      return;
    }
    next(ApiError.badRequest(err instanceof Error ? err.message : 'Upload failed'));
  });
}

export function uploadAgencyDocs(req: Request, res: Response, next: NextFunction): void {
  multerFields(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(ApiError.badRequest('File exceeds the maximum allowed size'));
        return;
      }
      next(ApiError.badRequest(err.message));
      return;
    }
    next(ApiError.badRequest(err instanceof Error ? err.message : 'Upload failed'));
  });
}
