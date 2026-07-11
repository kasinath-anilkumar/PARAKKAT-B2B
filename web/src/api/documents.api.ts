import { httpClient } from './httpClient';

/**
 * PDF document downloads. Each hits an endpoint that streams `application/pdf`;
 * we pull it as a blob (auth + refresh handled by the shared client) and trigger
 * a browser save using the server-provided filename.
 */
async function download(url: string, fallbackName: string): Promise<void> {
  const res = await httpClient.get(url, { responseType: 'blob' });
  const disposition = String(res.headers['content-disposition'] ?? '');
  const match = disposition.match(/filename="?([^"]+)"?/);
  const fileName = match?.[1] ?? fallbackName;

  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

export const downloadInvoicePdf = (invoiceId: string, number?: string) =>
  download(`/finance/invoices/${invoiceId}/pdf`, `${number ?? 'invoice'}.pdf`);

export const downloadCreditStatement = () => download('/finance/statements/credit', 'credit-statement.pdf');

export const downloadAccountStatement = () => download('/finance/statements/account', 'account-statement.pdf');

export const downloadVoucher = (bookingId: string, ref?: string) =>
  download(`/bookings/${bookingId}/voucher`, `voucher-${ref ?? bookingId}.pdf`);
