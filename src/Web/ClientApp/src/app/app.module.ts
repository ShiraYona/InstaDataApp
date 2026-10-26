import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RouterModule, Routes } from '@angular/router';
import { ModalModule } from 'ngx-bootstrap/modal';
import { MessageService } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

import { AuthorizeInterceptor } from '../api-authorization/authorize.interceptor';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { MenueComponent } from './menue/menue.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: '**', redirectTo: '' }
];

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

@NgModule({
  declarations: [
    AppComponent,
    MenueComponent,
    HomeComponent
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'ng-cli-universal' }),
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forRoot(routes),
    ModalModule.forRoot(),
    MenuModule
  ],
  providers: [
    MessageService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthorizeInterceptor, multi: true },
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
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
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
