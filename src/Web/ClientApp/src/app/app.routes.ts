import { Routes } from '@angular/router';

/** נתיבי מערכת הבקרה — כולם נטענים תחת מעטפת אחת עם תפריט וכותרת */
const controlPanelRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./control-panel/control-panel.component').then(m => m.ControlPanelComponent),
    data: { crumb: 'מערכת ניהול ובקרה', title: 'סקירה תפעולית' }
  },
  {
    path: 'metrics',
    loadComponent: () => import('./metrics/metrics.component').then(m => m.MetricsComponent),
    data: { crumb: 'ניהול נתונים', title: 'קטלוג נתונים דינמי' }
  },
  {
    path: 'layout',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    data: { crumb: 'ניהול תצוגה', title: 'פריסת כרטיסים' }
  },
  {
    path: 'tasks',
    loadComponent: () => import('./tasks/tasks.component').then(m => m.TasksComponent),
    data: { crumb: 'משימות ובקרה', title: 'ניהול טיפול' }
  },
  {
    path: 'alerts',
    loadComponent: () => import('./alerts/alerts.component').then(m => m.AlertsComponent),
    data: { crumb: 'התראות ומעקב', title: 'חוקים וחריגות' }
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent),
    data: { crumb: 'דוחות מתוזמנים', title: 'ניהול דוחות' }
  },
  {
    path: 'dialog',
    loadComponent: () =>
      import('./detailed-dialogue/detailed-dialogue.component').then(m => m.DetailedDialogueComponent),
    data: { crumb: 'פירוט נתון', title: 'פירוט נתון' }
  }
];

export const routes: Routes = [
  {
    path: 'control-panel',
    loadComponent: () => import('./shared/app-shell/app-shell.component').then(m => m.AppShellComponent),
    data: { crumb: 'מערכת ניהול ובקרה', title: 'סקירה תפעולית' },
    children: [
      ...controlPanelRoutes,
      // כתובת הבקרה הישנה של חלון הפירוט — לתאימות
      {
        path: 'control-panel-dialog',
        redirectTo: 'dialog'
      }
    ]
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home-page/home-page.component').then(m => m.HomePageComponent)
  },
  {
    path: 'home',
    pathMatch: 'full',
    loadComponent: () => import('./home-page/home-page.component').then(m => m.HomePageComponent)
  },
  { path: '**', redirectTo: '' }
];
