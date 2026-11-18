import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  label: string;
  icon: string;
  routerLink: string;
}
@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent {
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
}
