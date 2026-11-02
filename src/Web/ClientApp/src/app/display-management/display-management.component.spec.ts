import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayManagementComponent } from './display-management.component';

describe('DisplayManagementComponent', () => {
  let component: DisplayManagementComponent;
  let fixture: ComponentFixture<DisplayManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisplayManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
