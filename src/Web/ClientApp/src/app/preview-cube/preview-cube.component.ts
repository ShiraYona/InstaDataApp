import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { MetricCard } from '../shared/models/controlPanel/MetricCard';

@Component({
  selector: 'app-preview-cube',
  standalone: true,
  imports: [CardModule],
  templateUrl: './preview-cube.component.html',
  styleUrl: './preview-cube.component.scss'
})
export class PreviewCubeComponent {
  @Input() card: MetricCard | null = null;
  /** מספר עמודות בכרטיס — 1 בתצוגה מקדימה של הדיאלוג */
  @Input() columns = 1;

}
