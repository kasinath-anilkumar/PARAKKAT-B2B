import { describe, expect, it } from 'vitest';
import { dateStr, money, renderPdf } from '../../../src/lib/pdf/pdf';

describe('pdf helpers', () => {
  describe('money', () => {
    it('formats with the Rs. prefix and two decimals (Helvetica has no ₹ glyph)', () => {
      const out = money(1234.5);
      expect(out.startsWith('Rs. ')).toBe(true);
      expect(out).toContain('1,234.50');
      expect(money(0)).toBe('Rs. 0.00');
    });
  });

  describe('dateStr', () => {
    it('formats a date as DD Mon YYYY', () => {
      const out = dateStr('2026-07-11');
      expect(out).toContain('Jul');
      expect(out).toContain('2026');
    });
    it('renders a dash for empty values', () => {
      expect(dateStr(null)).toBe('—');
      expect(dateStr(undefined)).toBe('—');
    });
  });

  describe('renderPdf', () => {
    it('produces a non-empty Buffer with the %PDF magic header', async () => {
      const buf = await renderPdf((doc) => {
        doc.fontSize(12).text('Hello invoice');
      });
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
      expect(buf.subarray(0, 4).toString('latin1')).toBe('%PDF');
    });

    it('rejects when the builder throws (does not silently emit a blank PDF)', async () => {
      await expect(
        renderPdf(() => {
          throw new Error('builder blew up');
        }),
      ).rejects.toThrow('builder blew up');
    });
  });
});
