import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { AddingNewDataEntryComponent } from '../features/insta-data/adding-new-data-entry/adding-new-data-entry.component';

/** שורת קטלוג הנתונים — שדות ההגדרה של נתון אחד */
export interface DataCatalogRow {
  id: number;
  /** שם הנתון */
  name: string;
  /** מקור הנתונים */
  source: string;
  /** אופן החישוב — סכום / כמות */
  calculation: string;
  /** שדה הקיבוץ */
  grouping: string;
  /** מצב הנתון */
  active: boolean;
}

/** מסך ניהול הנתונים — קטלוג הנתונים עם פעולות עריכה, השבתה ומחיקה */
@Component({
  selector: 'app-data-management-screen',
  standalone: true,
  imports: [ButtonModule, TableModule, ToastModule, AddingNewDataEntryComponent],
  templateUrl: './DataManagementScreen.html',
  styleUrl: './DataManagementScreen.scss',
  providers: [MessageService]
})
export class DataManagementScreen {
  /** האם דיאלוג הנתון (יצירה / עריכה) פתוח */
  dialogVisible = false;

  /**
   * נתוני דוגמה בלבד. יש להחליף את המערך בקריאה לשירות ה-API
   * שיחזיר את הקטלוג האמיתי (שמות טבלאות ושדות ייקבעו לאחר מיפוי מול מסד הנתונים).
   */
  rows: DataCatalogRow[] = [
    { id: 1, name: 'נתון 1', source: 'מקור 1', calculation: 'סכום', grouping: 'מערכת', active: true },
    { id: 2, name: 'נתון 2', source: 'מקור 1', calculation: 'כמות', grouping: 'מערכת', active: true },
    { id: 3, name: 'נתון 3', source: 'מקור 2', calculation: 'כמות', grouping: 'קיבוץ 1', active: true },
    { id: 4, name: 'נתון 4', source: 'מקור 3', calculation: 'כמות', grouping: 'קיבוץ 2', active: true },
    { id: 5, name: 'נתון 5', source: 'מקור 4', calculation: 'כמות', grouping: 'קיבוץ 3', active: true },
    { id: 6, name: 'נתון 6', source: 'מקור 5', calculation: 'כמות', grouping: 'מערכת', active: true },
    { id: 7, name: 'נתון 7', source: 'מקור 6', calculation: 'כמות', grouping: 'מערכת', active: true },
    { id: 8, name: 'נתון 8', source: 'מקור 7', calculation: 'כמות', grouping: 'קיבוץ 4', active: true },
    { id: 9, name: 'נתון 9', source: 'מקור 8', calculation: 'סכום', grouping: 'קיבוץ 5', active: false },
    { id: 10, name: 'נתון 10', source: 'מקור 8', calculation: 'כמות', grouping: 'מערכת', active: true },
    { id: 11, name: 'נתון 11', source: 'מקור 9', calculation: 'כמות', grouping: 'קיבוץ 1', active: true },
    { id: 12, name: 'נתון 12', source: 'מקור 9', calculation: 'סכום', grouping: 'מערכת', active: true }
  ];

  constructor(private readonly messageService: MessageService) {}

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
  editRow(_row: DataCatalogRow): void {
    this.dialogVisible = true;
  }

  /** החלפת מצב פעיל / מושבת — ההודעה זהה לזו שבדמו: "מצב הנתון עודכן" */
  toggleRow(row: DataCatalogRow): void {
    row.active = !row.active;
    this.notify('מצב הנתון עודכן');
  }

  /** מחיקת נתון מהקטלוג — לאחר אישור המשתמש בחלון האישור */
  deleteRow(row: DataCatalogRow): void {
    const approved = window.confirm(`למחוק את הנתון "${row.name}" מהדמו?`);
    if (!approved) {
      return;
    }

    this.rows = this.rows.filter((item) => item.id !== row.id);
    this.notify(`הנתון "${row.name}" נמחק`);
  }
}
