import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { AddingNewDataEntryComponent } from '../features/insta-data/adding-new-data-entry/adding-new-data-entry.component';
import { MenueComponent } from '../menue/menue.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MenueComponent, ButtonModule, AddingNewDataEntryComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  title = 'כותרת';
  description = 'טקסט לדוגמה';

  /** שליטה בפתיחת דיאלוג "יצירת נתון חדש" */
  dialogVisible = false;

  openNewDataDialog(): void {
    this.dialogVisible = true;
  }

  /** נקרא אחרי שמירה מוצלחת — כאן המקום לרענון רשימות בעתיד */
  onDataSaved(_id: number): void {
    // TODO: לרענן את הרשימה/לוח הבקרה כשיהיה חיבור לנתונים האמיתיים
  }
}
