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
import { DisplayLayoutService, MetricSettingItem } from '../shared/services/display-layout.service';

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
  providers: [ConfirmationService],
  templateUrl: './display-management.component.html',
  styleUrl: './display-management.component.scss'
})
export class DisplayManagementComponent implements OnInit {
  private readonly layoutService = inject(DisplayLayoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmationService = inject(ConfirmationService);

  saveState: 'idle' | 'saving' = 'idle';

  loading = signal(true);

  loadError = signal<string | null>(null);

  private readonly cardsPerRowTrigger$ = new Subject<number>();

  private readonly orderTrigger$ = new Subject<void>();

  cardsPerRow = 4;

  readonly cardsPerRowOptions = [
    { value: 2, label: '2 כרטיסים' },
    { value: 3, label: '3 כרטיסים' },
    { value: 4, label: '4 כרטיסים' },
  ];

  private readonly defaultCardsPerRow = 4;

  cards: DisplayCard[] = [];

  private serverItems = new Map<number, MetricSettingItem>();

  readonly previewSlots: number[] = Array.from({ length: 12 }, (_, i) => i + 1);

  ngOnInit(): void {
    this.layoutService
      .loadCardsPerRow()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.cardsPerRow = value ?? this.defaultCardsPerRow;
      });

    this.loadCards();

    this.cardsPerRowTrigger$
      .pipe(
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(value => this.persistCardsPerRow(value));

    this.orderTrigger$
      .pipe(
        debounceTime(400),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.persistOrder());
  }

  private loadCards(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.layoutService
      .loadMetricSettings()
      .pipe(take(1))
      .subscribe({
        next: response => {
          const items = response?.items ?? [];

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

  move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.cards.length) {
      return;
    }
    const reordered = [...this.cards];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    this.cards = reordered;
    this.queueOrderSave();
  }

  drop(event: CdkDragDrop<DisplayCard[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const reordered = [...this.cards];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.cards = reordered;
    this.queueOrderSave();
  }

  setVisibility(card: DisplayCard, visible: boolean): void {
    card.visible = visible;
    this.cards = [...this.cards];
    this.queueOrderSave();
  }

  setCardsPerRow(value: number): void {
    if (value === this.cardsPerRow) {
      return;
    }
    this.cardsPerRow = value;
    this.cardsPerRowTrigger$.next(value);
  }

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

  private queueOrderSave(): void {
    this.orderTrigger$.next();
  }

  private persistOrder(): void {
    if (!this.cards.length) {
      return;
    }

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
