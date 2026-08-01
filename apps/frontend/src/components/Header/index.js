import './Header.css';
import { html, $ } from '../../core/dom.js';
import { toggleTheme } from '../../core/theme.js';

const SUN = `<svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41z"/></svg>`;

const MOON = `<svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.3 22h-.1c-5.5 0-10-4.5-10-10 0-4.8 3.5-8.9 8.2-9.8.6-.1 1.2.3 1.3.9.1.6-.3 1.2-.9 1.3-3.7.8-6.4 4-6.4 7.8 0 4.4 3.6 8 8 8 3.8 0 7.1-2.7 7.8-6.4.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.9 4.7-5 8.2-9.8 8.2z"/></svg>`;

/** Brand bar: product mark, scope, data provenance, theme switch. */
export function Header() {
  const el = html`
    <header>
      <div class="brand">OD<span class="flow">flow</span></div>
      <div class="sub">ניתוח פערי שירות בתח״צ &nbsp;·&nbsp; <b>תל אביב-יפו</b></div>
      <div class="head-right">
        <div class="tag" title="מקור הנתונים המוצגים כרגע">
          <span class="dot"></span>מהירויות אוטובוס · GTFS · סקר תחנות
        </div>
        <button class="icon-btn" id="themeToggle"
                title="מעבר בין ערכת צבעים בהירה לכהה"
                aria-label="החלפת ערכת צבעים">${SUN}${MOON}</button>
      </div>
    </header>`;

  $(el, '#themeToggle').addEventListener('click', toggleTheme);

  return { el };
}
