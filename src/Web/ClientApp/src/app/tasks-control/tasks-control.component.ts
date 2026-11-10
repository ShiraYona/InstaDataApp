import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

/** משימה — מבנה הנתונים של המסך */
export interface TaskRow {
  id: number;
  title: string;
  owner: string;
  priority: 'גבוהה' | 'בינונית' | 'נמוכה';
  status: 'פתוחה' | 'בטיפול' | 'הושלמה';
}

/** מסך משימות ובקרה — פתיחת משימה, שיוך גורם מטפל ומעקב אחר סטטוס */
@Component({
  selector: 'app-tasks-control',
  standalone: true,
  imports: [FormsModule, ButtonModule, DialogModule, DropdownModule, InputTextModule, TableModule, ToastModule],
  templateUrl: './tasks-control.component.html',
  styleUrl: './tasks-control.component.scss',
  providers: [MessageService]
})
export class TasksControlComponent implements OnInit {
  private readonly messageService = inject(MessageService);

  /** רשימת המשימות — מתחילה בשתי משימות דוגמה כמו בדמו */
  tasks: TaskRow[] = [];

  /** האם חלון "פתיחת משימה" פתוח */
  dialogVisible = false;

  /** טופס המשימה החדשה */
  draft = { title: '', owner: 'צוות גבייה', priority: 'בינונית' as TaskRow['priority'] };

  readonly ownerOptions: string[] = ['צוות גבייה', 'צוות ארנונה', 'צוות אכיפה', 'מנהל מערכת'];
  readonly priorityOptions: TaskRow['priority'][] = ['בינונית', 'גבוהה', 'נמוכה'];
  readonly statusOptions: TaskRow['status'][] = ['פתוחה', 'בטיפול', 'הושלמה'];

  ngOnInit(): void {
    this.tasks = [
      { id: 1, title: 'טקסט לדוגמה', owner: 'תפקיד 1', status: 'פתוחה', priority: 'גבוהה' },
      { id: 2, title: 'טקסט לדוגמה', owner: 'תפקיד 2', status: 'בטיפול', priority: 'בינונית' }
    ];
  }

  /** הודעה קופצת קצרה — אחת בכל לחיצה, למשך 2900 מ"ש (כמו בדמו) */
  private notify(text: string): void {
    this.messageService.clear();
    this.messageService.add({ severity: 'info', summary: text, closable: false, life: 2900 });
  }

  /** פתיחת החלון עם טופס ריק */
  openTask(): void {
    this.draft = { title: '', owner: 'צוות גבייה', priority: 'בינונית' };
    this.dialogVisible = true;
  }

  saveTask(): void {
    const title = this.draft.title.trim();
    if (!title) {
      this.notify('יש להזין נושא משימה');
      return;
    }

    this.tasks = [
      ...this.tasks,
      {
        id: Math.max(0, ...this.tasks.map(t => t.id)) + 1,
        title,
        owner: this.draft.owner,
        priority: this.draft.priority,
        status: 'פתוחה'
      }
    ];

    this.dialogVisible = false;
    this.notify('משימת הדמו נוצרה');
  }

  /** עדכון סטטוס משימה מהתפריט בשורה */
  setTaskStatus(row: TaskRow, status: TaskRow['status']): void {
    row.status = status;
    this.notify('סטטוס המשימה עודכן');
  }
}
