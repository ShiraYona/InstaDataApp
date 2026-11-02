import {
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { DisplayLayout, DisplayLayoutService } from './display-layout.service';

export interface DisplayCard {
  id: number;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-display-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DragDropModule,
    ToggleButtonModule,
    SelectModule,
    ButtonModule,
    ConfirmDialogModule,
    TagModule,
    TooltipModule,
  ],
  // ConfirmationService מקבל את הסטייל דרך styleClass של הדיאלוג,
  // ולכן הוא ניתן ברמת הרכיב ולא ב-providers גלובליים.
  providers: [ConfirmationService],
  templateUrl: './display-management.component.html',
  styleUrl: './display-management.component.scss'
})
export class DisplayManagementComponent implements OnInit{
  private readonly layoutService = inject(DisplayLayoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmationService = inject(ConfirmationService);

  /** מצב השמירה האוטומטית — לתצוגה למשתמש */
  saveState: 'idle' | 'saving' = 'idle';

  /** צינור השמירה: אוסף שינויים ומשדר שמירה אחת אחרי רגיעה קצרה */
  private readonly saveTrigger$ = new Subject<DisplayLayout>();

  /** השינוי שממתין ל-debounce — נשמר מיד ביציאה מהמסך */
  private pendingLayout: DisplayLayout | null = null;

  /** מספר הכרטיסים בשורה (נשמר בפריסה) */
  cardsPerRow = 4;

  /** האפשרויות בתפריט "מספר כרטיסים בשורה" */
  readonly cardsPerRowOptions = [
    { value: 2, label: '2 כרטיסים' },
    { value: 3, label: '3 כרטיסים' },
    { value: 4, label: '4 כרטיסים' },
  ];

  /** ברירת המחדל של מספר הכרטיסים — לאיפוס */
  private readonly defaultCardsPerRow = 4;

  /** הכרטיסים לפי הסדר הנוכחי שלהם בלוח הבקרה */
  cards: DisplayCard[] = [];

  /** ברירת המחדל — משמשת לאיפוס הדמו */
  private readonly defaultCards: DisplayCard[] = [
    { id: 1, label: 'שוברים שנוצרו במסלקה', visible: true },
    { id: 2, label: 'סכום שוברים במסלקה', visible: true },
    { id: 3, label: 'הנחות שנוצרו', visible: true },
    { id: 4, label: 'חשבונות חדשים', visible: true },
    { id: 5, label: 'תביעות פעילות חדשות', visible: true },
    { id: 6, label: 'התראות שנשלחו', visible: true },
    { id: 7, label: 'חילופי מחזיקים', visible: true },
    { id: 8, label: 'שינויי שומה', visible: true },
    { id: 9, label: 'הסדרים שהוקמו', visible: true },
    { id: 10, label: 'עיקולים שנשלחו', visible: true },
    { id: 11, label: 'עסקאות בקופה', visible: true },
    { id: 12, label: 'סכום הנחות', visible: true },
  ];

  /**
   * כרטיסי התצוגה המקדימה — 12 משבצות (3 שורות × 4), כמו בתמונה.
   * אלה לא אותם כרטיסים שברשימה; רק הדגמה של הלוח עצמו.
   */
  readonly previewSlots: number[] = Array.from({ length: 12 }, (_, i) => i + 1);

  ngOnInit(): void {
    // קודם בונים את המצב ההתחלתי, אחר כך משחזרים פריסה שמורה (אם יש).
    this.cards = this.defaultCards.map(c => ({ ...c }));
    this.restoreSavedLayout();

    // שמירה אוטומטית: ממתינים לרגיעה של 500ms בין שינויים
    this.saveTrigger$
      .pipe(
        debounceTime(500),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(layout => this.persist(layout));

    // שינוי שממתין ל-debounce בזמן יציאה מהמסך היה הולך לאיבוד — שומרים אותו עכשיו.
    this.destroyRef.onDestroy(() => {
      if (this.pendingLayout) {
        this.layoutService.save(this.pendingLayout);
        this.pendingLayout = null;
      }
    });
  }

  /** הזזת כרטיס מעלה/מטה ברשימה (כפתורי החצים) */
  move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.cards.length) {
      return;
    }
    // בניית מערך חדש ולא החלפה במקום — כדי ש-*ngFor יזהה את השינוי
    const reordered = [...this.cards];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    this.cards = reordered;
    this.scheduleSave();
  }

  /** גרירה ידנית של כרטיס למקום אחר ברשימה */
  drop(event: CdkDragDrop<DisplayCard[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const reordered = [...this.cards];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.cards = reordered;
    this.scheduleSave();
  }

  /** עדכון מצב ההצגה של כרטיס — בלי להחליף את אובייקט הכרטיס */
  setVisibility(card: DisplayCard, visible: boolean): void {
    card.visible = visible;
    // יצירת מערך חדש כדי שהתבנית תתרענן גם אם השינוי בתוך האובייקט לא מזוהה
    this.cards = [...this.cards];
    this.scheduleSave();
  }

  /** שינוי מספר הכרטיסים בשורה — משפיע על התצוגה המקדימה ועל הפריסה */
  setCardsPerRow(value: number): void {
    if (value === this.cardsPerRow) {
      return;
    }
    this.cardsPerRow = value;
    this.scheduleSave();
  }

  /** לחיצה על "איפוס הדמו" — מבקשת אישור לפני שמאפסים את המסך */
  confirmReset(): void {
    this.confirmationService.confirm({
      header: 'איפוס המסך לברירת מחדל',
      message:
        'הפעולה תאפס את סדר הכרטיסים, מצב ההצגה ומספר הכרטיסים בשורה. ' +
        'האם לאפס את המסך לברירת המחדל?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'כן, אפס',
      rejectLabel: 'ביטול',
      acceptButtonStyleClass: 'dm-confirm__accept',
      rejectButtonStyleClass: 'dm-confirm__reject',
      // RTL מוגדר ב-SCSS של הדיאלוג — הוא ממוקם ב-body ולכן לא יורש את כיווניות הרכיב.
      // את מחלקות העיצוב של הדיאלוג עצמו מסמנים דרך <p-confirmdialog styleClass>.
      dismissableMask: true,
      accept: () => this.resetLayout(),
    });
  }

  /** איפוס הדמו: סדר, מצב הצגה ומספר כרטיסים בשורה — לברירת המחדל */
  resetLayout(): void {
    this.cards = this.defaultCards.map(c => ({ ...c }));
    this.cardsPerRow = this.defaultCardsPerRow;
    this.scheduleSave();
  }

  trackByCardId(_index: number, card: DisplayCard): number {
    return card.id;
  }

  isFirst(index: number): boolean {
    return index === 0;
  }

  isLast(index: number): boolean {
    return index === this.cards.length - 1;
  }

  /** איסוף המצב הנוכחי ותזמון שמירה */
  private scheduleSave(): void {
    const layout = this.currentLayout();
    this.pendingLayout = layout;
    this.saveTrigger$.next(layout);
  }

  private currentLayout(): DisplayLayout {
    return {
      cardsPerRow: this.cardsPerRow,
      order: this.cards.map(c => c.id),
      visibleIds: this.cards.filter(c => c.visible).map(c => c.id),
    };
  }

  /** ביצוע השמירה בפועל + עדכון מחוון המצב */
  private persist(layout: DisplayLayout): void {
    this.pendingLayout = null;
    this.saveState = 'saving';
    this.layoutService.save(layout).subscribe({
      next: () => {
        // אין הודעת "נשמר" — המחוון חוזר למצב רגיל מיד עם סיום השמירה.
        this.saveState = 'idle';
      },
      error: () => {
        this.saveState = 'idle';
      },
    });
  }

  /** שחזור פריסה שמורה: סדר, מספר כרטיסים בשורה ומצב הצגה */
  private restoreSavedLayout(): void {
    const saved = this.layoutService.load();
    if (!saved) {
      return;
    }

    // שומרים את הערך השמור גם בלי ממשק לעריכתו — כדי לא לאבד הגדרה קיימת
    if (typeof saved.cardsPerRow === 'number') {
      this.cardsPerRow = saved.cardsPerRow;
    }

    // עובדים תמיד מול עותק של ברירת המחדל — כדי שכרטיסים שנמחקו מהפריסה
    // לא ייעלמו, וכרטיסים חדשים (שלא היו בשמירה) יתווספו בסוף.
    const byId = new Map(this.defaultCards.map(c => [c.id, { ...c }]));
    const ordered: DisplayCard[] = [];

    for (const id of saved.order ?? []) {
      const card = byId.get(id);
      if (card) {
        ordered.push(card);
        byId.delete(id);
      }
    }
    ordered.push(...byId.values());

    for (const card of ordered) {
      if (saved.visibleIds) {
        card.visible = saved.visibleIds.includes(card.id);
      }
    }

    this.cards = ordered;
  }
}
