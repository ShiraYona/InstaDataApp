import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthorizeInterceptor implements HttpInterceptor {
  private readonly loginUrl: string;

  constructor() {
    const base = document.getElementsByTagName('base')[0];
    const baseUrl = base ? base.href.replace(/\/$/, '') : '';
    this.loginUrl = `${baseUrl}/Identity/Account/Login`;
  }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const loginPage = this.loginUrl;

    return next.handle(req).pipe(
      map(event => {
        if (event instanceof HttpResponse && event.url?.toLowerCase().startsWith(loginPage.toLowerCase())) {
          this.redirectToLogin();
        }
        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.redirectToLogin();
        }
        return throwError(() => error);
      })
    );
  }

  private redirectToLogin(): void {
    window.location.href = `${this.loginUrl}?ReturnUrl=${encodeURIComponent(window.location.pathname)}`;
  }
}
