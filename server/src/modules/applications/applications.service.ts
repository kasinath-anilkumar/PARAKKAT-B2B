import type { AgencyApplication, ApplicationLifecycleState } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { maskAadhaarRef, maskAccount, maskPan } from '../../utils/mask';

/** Masks PII before an application is shown to admins/verifiers (§11). */
function toAdminView(application: AgencyApplication) {
  const { resumeTokenHash: _omit, ...rest } = application;
  void _omit;
  return {
    ...rest,
    pan: maskPan(application.pan),
    repAadhaarRef: maskAadhaarRef(application.repAadhaarRef),
    bankAccount: maskAccount(application.bankAccount),
  };
}

export interface ListApplicationsParams {
  lifecycleState?: ApplicationLifecycleState;
  page: number;
  pageSize: number;
}

export async function listApplications({ lifecycleState, page, pageSize }: ListApplicationsParams) {
  const where = lifecycleState ? { lifecycleState } : {};
  const [items, total] = await Promise.all([
    prisma.agencyApplication.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.agencyApplication.count({ where }),
  ]);
  return { items: items.map(toAdminView), total, page, pageSize };
}

export async function getApplicationDetail(id: string) {
  const application = await prisma.agencyApplication.findUnique({
    where: { id },
    include: {
      verifications: true,
      documents: {
        select: {
          id: true,
          docType: true,
          status: true,
          fileName: true,
          contentType: true,
          checksum: true,
          uploadedAt: true,
        },
      },
      agency: {
        select: {
          id: true,
          status: true,
          activatedAt: true,
          commercialConfigurations: { where: { isCurrent: true } },
        },
      },
    },
  });
  if (!application) {
    throw ApiError.notFound('Application not found');
  }
  const { verifications, documents, agency, ...base } = application;
  return { ...toAdminView(base), verifications, documents, agency };
}
