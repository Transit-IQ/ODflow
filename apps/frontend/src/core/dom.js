/** The two DOM helpers every component uses. Deliberately tiny. */

/**
 * Build an element from an HTML string.
 *
 *   const el = html`<div class="kpi">…</div>`;
 *
 * Used as a tagged template so component markup reads as markup. Interpolated
 * values are inserted as-is: templates here are authored, not user input, and
 * anything user-supplied goes through escHtml() in core/format.js first.
 */
export function html(strings, ...values) {
  const markup = strings.reduce((out, s, i) => out + s + (values[i] ?? ''), '');
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

/** Scoped querySelector, so components never reach for document by id. */
export function $(root, selector) {
  return root.querySelector(selector);
}
