import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildStreakText, shareToFacebook, shareToWhatsApp } from './social';

describe('adhdTracker social sharing', () => {
  let openSpy;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('builds a streak brag line', () => {
    const text = buildStreakText({ streak: 5, totalCompleted: 23, expectationRate: 87 });
    expect(text).toContain('🔥 5 days');
    expect(text).toContain('23 tasks');
    expect(text).toContain('87%');
  });

  it('uses singular day for streaks of 1', () => {
    expect(buildStreakText({ streak: 1, totalCompleted: 3, expectationRate: 100 })).toContain('1 day of');
  });

  it('opens the Facebook sharer', () => {
    shareToFacebook('streak flex');
    expect(openSpy.mock.calls[0][0]).toContain('facebook.com/sharer/sharer.php');
  });

  it('opens WhatsApp with the app URL appended', () => {
    shareToWhatsApp('on a roll');
    expect(openSpy.mock.calls[0][0]).toContain('https://wa.me/?text=');
  });
});
