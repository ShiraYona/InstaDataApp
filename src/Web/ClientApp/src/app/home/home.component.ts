import { Component } from '@angular/core';
import {  RouterOutlet } from '@angular/router';
import { MenuComponent } from '../menu/menu.component';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ RouterOutlet, MenuComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
}