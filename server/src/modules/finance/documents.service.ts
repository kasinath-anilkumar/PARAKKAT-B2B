import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { getCompanyProfile } from '../../config/company';
import {
  renderPdf,
  drawHeader,
  drawMetaColumns,
  drawFooter,
  money,
  dateStr,
  INK,
  MUTED,
  LINE,
  ACCENT_BG,
  BRAND,
} from '../../lib/pdf/pdf';

const num = (d: Prisma.Decimal | number | null | undefined): number => Number(d ?? 0);

/** Fetch an invoice with everything a document needs, enforcing agency scope. */
async function loadInvoice(invoiceId: string, agencyScope?: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { agency: true, booking: true, creditNotes: { orderBy: { createdAt: 'asc' } } },
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (agencyScope && invoice.agencyId !== agencyScope) throw ApiError.forbidden('Invoice belongs to another agency');
  return invoice;
}

// --- table helper -------------------------------------------------------------

interface Col {
  label: string;
  width: number;
  align?: 'left' | 'right';
}

function drawTable(doc: PDFKit.PDFDocument, cols: Col[], rows: string[][], x = 48): void {
  const rowH = 22;
  let y = doc.y;
  // header band
  doc.rect(x, y, cols.reduce((s, c) => s + c.width, 0), rowH).fill(ACCENT_BG);
  let cx = x;
  doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold');
  for (const c of cols) {
    doc.text(c.label.toUpperCase(), cx + 6, y + 7, { width: c.width - 12, align: c.align ?? 'left' });
    cx += c.width;
  }
  y += rowH;
  doc.font('Helvetica').fontSize(9);
  for (const row of rows) {
    if (y > 760) {
      doc.addPage();
      y = doc.y;
    }
    cx = x;
    row.forEach((cell, i) => {
      doc.fillColor(INK).text(cell, cx + 6, y + 6, { width: cols[i].width - 12, align: cols[i].align ?? 'left' });
      cx += cols[i].width;
    });
    doc.moveTo(x, y + rowH).lineTo(x + cols.reduce((s, c) => s + c.width, 0), y + rowH).strokeColor(LINE).lineWidth(0.5).stroke();
    y += rowH;
  }
  doc.y = y + 4;
  doc.x = 48;
}

// --- Tax invoice --------------------------------------------------------------

export async function renderInvoicePdf(invoiceId: string, agencyScope?: string): Promise<{ buffer: Buffer; fileName: string }> {
  const inv = await loadInvoice(invoiceId, agencyScope);
  const company = getCompanyProfile();
  const b = inv.booking;

  const buffer = await renderPdf((doc) => {
    drawHeader(doc, company, 'TAX INVOICE', inv.irn ? 'e-Invoice (IRP)' : undefined);

    drawMetaColumns(
      doc,
      [
        ['Invoice number', inv.number],
        ['Bill to', inv.agency.legalName],
        ['Recipient GSTIN', inv.recipientGstin ?? '—'],
        ['Place of supply', inv.placeOfSupply ? `State ${inv.placeOfSupply}` : '—'],
      ],
      [
        ['Issued', dateStr(inv.issuedAt)],
        ['Due', dateStr(inv.dueDate)],
        ['Payment mode', inv.paymentMode],
        ['Status', inv.status],
      ],
    );

    // Booking / stay line
    doc.moveDown(0.5);
    doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold').text('SUPPLY DETAILS');
    doc.moveDown(0.2);
    const stay =
      b.stayType === 'DAY_USE'
        ? `Day-use · ${dateStr(b.checkIn)}`
        : `${dateStr(b.checkIn)} → ${dateStr(b.checkOut)} · ${b.nights} night(s)`;
    drawTable(
      doc,
      [
        { label: 'Description', width: 300 },
        { label: 'SAC', width: 70 },
        { label: 'Qty', width: 55, align: 'right' },
        { label: 'Taxable value', width: 74, align: 'right' },
      ],
      [[`${b.resortName} — ${b.roomTypeName}\n${stay}`, inv.sac, `${b.guests} guest(s)`, money(num(inv.amount))]],
    );

    // Tax summary (right-aligned totals block)
    const totals: [string, string][] = [['Taxable value', money(num(inv.amount))]];
    if (num(inv.cgst) > 0) totals.push([`CGST @ ${inv.gstRate / 2}%`, money(num(inv.cgst))]);
    if (num(inv.sgst) > 0) totals.push([`SGST @ ${inv.gstRate / 2}%`, money(num(inv.sgst))]);
    if (num(inv.igst) > 0) totals.push([`IGST @ ${inv.gstRate}%`, money(num(inv.igst))]);
    if (inv.gstRate === 0) totals.push(['GST', 'Exempt (≤ ₹1,000/night)']);

    doc.moveDown(0.5);
    const boxX = 320;
    let ty = doc.y;
    for (const [label, value] of totals) {
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(label, boxX, ty, { width: 130 });
      doc.fillColor(INK).font('Helvetica').text(value, boxX + 130, ty, { width: 97, align: 'right' });
      ty += 16;
    }
    doc.rect(boxX, ty + 2, 227, 26).fill(BRAND);
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('Invoice total', boxX + 8, ty + 10, { width: 120 });
    doc.text(money(num(inv.invoiceTotal || inv.amount)), boxX + 120, ty + 10, { width: 99, align: 'right' });
    doc.y = ty + 40;
    doc.x = 48;

    if (num(inv.amountPaid) > 0) {
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(
        `Amount settled: ${money(num(inv.amountPaid))}   ·   Balance: ${money(Math.max(0, num(inv.invoiceTotal || inv.amount) - num(inv.amountPaid)))}`,
        48,
        doc.y,
      );
    }

    if (inv.irn) {
      doc.moveDown(0.5);
      doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(`IRN: ${inv.irn}`, { width: 499 });
    }

    if (inv.creditNotes.length) {
      doc.moveDown(1);
      doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text('Credit notes');
      doc.moveDown(0.3);
      drawTable(
        doc,
        [
          { label: 'Number', width: 130 },
          { label: 'Reason', width: 229 },
          { label: 'GST', width: 60, align: 'right' },
          { label: 'Total', width: 80, align: 'right' },
        ],
        inv.creditNotes.map((cn) => [cn.number, cn.reason, `${cn.gstRate}%`, money(num(cn.total))]),
      );
    }

    drawFooter(doc, `${company.name} · This is a computer-generated tax invoice.`);
  });

  return { buffer, fileName: `${inv.number}.pdf` };
}

// --- Credit statement (open AR: invoices + balances) --------------------------

export async function renderCreditStatementPdf(agencyId: string): Promise<{ buffer: Buffer; fileName: string }> {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw ApiError.notFound('Agency not found');
  const company = getCompanyProfile();

  const invoices = await prisma.invoice.findMany({
    where: { agencyId, paymentMode: 'CREDIT', status: { in: ['ISSUED', 'PARTIALLY_PAID'] } },
    orderBy: { issuedAt: 'asc' },
    include: { booking: { select: { resortName: true } } },
  });
  const outstanding = invoices.reduce((s, i) => s + Math.max(0, num(i.invoiceTotal || i.amount) - num(i.amountPaid)), 0);

  const buffer = await renderPdf((doc) => {
    drawHeader(doc, company, 'CREDIT STATEMENT', `As on ${dateStr(new Date())}`);
    drawMetaColumns(
      doc,
      [
        ['Agency', agency.legalName],
        ['GSTIN', agency.gstin],
      ],
      [
        ['Open invoices', String(invoices.length)],
        ['Outstanding balance', money(outstanding)],
      ],
    );
    doc.moveDown(0.5);
    drawTable(
      doc,
      [
        { label: 'Invoice', width: 110 },
        { label: 'Issued', width: 80 },
        { label: 'Due', width: 80 },
        { label: 'Total', width: 84, align: 'right' },
        { label: 'Balance', width: 84, align: 'right' },
      ],
      invoices.map((i) => [
        i.number,
        dateStr(i.issuedAt),
        dateStr(i.dueDate),
        money(num(i.invoiceTotal || i.amount)),
        money(Math.max(0, num(i.invoiceTotal || i.amount) - num(i.amountPaid))),
      ]),
    );
    doc.moveDown(0.3);
    doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(`Total outstanding: ${money(outstanding)}`, { align: 'right', width: 499 });
    drawFooter(doc, `${company.name} · Credit statement`);
  });

  return { buffer, fileName: `credit-statement-${agencyId.slice(0, 8)}.pdf` };
}

// --- Account statement (full ledger: invoices, payments, settlements) ---------

export async function renderAccountStatementPdf(agencyId: string): Promise<{ buffer: Buffer; fileName: string }> {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw ApiError.notFound('Agency not found');
  const company = getCompanyProfile();

  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({ where: { agencyId }, orderBy: { issuedAt: 'asc' } }),
    prisma.payment.findMany({
      where: { agencyId, direction: 'INBOUND', status: 'SUCCEEDED' },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Build a chronological ledger of debits (invoices) and credits (settled inbound payments).
  type Entry = { at: Date; ref: string; kind: string; debit: number; credit: number };
  const entries: Entry[] = [];
  for (const i of invoices) entries.push({ at: i.issuedAt, ref: i.number, kind: 'Invoice', debit: num(i.invoiceTotal || i.amount), credit: 0 });
  for (const p of payments)
    entries.push({
      at: p.createdAt,
      ref: p.gatewayRef ?? p.id.slice(0, 8).toUpperCase(),
      kind: p.gateway === 'offline' ? 'Settlement' : 'Payment',
      debit: 0,
      credit: num(p.amount),
    });
  entries.sort((a, b) => a.at.getTime() - b.at.getTime());

  let running = 0;
  const rows = entries.map((e) => {
    running += e.debit - e.credit;
    return [dateStr(e.at), e.ref, e.kind, e.debit ? money(e.debit) : '—', e.credit ? money(e.credit) : '—', money(running)];
  });

  const buffer = await renderPdf((doc) => {
    drawHeader(doc, company, 'ACCOUNT STATEMENT', `As on ${dateStr(new Date())}`);
    drawMetaColumns(
      doc,
      [
        ['Agency', agency.legalName],
        ['GSTIN', agency.gstin],
      ],
      [
        ['Entries', String(entries.length)],
        ['Closing balance', money(running)],
      ],
    );
    doc.moveDown(0.5);
    drawTable(
      doc,
      [
        { label: 'Date', width: 72 },
        { label: 'Reference', width: 110 },
        { label: 'Type', width: 95 },
        { label: 'Debit', width: 74, align: 'right' },
        { label: 'Credit', width: 74, align: 'right' },
        { label: 'Balance', width: 74, align: 'right' },
      ],
      rows,
    );
    doc.moveDown(0.3);
    doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(`Closing balance: ${money(running)}`, { align: 'right', width: 499 });
    drawFooter(doc, `${company.name} · Account statement`);
  });

  return { buffer, fileName: `account-statement-${agencyId.slice(0, 8)}.pdf` };
}
