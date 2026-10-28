import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { AuthorizeInterceptor } from '../api-authorization/authorize.interceptor';
import { routes } from './app.routes';

export const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f0f4fa',
      100: '#dbe5f3',
      200: '#b9cbe7',
      300: '#8fadd6',
      400: '#5f88c1',
      500: '#3f6ba8',
      600: '#2f5289',
      700: '#27426e',
      800: '#20355a',
      900: '#1a2b48',
      950: '#101b2e'
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthorizeInterceptor, multi: true },
    provideAnimationsAsync(),
    MessageService,
    providePrimeNG({
      theme: {
        preset: MyPreset,
        options: {
          darkModeSelector: false
        }
      },
      translation: {
        accept: 'אישור',
        reject: 'ביטול',
        choose: 'בחירה',
        emptyMessage: 'לא נמצאו תוצאות',
        emptyFilterMessage: 'לא נמצאו תוצאות',
        monthNames: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
        dayNamesShort: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
        dayNames: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
      }
    })
  ]
};
