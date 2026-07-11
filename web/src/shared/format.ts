/**
 * Utility to format backend payment terms string into client-friendly labels.
 * E.g., "net 7" -> "7 Days Pay Later", "prepaid" -> "Prepaid (0 Days)"
 */
export function formatPaymentTerms(terms: string | null | undefined): string {
  if (!terms) return 'N/A';
  const lower = terms.toLowerCase();
  if (lower === 'prepaid' || lower === 'prepay') return 'Prepaid (0 Days)';
  const match = terms.match(/\d+/);
  if (match) {
    const days = match[0];
    return `${days} Days Pay Later`;
  }
  return terms;
}
