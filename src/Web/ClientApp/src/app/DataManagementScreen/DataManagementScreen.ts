import { Component, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

// import { AddingNewDataEntryComponent } from '../features/insta-data/adding-new-data-entry/adding-new-data-entry.component';
import { DataDefinitionService } from '../shared/services/data-definition.service';
import { Metric } from '../web-api-client';

/** מסך ניהול הנתונים — קטלוג הנתונים עם פעולות עריכה, השבתה ומחיקה */
@Component({
  selector: 'app-data-management-screen',
  standalone: true,
  // imports: [ButtonModule, TableModule, ToastModule, AddingNewDataEntryComponent],
    imports: [ButtonModule, TableModule, ToastModule],

  templateUrl: './DataManagementScreen.html',
  styleUrl: './DataManagementScreen.scss',
  providers: [MessageService]
})
export class DataManagementScreen implements OnInit {
  private readonly dataService = inject(DataDefinitionService);
  private readonly messageService = inject(MessageService);

  /** האם דיאלוג הנתון (יצירה / עריכה) פתוח */
  dialogVisible = false;

  /** האם הנתונים נטענים מהשרת */
  isLoading = false;

  /** קטלוג הנתונים — נטען מטבלת CTRL_Metrics דרך /api/DataCatalog */
  rows: Metric[] = [];

  ngOnInit(): void {
    this.loadRows();
  }

  /** טעינת הקטלוג מהשרת */
  private loadRows(): void {
    this.isLoading = true;
    this.dataService.getAllMetrics().subscribe({
      next: (metrics) => {
        this.rows = metrics;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.notify('טעינת הנתונים נכשלה');
      }
    });
  }

  /**
   * הצגת הודעת אישור קצרה — מלבן כחול בתחתית המסך, ללא כפתור סגירה.
   * כמו בדמו (toastroot.innerHTML = ...) — בכל לחיצה מוצגת הודעה אחת בלבד:
   * ההודעות הקודמות מוסרות מיד, וההודעה החדשה מוצגת למשך 2900 מ"ש.
   */
  private notify(text: string): void {
    this.messageService.clear();
    this.messageService.add({
      severity: 'info',
      summary: text,
      closable: false,
      life: 2900
    });
  }

  /** יצירת נתון חדש — פותח את הדיאלוג עם טופס ריק */
  createRow(): void {
    this.dialogVisible = true;
  }

  /**
   * עריכת נתון קיים — בשלב זה פותח את אותו דיאלוג עם טופס ריק.
   * טעינת ערכי השורה הנלחצת לטופס (ושימור במקום יצירת נתון חדש) תתווסף בשלב נפרד.
   */
  editRow(_row: Metric): void {
    this.dialogVisible = true;
  }

  /** החלפת מצב פעיל / מושבת — ההודעה זהה לזו שבדמו: "מצב הנתון עודכן" */
   /** החלפת מצב פעיל / מושבת — נשמר ב-DB */
  toggleRow(row: Metric): void {
    if (row.metricId == null) {
      return;
    }

    const nextState = !row.isActive;
    this.dataService.setMetricActive(row.metricId, nextState).subscribe({
      next: () => {
        row.isActive = nextState;
        this.notify('מצב הנתון עודכן');
      },
      error: () => this.notify('עדכון מצב הנתון נכשל')
    });
  }

  /** מחיקת נתון מהקטלוג — לאחר אישור המשתמש בחלון האישור */
  /** מחיקת נתון מהקטלוג — נמחק ב-DB לאחר אישור המשתמש בחלון האישור */
  deleteRow(row: Metric): void {
    if (row.metricId == null) {
      return;
    }

    const approved = window.confirm(`למחוק את הנתון "${row.metricName}"?`);
    if (!approved) {
      return;
    }

    this.dataService.deleteMetric(row.metricId).subscribe({
      next: () => {
        this.rows = this.rows.filter((item) => item.metricId !== row.metricId);
        this.notify(`הנתון "${row.metricName}" נמחק`);
      },
      error: () => this.notify('מחיקת הנתון נכשלה')
    });
  }

}
