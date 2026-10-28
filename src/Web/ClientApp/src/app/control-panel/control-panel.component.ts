import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { ControlPanelCubeComponent } from '../control-panel-cube/control-panel-cube.component';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [Button,RouterModule,ControlPanelCubeComponent],
  templateUrl: './control-panel.component.html',
  styleUrl: './control-panel.component.scss'
})
export class ControlPanelComponent {

}
