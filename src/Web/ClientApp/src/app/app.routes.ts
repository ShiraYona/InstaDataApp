import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'control-panel',
    loadComponent: () => import('./control-panel/control-panel.component').then(m => m.ControlPanelComponent),
    data: { crumb: 'מערכת ניהול ובקרה', title: 'סקירה תפעולית' }
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'home',
    pathMatch: 'full',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
  },
  { path: '**', redirectTo: '' }
];
