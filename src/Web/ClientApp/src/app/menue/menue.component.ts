import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-menue',
  templateUrl: './menue.component.html',
  styleUrls: ['./menue.component.scss']
})
export class MenueComponent implements OnInit {
  items: MenuItem[] = [];

  ngOnInit(): void {
    this.items = [
      {
        label: 'תפריט 1',
        icon: 'pi pi-home',
        routerLink: '/home'
      },
      {
        label: 'תפריט 2',
        icon: 'pi pi-folder',
        items: [
          { label: 'פריט 1', routerLink: '/home' },
          { label: 'פריט 2', routerLink: '/home' }
        ]
      }
    ];
  }
}
