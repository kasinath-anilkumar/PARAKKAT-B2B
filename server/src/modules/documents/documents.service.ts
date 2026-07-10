import crypto from 'node:crypto';
import type { DocumentType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { getStorage } from '../../lib/storage';
import { ApiError } from '../../utils/apiError';
import { recordAuditLogSafe } from '../audit/audit.service';

export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export interface UploadInput {
  applicationId: string;
  docType: DocumentType;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}

export async function uploadApplicationDocument(input: UploadInput) {
  if (!ALLOWED_MIME_TYPES.includes(input.contentType)) {
    throw ApiError.badRequest(`Unsupported file type: ${input.contentType}`);
  }

  const checksum = crypto.createHash('sha256').update(input.buffer).digest('hex');
  const storageKey = `applications/${input.applicationId}/${crypto.randomUUID()}-${input.fileName}`;

  await getStorage().put(storageKey, input.buffer, input.contentType);

  const document = await prisma.document.create({
    data: {
      applicationId: input.applicationId,
      docType: input.docType,
      storageKey,
      checksum,
      fileName: input.fileName,
      contentType: input.contentType,
      status: 'UPLOADED',
    },
  });

  await recordAuditLogSafe({
    entityType: 'Document',
    entityId: document.id,
    event: 'DOCUMENT_UPLOADED',
    actorId: null,
    actorRole: 'APPLICANT',
    after: { applicationId: input.applicationId, docType: input.docType, checksum },
  });

  return document;
}

export async function listApplicationDocuments(applicationId: string) {
  return prisma.document.findMany({
    where: { applicationId },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      docType: true,
      status: true,
      fileName: true,
      contentType: true,
      checksum: true,
      uploadedAt: true,
    },
  });
}

export async function getDocumentSignedUrl(applicationId: string, documentId: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, applicationId },
  });
  if (!document) {
    throw ApiError.notFound('Document not found');
  }
  const url = await getStorage().getSignedUrl(document.storageKey, 300);
  return { url, expiresInSeconds: 300 };
}
