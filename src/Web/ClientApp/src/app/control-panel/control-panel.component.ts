import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { ControlPanelCubeComponent } from '../control-panel-cube/control-panel-cube.component';
import { ControlPanelFiltersComponent } from '../control-panel-filters/control-panel-filters.component';
import { DetailedDialogueComponent } from '../detailed-dialogue/detailed-dialogue.component';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [Button, RouterModule, DetailedDialogueComponent, ControlPanelCubeComponent, ControlPanelFiltersComponent],
  templateUrl: './control-panel.component.html',
  styleUrl: './control-panel.component.scss'
})
export class ControlPanelComponent {
readonly detailKey = signal<string | null>(null);

openDetail(key: string): void {
  this.detailKey.set(key);
}

closeDetail(): void {
  this.detailKey.set(null);
}

}
