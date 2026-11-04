import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DataManagementScreen } from './DataManagementScreen';

describe('DataManagementScreen', () => {
  let component: DataManagementScreen;
  let fixture: ComponentFixture<DataManagementScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataManagementScreen, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DataManagementScreen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle a row active state', () => {
    const row = component.rows[0];

    component.toggleRow(row);

    expect(row.active).toBeFalse();
  });

  it('should remove a row on delete', () => {
    const row = component.rows[0];
    const initialCount = component.rows.length;

    component.deleteRow(row);

    expect(component.rows.length).toBe(initialCount - 1);
    expect(component.rows.find((item) => item.id === row.id)).toBeUndefined();
  });
});
