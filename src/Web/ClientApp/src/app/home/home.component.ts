import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { AddingNewDataEntryComponent } from '../features/insta-data/adding-new-data-entry/adding-new-data-entry.component';


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

  dialogVisible = false;

  openNewDataDialog(): void {
    this.dialogVisible = true;
  }

  onDataSaved(_id: number): void {
  }
}
