import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../../utils/apiError';
import * as documentsService from './documents.service';

const docTypeSchema = z.enum([
  'REGISTRATION_PROOF',
  'ADDRESS_PROOF',
  'AGREEMENT',
  'SIGNED_AGREEMENT',
  'OTHER',
]);

export async function upload(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded (expected multipart field "file")');
  }
  const parsedDocType = docTypeSchema.safeParse(req.body.docType);
  if (!parsedDocType.success) {
    throw ApiError.badRequest('Invalid or missing docType', parsedDocType.error);
  }
  const docType = parsedDocType.data;
  const document = await documentsService.uploadApplicationDocument({
    applicationId: req.application!.id,
    docType,
    fileName: req.file.originalname,
    contentType: req.file.mimetype,
    buffer: req.file.buffer,
  });
  res.status(201).json({
    id: document.id,
    docType: document.docType,
    status: document.status,
    fileName: document.fileName,
    uploadedAt: document.uploadedAt,
  });
}

export async function list(req: Request, res: Response): Promise<void> {
  const documents = await documentsService.listApplicationDocuments(req.application!.id);
  res.status(200).json({ documents });
}

export async function signedUrl(req: Request, res: Response): Promise<void> {
  const result = await documentsService.getDocumentSignedUrl(
    req.application!.id,
    req.params.docId,
  );
  res.status(200).json(result);
}
