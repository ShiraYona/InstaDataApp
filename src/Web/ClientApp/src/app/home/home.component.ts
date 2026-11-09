import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { RouterLink } from '@angular/router';
import { AddingNewDataEntryComponent } from '../adding-new-data-entry/adding-new-data-entry.component';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ ButtonModule, AddingNewDataEntryComponent , RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  title = 'כותרת';
  description = 'טקסט לדוגמה';

  /** הדיאלוג "יצירת נתון חדש" נפתח מעל המסך הזה — אין ניווט */
  newDataVisible = false;
  dialogVisible = false;

  openNewDataDialog(): void {
    this.newDataVisible = true;
  }

  /** הנתון נשמר — סגירת הדיאלוג נעשתה ברכיב; כאן מרעננים את המסך */
  onNewDataSaved(): void {
    this.newDataVisible = false;
  onDataSaved(_id: number): void {
  }
}
