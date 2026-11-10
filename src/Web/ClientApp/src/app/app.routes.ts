import { Routes } from '@angular/router';
import { DataManagementScreen } from './DataManagementScreen/DataManagementScreen';
export const routes: Routes = [
  {
    path: 'control-panel',
    loadComponent: () => import('./control-panel/control-panel.component').then(m => m.ControlPanelComponent),
    data: { crumb: 'מערכת ניהול ובקרה', title: 'סקירה תפעולית' }
  },
  {
    path: 'detailed-dialogue/:key',
    loadComponent: () => import('./detailed-dialogue/detailed-dialogue.component').then(m => m.DetailedDialogueComponent),
    data: { crumb: 'פירוט נתון', title: 'פירוט נתון' }
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
    path: 'new-data-entry',
    loadComponent: () =>
      import('./adding-new-data-entry/adding-new-data-entry.component').then(
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
      import('./display-management/display-management.component').then(
        m => m.DisplayManagementComponent
      )
  },
    {
    path: 'tasks',
    loadComponent: () => import('./tasks-control/tasks-control.component').then(m => m.TasksControlComponent)
  },
  { path: '**', redirectTo: '' } 
];
