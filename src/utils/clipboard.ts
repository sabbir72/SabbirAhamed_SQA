/**
 * Safely copies text to the clipboard with automatic fallback for
 * embedded iframes or restricted browser contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below if Clipboard API is blocked (e.g. inside iframe)
  }

  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const succeeded = document.execCommand('copy');
      document.body.removeChild(textarea);
      return succeeded;
    }
  } catch {
    // Ignore fallback errors
  }

  return false;
}
