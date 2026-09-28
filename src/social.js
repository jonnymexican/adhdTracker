// Brag about streaks. Open sharer endpoints only — no SDK, no accounts.

export const APP_URL = 'https://jonnymexican.github.io/adhdTracker/';

export function buildStreakText(stats) {
  const days = stats.streak === 1 ? 'day' : 'days';
  return `🔥 ${stats.streak} ${days} of finishing what I said I'd finish — ${stats.totalCompleted} tasks with outcomes met. My expectations-hit rate: ${stats.expectationRate ?? '—'}%.`;
}

export function openSharePopup(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function shareToFacebook(text, url = APP_URL) {
  openSharePopup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`);
}

export function shareToWhatsApp(text) {
  openSharePopup(`https://wa.me/?text=${encodeURIComponent(`${text} ${APP_URL}`)}`);
}

export async function shareNative({ title, text }) {
  if (typeof navigator.share !== 'function') return false;
  try {
    await navigator.share({ title, text, url: APP_URL });
    return true;
  } catch {
    return false;
  }
}

export function hasNativeShare() {
  return typeof navigator.share === 'function';
}
