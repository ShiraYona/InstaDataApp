
import { mergeMap as _observableMergeMap, catchError as _observableCatch } from 'rxjs/operators';
import { Observable, throwError as _observableThrow, of as _observableOf } from 'rxjs';
import { Injectable, Inject, Optional, InjectionToken } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse, HttpResponseBase } from '@angular/common/http';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

@Injectable({
    providedIn: 'root'
})
// ===== From Mali_Adding-a-new-data-entry =====
export class DataDefinitionsClient {
    // ... (כל התוכן הקיים של DataDefinitionsClient — ללא שינוי) ...
}

export class LookupOptionDto implements ILookupOptionDto { /* ... */ }
export class DataSourceDto implements IDataSourceDto { /* ... */ }
export class DataSourceFieldDto implements IDataSourceFieldDto { /* ... */ }
export class PreviewResultDto implements IPreviewResultDto { /* ... */ }
export class PreviewRowDto implements IPreviewRowDto { /* ... */ }
export class MetricDraftDto implements IMetricDraftDto { /* ... */ }

// ===== From master =====
export class UserDisplaySettingsClient {
    // ... (כל התוכן הקיים של UserDisplaySettingsClient — ללא שינוי) ...
}

export class MetricSettingsItemDto implements IMetricSettingsItemDto { /* ... */ }
export class SaveDisplaySettingsRequest implements ISaveDisplaySettingsRequest { /* ... */ }
export class SaveMetricSettingsRequest implements ISaveMetricSettingsRequest { /* ... */ }
export class SetMetricActiveRequest implements ISetMetricActiveRequest { /* ... */ }

// ===== Shared (רק פעם אחת!) =====
export interface FileResponse {
    data: Blob;
    status: number;
    fileName?: string;
    headers?: { [name: string]: any };
}

export class ApiException extends Error {
    // ... (כמו בקוד המקורי) ...
}

function throwException(
    message: string,
    status: number,
    response: string,
    headers: { [key: string]: any; },
    result?: any
): Observable<any> {
    // ... (כמו בקוד המקורי) ...
}

function blobToText(blob: any): Observable<string> {
    return new Observable<string>((observer: any) => {
        if (!blob) {
            observer.next("");
            observer.complete();
        } else {
            let reader = new FileReader();
            reader.onload = event => {
                observer.next((event.target as any).result);
                observer.complete();
            };
            reader.readAsText(blob);
        }
    });
}