import type { ActorRole, Prisma, SupportPriority, SupportStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';

export interface SupportActor {
  userId: string;
  role: 'ADMIN' | 'AGENCY' | 'AGENT';
  agencyId: string | null;
}

const isAdmin = (a: SupportActor) => a.role === 'ADMIN';

const TICKET_INCLUDE = {
  agency: { select: { legalName: true } },
  createdBy: { select: { name: true, email: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketInclude;

type TicketRow = Prisma.SupportTicketGetPayload<{ include: typeof TICKET_INCLUDE }>;

function shapeTicket(t: TicketRow) {
  return {
    id: t.id,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    agencyName: t.agency.legalName,
    createdBy: t.createdBy.name ?? t.createdBy.email,
    messageCount: t._count.messages,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/** Loads a ticket enforcing access (admin sees all; agency/agent only their agency's). */
async function loadTicket(id: string, actor: SupportActor) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) throw ApiError.notFound('Ticket not found');
  if (!isAdmin(actor) && ticket.agencyId !== actor.agencyId) throw ApiError.notFound('Ticket not found');
  return ticket;
}

export async function createTicket(
  actor: SupportActor,
  input: { subject: string; category?: string; priority?: SupportPriority; body: string },
) {
  if (!actor.agencyId) throw ApiError.forbidden('Only agency users can raise tickets');
  const ticket = await prisma.supportTicket.create({
    data: {
      agencyId: actor.agencyId,
      createdByUserId: actor.userId,
      subject: input.subject,
      category: input.category ?? null,
      priority: input.priority ?? 'MEDIUM',
      messages: {
        create: { authorUserId: actor.userId, authorRole: actor.role as ActorRole, body: input.body, internal: false },
      },
    },
  });
  return getTicket(ticket.id, actor);
}

export async function listTickets(actor: SupportActor, filters: { status?: SupportStatus; q?: string }) {
  const where: Prisma.SupportTicketWhereInput = isAdmin(actor) ? {} : { agencyId: actor.agencyId ?? '__none__' };
  if (filters.status) where.status = filters.status;
  const rows = await prisma.supportTicket.findMany({ where, orderBy: { updatedAt: 'desc' }, include: TICKET_INCLUDE });
  let items = rows.map(shapeTicket);
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    items = items.filter((t) => [t.subject, t.agencyName, t.id].some((f) => f.toLowerCase().includes(q)));
  }
  return { items };
}

export async function getTicket(id: string, actor: SupportActor) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      ...TICKET_INCLUDE,
      messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true, email: true } } } },
    },
  });
  if (!ticket) throw ApiError.notFound('Ticket not found');
  if (!isAdmin(actor) && ticket.agencyId !== actor.agencyId) throw ApiError.notFound('Ticket not found');

  const { messages, ...rest } = ticket;
  return {
    ...shapeTicket(rest as TicketRow),
    messages: messages
      .filter((m) => isAdmin(actor) || !m.internal) // internal notes are admin-only
      .map((m) => ({
        id: m.id,
        author: m.author.name ?? m.author.email,
        authorRole: m.authorRole,
        body: m.body,
        internal: m.internal,
        createdAt: m.createdAt,
      })),
  };
}

export async function addMessage(id: string, actor: SupportActor, input: { body: string; internal?: boolean }) {
  await loadTicket(id, actor);
  const internal = isAdmin(actor) ? input.internal ?? false : false; // only admins can post internal notes
  await prisma.$transaction([
    prisma.supportMessage.create({
      data: { ticketId: id, authorUserId: actor.userId, authorRole: actor.role as ActorRole, body: input.body, internal },
    }),
    // Touch the ticket so it re-sorts to the top; an agency reply re-opens a resolved ticket.
    prisma.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date(), ...(!isAdmin(actor) ? { status: 'OPEN' } : {}) },
    }),
  ]);
  return getTicket(id, actor);
}

/** Admin-only status transition (open → pending → resolved → closed, or any). */
export async function updateStatus(id: string, actor: SupportActor, status: SupportStatus) {
  await loadTicket(id, actor);
  await prisma.supportTicket.update({ where: { id }, data: { status } });
  return getTicket(id, actor);
}
