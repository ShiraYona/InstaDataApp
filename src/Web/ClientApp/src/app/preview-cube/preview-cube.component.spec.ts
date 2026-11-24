import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreviewCubeComponent } from './preview-cube.component';
import { MetricCard } from '../shared/models/controlPanel/MetricCard';

describe('PreviewCubeComponent', () => {
  let fixture: ComponentFixture<PreviewCubeComponent>;
  let host: HTMLElement;

  /** כרטיס בסיסי — כל בדיקה דורסת רק את השדות הרלוונטיים לה */
  function baseCard(overrides: Partial<MetricCard> = {}): MetricCard {
    return {
      key: 'preview',
      title: 'מדד לדוגמה',
      value: '100',
      source: 'מקור לדוגמה',
      ...overrides
    };
  }

  /** יוצרת את הקומפוננטה עם כרטיס נתון ומחזירה את הטקסט שהוצג */
  function render(card: MetricCard | null): string {
    fixture = TestBed.createComponent(PreviewCubeComponent);
    fixture.componentInstance.card = card;
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    return (host.querySelector('.preview-panel p')?.textContent ?? '').trim();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreviewCubeComponent]
    }).compileComponents();
  });

  it('should create', () => {
    const created = TestBed.createComponent(PreviewCubeComponent);
    expect(created.componentInstance).toBeTruthy();
  });

  it('אינו מציג פאנל כשאין כרטיס', () => {
    render(null);
    expect(host.querySelector('.preview-panel')).toBeNull();
  });

  it('SUM — מציג את הסימן מיד אחרי הערך', () => {
    const text = render(baseCard({ calcType: 'SUM', signType: '₪' }));
    expect(text).toContain('100 ₪');
  });

  it('SUM בלי סימן — מציג את הערך בלי סימן ובלי ערך חסר', () => {
    const text = render(baseCard({ calcType: 'SUM', signType: '' }));
    expect(text).toContain('100');
    expect(text).not.toContain('₪');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
  });

  it('COUNT בלי סימן — מציג את הערך בלי סימן', () => {
    const text = render(baseCard({ calcType: 'COUNT', signType: '' }));
    expect(text).toContain('100');
    expect(text).not.toContain('₪');
  });

  it('ערך חסר — לא מציג "undefined"', () => {
    const text = render(baseCard({ value: undefined }));
    expect(text).not.toContain('undefined');
  });

  it('מציג את שם המדד', () => {
    const text = render(baseCard({ title: 'מדד לדוגמה' }));
    expect(text).toContain('מדד לדוגמה');
  });

  it('שם מדד ריק — מציג "ללא שם"', () => {
    const text = render(baseCard({ title: '   ' }));
    expect(text).toContain('ללא שם');
  });

  it('מקור חסר — מציג "ללא"', () => {
    const text = render(baseCard({ source: '' }));
    expect(text).toContain('ללא');
  });
});
