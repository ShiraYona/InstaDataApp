import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlPanelCubeComponent } from './control-panel-cube.component';

describe('ControlPanelCubeComponent', () => {
  let component: ControlPanelCubeComponent;
  let fixture: ComponentFixture<ControlPanelCubeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlPanelCubeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlPanelCubeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
