import { describe, expect, it } from 'vitest';
import { SlidingWindowCounter } from '../../../src/modules/onboarding/anomaly';

describe('SlidingWindowCounter', () => {
  it('counts hits within the window', () => {
    const c = new SlidingWindowCounter();
    expect(c.hit('ip', 1000, 0)).toBe(1);
    expect(c.hit('ip', 1000, 100)).toBe(2);
    expect(c.hit('ip', 1000, 200)).toBe(3);
  });

  it('prunes hits outside the window', () => {
    const c = new SlidingWindowCounter();
    c.hit('ip', 1000, 0);
    c.hit('ip', 1000, 500);
    // At t=1600, the t=0 hit (age 1600 > 1000) is pruned; t=500 (age 1100 > 1000) also pruned.
    expect(c.hit('ip', 1000, 1600)).toBe(1);
  });

  it('tracks keys independently', () => {
    const c = new SlidingWindowCounter();
    c.hit('a', 1000, 0);
    c.hit('a', 1000, 10);
    expect(c.hit('b', 1000, 20)).toBe(1);
  });
});
