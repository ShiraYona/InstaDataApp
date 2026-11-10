import { Component, OnInit, inject } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { AddingNewDataEntryComponent } from '../adding-new-data-entry/adding-new-data-entry.component';
import { DataDefinitionService } from '../shared/services/data-definition.service';
import { Metric } from '../web-api-client';

@Component({
  selector: 'app-data-management-screen',
  standalone: true,
  imports: [AddingNewDataEntryComponent, ButtonModule, ConfirmDialogModule, TableModule, ToastModule],

  templateUrl: './DataManagementScreen.html',
  styleUrl: './DataManagementScreen.scss',
  providers: [ConfirmationService, MessageService]
})
export class DataManagementScreen implements OnInit {
  private readonly dataService = inject(DataDefinitionService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  dialogVisible = false;

  isLoading = false;

  rows: Metric[] = [];

  ngOnInit(): void {
    this.loadRows();
  }

  private loadRows(): void {
    this.isLoading = true;
    this.dataService.getAllMetrics().subscribe({
      next: (metrics) => {
        this.rows = metrics;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.notify('שגיאה', 'טעינת הנתונים נכשלה', 'error');
      }
    });
  }

  private notify(summary: string, detail: string, severity: 'success' | 'error' = 'success'): void {
    this.messageService.clear();
    this.messageService.add({
      severity,
      summary,
      detail,
      life: 2900
    });
  }

  createRow(): void {
    this.dialogVisible = true;
  }

  /** נקרא לאחר שמירה מוצלחת בדיאלוג — מרענן את הקטלוג */
  onDataSaved(): void {
    this.loadRows();
  }

  editRow(_row: Metric): void {
    this.dialogVisible = true;
  }

  toggleRow(row: Metric): void {
    if (row.metricId == null) {
      return;
    }

    const nextState = !row.isActive;
    this.dataService.setMetricActive(row.metricId, nextState).subscribe({
      next: () => {
        row.isActive = nextState;
        this.notify('מאושר', nextState ? 'הרשומה הופעלה' : 'הרשומה הושבתה');
      },
      error: () => this.notify('שגיאה', 'עדכון מצב הנתון נכשל', 'error')
    });
  }

  deleteRow(row: Metric): void {
    if (row.metricId == null) {
      return;
    }

    this.confirmationService.confirm({
      header: 'מחיקת נתון',
      message: `האם למחוק את הנתון "${row.metricName}"? הפעולה אינה הפיכה.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'כן, מחק',
      rejectLabel: 'ביטול',
      dismissableMask: true,
      accept: () => this.applyDelete(row)
    });
  }

  /** מחיקת הנתון בשרת — לאחר שהמשתמש אישר בחלון האישור */
  private applyDelete(row: Metric): void {
    if (row.metricId == null) {
      return;
    }

    this.dataService.deleteMetric(row.metricId).subscribe({
      next: () => {
        this.rows = this.rows.filter((item) => item.metricId !== row.metricId);
        this.notify('מאושר', 'הרשומה נמחקה');
      },
      error: () => this.notify('שגיאה', 'מחיקת הנתון נכשלה', 'error')
    });
  }

}
