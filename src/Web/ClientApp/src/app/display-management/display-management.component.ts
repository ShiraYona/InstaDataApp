import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
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
import { Subject, debounceTime, take } from 'rxjs';
import { DisplayLayoutService, MetricSettingItem } from './display-layout.service';

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
export class DisplayManagementComponent implements OnInit {
  private readonly layoutService = inject(DisplayLayoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmationService = inject(ConfirmationService);

  /** מצב השמירה האוטומטית — לתצוגה למשתמש */
  saveState: 'idle' | 'saving' = 'idle';

  /** מצב טעינה — לתצוגה למשתמש */
  loading = signal(true);

  /** הודעת שגיאה אם הטעינה נכשלה */
  loadError = signal<string | null>(null);

  /** צינור שמירת מספר הכרטיסים בשורה בלבד */
  private readonly cardsPerRowTrigger$ = new Subject<number>();

  /** צינור שמירת סדר ונראות הכרטיסים — debounce כדי לא להציף את השרת */
  private readonly orderTrigger$ = new Subject<void>();

  /** מספר הכרטיסים בשורה (נשמר בשרת) */
  cardsPerRow = 4;

  /** האפשרויות בתפריט "מספר כרטיסים בשורה" */
  readonly cardsPerRowOptions = [
    { value: 2, label: '2 כרטיסים' },
    { value: 3, label: '3 כרטיסים' },
    { value: 4, label: '4 כרטיסים' },
  ];

  /** ברירת המחדל של מספר הכרטיסים — לאיפוס ולמקרה שהשרת לא עונה */
  private readonly defaultCardsPerRow = 4;

  /** הכרטיסים לפי הסדר הנוכחי שלהם בלוח הבקרה */
  cards: DisplayCard[] = [];

  /** הנתון המלא מהשרת — נדרש כדי לשמור בחזרה (metricName, iconCode) */
  private serverItems = new Map<number, MetricSettingItem>();

  /**
   * כרטיסי התצוגה המקדימה — 12 משבצות (3 שורות × 4), כמו בתמונה.
   * אלה לא אותם כרטיסים שברשימה; רק הדגמה של הלוח עצמו.
   */
  readonly previewSlots: number[] = Array.from({ length: 12 }, (_, i) => i + 1);

  ngOnInit(): void {
    // 1. מספר הכרטיסים בשורה — מהשרת (שמירה על הקיים).
    this.layoutService
      .loadCardsPerRow()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.cardsPerRow = value ?? this.defaultCardsPerRow;
      });

    // 2. הכרטיסים — מהשרת, מסודרים לפי הסדר האישי של המשתמש.
    this.loadCards();

    // 3. שמירת מספר הכרטיסים בשורה — בקשה אחת אחרי רגיעה.
    this.cardsPerRowTrigger$
      .pipe(
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(value => this.persistCardsPerRow(value));

    // 4. שמירת סדר/נראות — בקשה אחת אחרי רגיעה.
    this.orderTrigger$
      .pipe(
        debounceTime(400),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.persistOrder());
  }

  /** טעינת הכרטיסים מהשרת */
  private loadCards(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.layoutService
      .loadMetricSettings()
      .pipe(take(1))
      .subscribe({
        next: response => {
          const items = response?.items ?? [];

          // שמירת הנתון המלא לפי מזהה — נדרש לשמירה חוזרת
          this.serverItems = new Map(items.map(i => [i.metricId, i]));

          this.cards = items.map(i => ({
            id: i.metricId,
            label: i.metricName,
            visible: i.isVisible,
          }));

          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('לא ניתן לטעון את הכרטיסים. נסו לרענן את העמוד.');
          this.loading.set(false);
        },
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
    this.queueOrderSave();
  }

  /** גרירה ידנית של כרטיס למקום אחר ברשימה */
  drop(event: CdkDragDrop<DisplayCard[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const reordered = [...this.cards];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.cards = reordered;
    this.queueOrderSave();
  }

  /** עדכון מצב ההצגה של כרטיס — בלי להחליף את אובייקט הכרטיס */
  setVisibility(card: DisplayCard, visible: boolean): void {
    card.visible = visible;
    // יצירת מערך חדש כדי שהתבנית תתרענן גם אם השינוי בתוך האובייקט לא מזוהה
    this.cards = [...this.cards];
    this.queueOrderSave();
  }

  /** שינוי מספר הכרטיסים בשורה — נשלח לשמירה בשרת */
  setCardsPerRow(value: number): void {
    if (value === this.cardsPerRow) {
      return;
    }
    this.cardsPerRow = value;
    this.cardsPerRowTrigger$.next(value);
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
      dismissableMask: true,
      accept: () => this.resetLayout(),
    });
  }

  /**
   * איפוס: מספר כרטיסים לברירת המחדל, וטעינה מחדש מהשרת.
   * השרת מחזיר את הסדר המקורי כי עוד לא נשמר סדר אישי —
   * שולחים displayOrder = null לכל הפריטים כדי לאפס אותם.
   */
  resetLayout(): void {
    this.cardsPerRow = this.defaultCardsPerRow;
    this.cardsPerRowTrigger$.next(this.defaultCardsPerRow);

    // איפוס הסדר: שולחים null לכל displayOrder
    const items: MetricSettingItem[] = this.cards.map(c => {
      const original = this.serverItems.get(c.id);
      return {
        metricId: c.id,
        metricName: original?.metricName ?? c.label,
        iconCode: original?.iconCode ?? null,
        displayOrder: null,
        isVisible: true,
      };
    });

    this.saveState = 'saving';
    this.layoutService
      .saveMetricSettings(items)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.saveState = 'idle';
          this.loadCards();
        },
        error: () => {
          this.saveState = 'idle';
        },
      });
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

  /** סימון שצריך לשמור סדר/נראות — הבקשה תישלח אחרי רגיעה */
  private queueOrderSave(): void {
    this.orderTrigger$.next();
  }

  /** שמירת הסדר והנראות בשרת */
  private persistOrder(): void {
    if (!this.cards.length) {
      return;
    }

    // displayOrder מתחיל מ-1 לפי מיקום ברשימה
    const items: MetricSettingItem[] = this.cards.map((c, index) => {
      const original = this.serverItems.get(c.id);
      return {
        metricId: c.id,
        metricName: original?.metricName ?? c.label,
        iconCode: original?.iconCode ?? null,
        displayOrder: index + 1,
        isVisible: c.visible,
      };
    });

    this.saveState = 'saving';
    this.layoutService
      .saveMetricSettings(items)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.saveState = 'idle';
        },
        error: () => {
          this.saveState = 'idle';
          this.loadError.set('שמירת הסדר נכשלה. נסו שוב.');
        },
      });
  }

  /** שמירת מספר הכרטיסים בשורה בשרת */
  private persistCardsPerRow(value: number): void {
    this.saveState = 'saving';
    this.layoutService
      .saveCardsPerRow(value)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.saveState = 'idle';
        },
        error: () => {
          this.saveState = 'idle';
        },
      });
  }
}
