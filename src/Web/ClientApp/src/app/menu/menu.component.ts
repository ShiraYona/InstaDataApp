import { Component, OnDestroy } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';

export interface NavItem {
  label: string;
  icon: string;
  routerLink: string;
}

/** רוחב שמתחתיו התפריט במצב סמל בלבד (חייב להתאים ל-media query שב-SCSS) */
const COMPACT_QUERY = '(max-width: 760px)';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive, TooltipModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnDestroy {
  mainItems: NavItem[] = [
    { label: 'לוח בקרה',        icon: '▦', routerLink: '/control-panel' },
    { label: 'ניהול נתונים',    icon: '▤', routerLink: '/data-management' },
    { label: 'ניהול תצוגה',     icon: '⚙', routerLink: '/display-management' },
    { label: 'משימות ובקרה',    icon: '☑', routerLink: '/tasks' }
  ];

  secondaryItems: NavItem[] = [
    { label: 'התראות ומעקב',    icon: '◉', routerLink: '/alerts' },
    { label: 'דוחות מתוזמנים',  icon: '▣', routerLink: '/reports' }
  ];

  /** ה-tooltip מוצג רק במצב רספונסיבי, כי שם התווית מוסתרת ונשאר רק הסמל */
  isCompact = false;

  private readonly mediaQuery = window.matchMedia(COMPACT_QUERY);

  private readonly onMediaChange = (event: MediaQueryListEvent) => {
    this.isCompact = event.matches;
  };

  constructor() {
    this.isCompact = this.mediaQuery.matches;
    this.mediaQuery.addEventListener('change', this.onMediaChange);
  }

  ngOnDestroy(): void {
    this.mediaQuery.removeEventListener('change', this.onMediaChange);
  }
}
