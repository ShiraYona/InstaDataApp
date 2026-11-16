import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { MetricCard } from '../models/controlPanel/MetricCard';
import { MetricDetail } from '../models/controlPanel/MetricDetail';
import { Payment } from '../models/controlPanel/Payment';
import { Fine } from '../models/controlPanel/Fine';
import { Claim } from '../models/controlPanel/Claim';

@Injectable({ providedIn: 'root' })
export class ControlPanel {
  private readonly http = inject(HttpClient);

  /** הכרטיסים הפעילים של הקובייה — מסוננים לפי תקופה (ימים) ושם נתון */
  getCards(metricName?: string | null, days?: number | null): Observable<MetricCard[]> {
    const p = new URLSearchParams();
    if (metricName?.trim()) p.set('metricName', metricName.trim());
    if (days != null) p.set('days', String(days));
    const q = p.toString();
    return this.http.get<MetricCard[]>(`/api/Metrics${q ? '?' + q : ''}`);
  }

  /** טבלת התשלומים */
  getTablePayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>('/api/Metrics/payments');
  }

  /** טבלת הקנסות */
  getTableFines(): Observable<Fine[]> {
    return this.http.get<Fine[]>('/api/Metrics/fines');
  }

  /** טבלת התביעות */
  getTableClaims(): Observable<Claim[]> {
    return this.http.get<Claim[]>('/api/Metrics/claims');
  }

  /** פירוט נתון — חלוקה לפי מערכת + רשומות */
  getDetails(key: string, sourceId?: number | null, groupValue?: string | null): Observable<MetricDetail> {
    const p = new URLSearchParams();
    if (sourceId != null) p.set('sourceId', String(sourceId));
    if (groupValue != null) p.set('groupValue', groupValue);
    const q = p.toString();
    return this.http.get<MetricDetail>(`/api/Metrics/${key}/details${q ? '?' + q : ''}`);
  }

getMetricDetail(id: number): Promise<MetricDetail> {
 return this.http.get<MetricDetail>(`/api/metrics/${id}/detail`).toPromise() as Promise<MetricDetail>;
}


}
