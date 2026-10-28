import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { DetailedDialogueComponent } from './detailed-dialogue.component';

describe('DetailedDialogueComponent', () => {
  let component: DetailedDialogueComponent;
  let fixture: ComponentFixture<DetailedDialogueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailedDialogueComponent],
      providers: [
        // מנטרל אנימציות של p-dialog בבדיקות
        provideNoopAnimations(),
        // הקומפוננטה מזריקה Router (inject) — נדרש ספק מינימלי
        provideRouter([])
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DetailedDialogueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
