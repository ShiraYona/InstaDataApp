import { Component } from '@angular/core';
import { MenueComponent } from '../menue/menue.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MenueComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  title = 'כותרת';
  description = 'טקסט לדוגמה';
}
