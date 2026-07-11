import { prisma } from '../../lib/prisma';

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      agencyId: true,
      status: true,
      mfaEnabled: true,
      mfaMethod: true,
      mustChangePassword: true,
      createdAt: true,
      agency: { select: { legalName: true } },
    },
  });
  const { agency, ...rest } = user;
  return { ...rest, agencyName: agency?.legalName ?? null };
}
