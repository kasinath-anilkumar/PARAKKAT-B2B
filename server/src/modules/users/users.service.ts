import { prisma } from '../../lib/prisma';

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      agencyId: true,
      status: true,
      mfaEnabled: true,
      mfaMethod: true,
      createdAt: true,
    },
  });
  return user;
}
