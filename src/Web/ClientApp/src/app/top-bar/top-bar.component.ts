import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { DisplayLayoutService } from '../shared/services/display-layout.service';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [TooltipModule],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss'
})
export class TopBarComponent {
  private readonly router = inject(Router);
  private readonly userService = inject(DisplayLayoutService);

  crumb = 'מערכת ניהול ובקרה';
  title = 'סקירה תפעולית';

  /** מזהה המשתמש המחובר (בינתיים — מה-API) וממנו האות המוצגת בעיגול */
  userName = '';
  initial = '';

  constructor() {
    this.userService.loadUserId().subscribe(name => {
      this.userName = name ?? '';
      this.initial = this.userName.charAt(0).toUpperCase();
    });

    this.updateFromRoute();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.updateFromRoute());
  }

  /** הנתיב והכותרת מגיעים מ-data של ה-route (app.routes.ts) */
  private updateFromRoute(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.crumb = route.data['crumb'] ?? 'מערכת ניהול ובקרה';
    this.title = route.data['title'] ?? this.crumb;
  }
}
