import DOMPurify from "dompurify";

/**
 * Sanitizes RichTextEditor-authored HTML before it's passed to
 * `dangerouslySetInnerHTML`, stripping scripts/event handlers/etc. so a stored payload
 * (compromised account, direct API write, editor bug) can't execute in a viewer's browser.
 * No-ops on the server (DOMPurify needs a DOM) — the client render still sanitizes.
 */
export function sanitizeRichTextHtml<T extends string | undefined | null>(html: T): T {
  if (!html) return html;
  return DOMPurify.sanitize(html) as T;
}
