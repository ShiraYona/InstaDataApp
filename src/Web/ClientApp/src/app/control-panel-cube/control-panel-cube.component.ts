import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { RouterModule } from '@angular/router';

export type CubeStatus = 'ok' | 'warn' | 'danger';

export interface CubeMetric {
  key: string;
  title: string;
  icon: string;
  value: string;
  unit?: string;
  source: string;
  trend: number;
  trendPositive: boolean;
  status: CubeStatus;
  updated: boolean;
  targetText?: string;
}

@Component({
  selector: 'app-control-panel-cube',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, RouterModule],
  templateUrl: './control-panel-cube.component.html',
  styleUrl: './control-panel-cube.component.scss'
})
export class ControlPanelCubeComponent {
  /** נתוני דמה לתצוגה — יוחלפו בנתונים אמיתיים מהשרת */
  readonly metrics: CubeMetric[] = [
    { key: 'item-1', title: 'פריט 1', icon: 'pi pi-home', value: '0', unit: 'יחידות', source: 'מקור: פריט 1', trend: 0, trendPositive: true, status: 'ok', updated: true },
    { key: 'item-2', title: 'פריט 2', icon: 'pi pi-tag', value: '0', unit: 'יחידות', source: 'מקור: פריט 2', trend: 0, trendPositive: true, status: 'ok', updated: true },
    { key: 'item-3', title: 'פריט 3', icon: 'pi pi-file', value: '0', unit: 'יחידות', source: 'מקור: פריט 3', trend: 0, trendPositive: true, status: 'ok', updated: false, targetText: 'יעד: 0 (0%)' },
    { key: 'item-4', title: 'פריט 4', icon: 'pi pi-wallet', value: '₪0', source: 'מקור: פריט 4', trend: 0, trendPositive: false, status: 'ok', updated: false },
    { key: 'item-5', title: 'פריט 5', icon: 'pi pi-file-edit', value: '0', unit: 'יחידות', source: 'מקור: פריט 5', trend: 0, trendPositive: true, status: 'ok', updated: true },
    { key: 'item-6', title: 'פריט 6', icon: 'pi pi-arrow-right-arrow-left', value: '0', unit: 'יחידות', source: 'מקור: פריט 6', trend: 0, trendPositive: true, status: 'ok', updated: true },
    { key: 'item-7', title: 'פריט 7', icon: 'pi pi-bell', value: '0', unit: 'יחידות', source: 'מקור: פריט 7', trend: 0, trendPositive: true, status: 'ok', updated: true },
    { key: 'item-8', title: 'פריט 8', icon: 'pi pi-clipboard', value: '0', unit: 'יחידות', source: 'מקור: פריט 8', trend: 0, trendPositive: true, status: 'ok', updated: true }
  ];
}
