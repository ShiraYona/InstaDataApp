import { Routes } from '@angular/router';
import { DataManagementScreen } from './DataManagementScreen/DataManagementScreen';

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
  {
    // מסך יצירת נתון חדש — נטען ישירות לכתובת, והדיאלוג נפתח עם הכניסה
    path: 'new-data-entry',
    loadComponent: () =>
      import('./features/insta-data/adding-new-data-entry/adding-new-data-entry.component').then(
        m => m.AddingNewDataEntryComponent
      )
  },
  {
    path: 'data-management',
    loadComponent: () => import('./DataManagementScreen/DataManagementScreen').then(m => m.DataManagementScreen)
  },
  {
    path: 'display-management',
    loadComponent: () =>
      import('./display-management/display-management.component').then(m => m.DisplayManagementComponent)
  },
  { path: '**', redirectTo: '' },
   
];
