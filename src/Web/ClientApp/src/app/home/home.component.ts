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

  /** הדיאלוג "יצירת נתון חדש" נפתח מעל המסך הזה — אין ניווט */
  newDataVisible = false;

  openNewDataDialog(): void {
    this.newDataVisible = true;
  }

  /** הנתון נשמר — סגירת הדיאלוג נעשתה ברכיב; כאן מרעננים את המסך */
  onNewDataSaved(): void {
    this.newDataVisible = false;
  }
}
