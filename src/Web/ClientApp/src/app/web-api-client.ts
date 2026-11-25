import { mergeMap as _observableMergeMap, catchError as _observableCatch } from 'rxjs/operators';
import { Observable, throwError as _observableThrow, of as _observableOf } from 'rxjs';
import { Injectable, Inject, Optional, InjectionToken } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse, HttpResponseBase } from '@angular/common/http';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

@Injectable({
    providedIn: 'root'
})
export class DataCatalogClient {
    private http: HttpClient;
    private baseUrl: string;
    protected jsonParseReviver: ((key: string, value: any) => any) | undefined = undefined;

    constructor(@Inject(HttpClient) http: HttpClient, @Optional() @Inject(API_BASE_URL) baseUrl?: string) {
        this.http = http;
        this.baseUrl = baseUrl ?? "";
    }

    get(): Observable<MetricListItemDto[]> {
        let url_ = this.baseUrl + "/api/DataCatalog";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGet(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGet(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<MetricListItemDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<MetricListItemDto[]>;
        }));
    }

    protected processGet(response: HttpResponseBase): Observable<MetricListItemDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(MetricListItemDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    update(id: number, rowVersion: string | null | undefined, draft: MetricDraftDto): Observable<FileResponse> {
        let url_ = this.baseUrl + "/api/DataCatalog/{id}";
        if (id === undefined || id === null)
            throw new Error("The parameter 'id' must be defined.");
        url_ = url_.replace("{id}", encodeURIComponent("" + id));
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(draft);

        let options_ : any = {
            body: content_,
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "If-Match": rowVersion !== undefined && rowVersion !== null ? "" + rowVersion : "",
                "Content-Type": "application/json",
                "Accept": "application/octet-stream"
            })
        };

        return this.http.request("put", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processUpdate(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processUpdate(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<FileResponse>;
                }
            } else
                return _observableThrow(response_) as any as Observable<FileResponse>;
        }));
    }

    protected processUpdate(response: HttpResponseBase): Observable<FileResponse> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200 || status === 206) {
            const contentDisposition = response.headers ? response.headers.get("content-disposition") : undefined;
            let fileNameMatch = contentDisposition ? /filename\*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/g.exec(contentDisposition) : undefined;
            let fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[3] || fileNameMatch[2] : undefined;
            if (fileName) {
                fileName = decodeURIComponent(fileName);
            } else {
                fileNameMatch = contentDisposition ? /filename="?([^"]*?)"?(;|$)/g.exec(contentDisposition) : undefined;
                fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[1] : undefined;
            }
            return _observableOf({ fileName: fileName, data: responseBlob as any, status: status, headers: _headers });
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    delete(id: number): Observable<FileResponse> {
        let url_ = this.baseUrl + "/api/DataCatalog/{id}";
        if (id === undefined || id === null)
            throw new Error("The parameter 'id' must be defined.");
        url_ = url_.replace("{id}", encodeURIComponent("" + id));
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/octet-stream"
            })
        };

        return this.http.request("delete", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processDelete(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processDelete(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<FileResponse>;
                }
            } else
                return _observableThrow(response_) as any as Observable<FileResponse>;
        }));
    }

    protected processDelete(response: HttpResponseBase): Observable<FileResponse> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200 || status === 206) {
            const contentDisposition = response.headers ? response.headers.get("content-disposition") : undefined;
            let fileNameMatch = contentDisposition ? /filename\*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/g.exec(contentDisposition) : undefined;
            let fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[3] || fileNameMatch[2] : undefined;
            if (fileName) {
                fileName = decodeURIComponent(fileName);
            } else {
                fileNameMatch = contentDisposition ? /filename="?([^"]*?)"?(;|$)/g.exec(contentDisposition) : undefined;
                fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[1] : undefined;
            }
            return _observableOf({ fileName: fileName, data: responseBlob as any, status: status, headers: _headers });
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    setActive(id: number, body: SetMetricActiveRequest): Observable<FileResponse> {
        let url_ = this.baseUrl + "/api/DataCatalog/{id}/active";
        if (id === undefined || id === null)
            throw new Error("The parameter 'id' must be defined.");
        url_ = url_.replace("{id}", encodeURIComponent("" + id));
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(body);

        let options_ : any = {
            body: content_,
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Content-Type": "application/json",
                "Accept": "application/octet-stream"
            })
        };

        return this.http.request("put", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processSetActive(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processSetActive(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<FileResponse>;
                }
            } else
                return _observableThrow(response_) as any as Observable<FileResponse>;
        }));
    }

    protected processSetActive(response: HttpResponseBase): Observable<FileResponse> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200 || status === 206) {
            const contentDisposition = response.headers ? response.headers.get("content-disposition") : undefined;
            let fileNameMatch = contentDisposition ? /filename\*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/g.exec(contentDisposition) : undefined;
            let fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[3] || fileNameMatch[2] : undefined;
            if (fileName) {
                fileName = decodeURIComponent(fileName);
            } else {
                fileNameMatch = contentDisposition ? /filename="?([^"]*?)"?(;|$)/g.exec(contentDisposition) : undefined;
                fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[1] : undefined;
            }
            return _observableOf({ fileName: fileName, data: responseBlob as any, status: status, headers: _headers });
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getCalculationDays(): Observable<CalculationDayDto[]> {
        let url_ = this.baseUrl + "/api/DataCatalog/calculation-days";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetCalculationDays(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetCalculationDays(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<CalculationDayDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<CalculationDayDto[]>;
        }));
    }

    protected processGetCalculationDays(response: HttpResponseBase): Observable<CalculationDayDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(CalculationDayDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }
}

@Injectable({
    providedIn: 'root'
})
export class DataDefinitionsClient {
    private http: HttpClient;
    private baseUrl: string;
    protected jsonParseReviver: ((key: string, value: any) => any) | undefined = undefined;

    constructor(@Inject(HttpClient) http: HttpClient, @Optional() @Inject(API_BASE_URL) baseUrl?: string) {
        this.http = http;
        this.baseUrl = baseUrl ?? "";
    }

    getSources(): Observable<LookupOptionDto[]> {
        let url_ = this.baseUrl + "/api/data-definitions/sources";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetSources(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetSources(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<LookupOptionDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<LookupOptionDto[]>;
        }));
    }

    protected processGetSources(response: HttpResponseBase): Observable<LookupOptionDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(LookupOptionDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getSource(sourceId: number): Observable<DataSourceDto> {
        let url_ = this.baseUrl + "/api/data-definitions/sources/{sourceId}";
        if (sourceId === undefined || sourceId === null)
            throw new Error("The parameter 'sourceId' must be defined.");
        url_ = url_.replace("{sourceId}", encodeURIComponent("" + sourceId));
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetSource(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetSource(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<DataSourceDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<DataSourceDto>;
        }));
    }

    protected processGetSource(response: HttpResponseBase): Observable<DataSourceDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = DataSourceDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getCardIcons(): Observable<LookupOptionDto[]> {
        let url_ = this.baseUrl + "/api/data-definitions/card-icons";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetCardIcons(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetCardIcons(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<LookupOptionDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<LookupOptionDto[]>;
        }));
    }

    protected processGetCardIcons(response: HttpResponseBase): Observable<LookupOptionDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(LookupOptionDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getCalculationPeriods(): Observable<LookupOptionDto[]> {
        let url_ = this.baseUrl + "/api/data-definitions/calculation-periods";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetCalculationPeriods(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetCalculationPeriods(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<LookupOptionDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<LookupOptionDto[]>;
        }));
    }

    protected processGetCalculationPeriods(response: HttpResponseBase): Observable<LookupOptionDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(LookupOptionDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getCalculationTypes(): Observable<LookupOptionDto[]> {
        let url_ = this.baseUrl + "/api/data-definitions/calculation-types";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetCalculationTypes(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetCalculationTypes(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<LookupOptionDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<LookupOptionDto[]>;
        }));
    }

    protected processGetCalculationTypes(response: HttpResponseBase): Observable<LookupOptionDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(LookupOptionDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getFilterOperators(): Observable<FilterOperatorDto[]> {
        let url_ = this.baseUrl + "/api/data-definitions/filter-operators";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetFilterOperators(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetFilterOperators(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<FilterOperatorDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<FilterOperatorDto[]>;
        }));
    }

    protected processGetFilterOperators(response: HttpResponseBase): Observable<FilterOperatorDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(FilterOperatorDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getCurrentDate(): Observable<Date> {
        let url_ = this.baseUrl + "/api/data-definitions/current-date";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetCurrentDate(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetCurrentDate(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<Date>;
                }
            } else
                return _observableThrow(response_) as any as Observable<Date>;
        }));
    }

    protected processGetCurrentDate(response: HttpResponseBase): Observable<Date> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
                result200 = resultData200 ? new Date(resultData200.toString()) : <any>null;
    
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    create(draft: MetricDraftDto): Observable<number> {
        let url_ = this.baseUrl + "/api/data-definitions";
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(draft);

        let options_ : any = {
            body: content_,
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Content-Type": "application/json",
                "Accept": "application/json"
            })
        };

        return this.http.request("post", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processCreate(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processCreate(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<number>;
                }
            } else
                return _observableThrow(response_) as any as Observable<number>;
        }));
    }

    protected processCreate(response: HttpResponseBase): Observable<number> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
                result200 = resultData200 !== undefined ? resultData200 : <any>null;
    
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }
}

@Injectable({
    providedIn: 'root'
})
export class MetricsClient {
    private http: HttpClient;
    private baseUrl: string;
    protected jsonParseReviver: ((key: string, value: any) => any) | undefined = undefined;

    constructor(@Inject(HttpClient) http: HttpClient, @Optional() @Inject(API_BASE_URL) baseUrl?: string) {
        this.http = http;
        this.baseUrl = baseUrl ?? "";
    }

    getActiveMetrics(metricName: string | null | undefined, fromDate: Date | null | undefined, toDate: Date | null | undefined): Observable<MetricCardDto[]> {
        let url_ = this.baseUrl + "/api/Metrics?";
        if (metricName !== undefined && metricName !== null)
            url_ += "metricName=" + encodeURIComponent("" + metricName) + "&";
        if (fromDate !== undefined && fromDate !== null)
            url_ += "fromDate=" + encodeURIComponent(fromDate ? "" + fromDate.toISOString() : "") + "&";
        if (toDate !== undefined && toDate !== null)
            url_ += "toDate=" + encodeURIComponent(toDate ? "" + toDate.toISOString() : "") + "&";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetActiveMetrics(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetActiveMetrics(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<MetricCardDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<MetricCardDto[]>;
        }));
    }

    protected processGetActiveMetrics(response: HttpResponseBase): Observable<MetricCardDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(MetricCardDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getPayments(): Observable<PaymentDto[]> {
        let url_ = this.baseUrl + "/api/Metrics/payments";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetPayments(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetPayments(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<PaymentDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<PaymentDto[]>;
        }));
    }

    protected processGetPayments(response: HttpResponseBase): Observable<PaymentDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(PaymentDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getFines(): Observable<FineDto[]> {
        let url_ = this.baseUrl + "/api/Metrics/fines";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetFines(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetFines(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<FineDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<FineDto[]>;
        }));
    }

    protected processGetFines(response: HttpResponseBase): Observable<FineDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(FineDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getClaims(): Observable<ClaimDto[]> {
        let url_ = this.baseUrl + "/api/Metrics/claims";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetClaims(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetClaims(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<ClaimDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<ClaimDto[]>;
        }));
    }

    protected processGetClaims(response: HttpResponseBase): Observable<ClaimDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(ClaimDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getDetails(key: string, groupValue: string | null | undefined, sourceId: number | null | undefined, search: string | null | undefined, fromDate: Date | null | undefined, toDate: Date | null | undefined): Observable<MetricDetailDto> {
        let url_ = this.baseUrl + "/api/Metrics/{key}/details?";
        if (key === undefined || key === null)
            throw new Error("The parameter 'key' must be defined.");
        url_ = url_.replace("{key}", encodeURIComponent("" + key));
        if (groupValue !== undefined && groupValue !== null)
            url_ += "groupValue=" + encodeURIComponent("" + groupValue) + "&";
        if (sourceId !== undefined && sourceId !== null)
            url_ += "sourceId=" + encodeURIComponent("" + sourceId) + "&";
        if (search !== undefined && search !== null)
            url_ += "search=" + encodeURIComponent("" + search) + "&";
        if (fromDate !== undefined && fromDate !== null)
            url_ += "fromDate=" + encodeURIComponent(fromDate ? "" + fromDate.toISOString() : "") + "&";
        if (toDate !== undefined && toDate !== null)
            url_ += "toDate=" + encodeURIComponent(toDate ? "" + toDate.toISOString() : "") + "&";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetDetails(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetDetails(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<MetricDetailDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<MetricDetailDto>;
        }));
    }

    protected processGetDetails(response: HttpResponseBase): Observable<MetricDetailDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = MetricDetailDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status === 404) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result404: any = null;
            let resultData404 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result404 = ProblemDetails.fromJS(resultData404);
            return throwException("A server side error occurred.", status, _responseText, _headers, result404);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    exportDetails(key: string, groupValue: string | null | undefined, sourceId: number | null | undefined, search: string | null | undefined, fromDate: Date | null | undefined, toDate: Date | null | undefined): Observable<void> {
        let url_ = this.baseUrl + "/api/Metrics/{key}/details/export?";
        if (key === undefined || key === null)
            throw new Error("The parameter 'key' must be defined.");
        url_ = url_.replace("{key}", encodeURIComponent("" + key));
        if (groupValue !== undefined && groupValue !== null)
            url_ += "groupValue=" + encodeURIComponent("" + groupValue) + "&";
        if (sourceId !== undefined && sourceId !== null)
            url_ += "sourceId=" + encodeURIComponent("" + sourceId) + "&";
        if (search !== undefined && search !== null)
            url_ += "search=" + encodeURIComponent("" + search) + "&";
        if (fromDate !== undefined && fromDate !== null)
            url_ += "fromDate=" + encodeURIComponent(fromDate ? "" + fromDate.toISOString() : "") + "&";
        if (toDate !== undefined && toDate !== null)
            url_ += "toDate=" + encodeURIComponent(toDate ? "" + toDate.toISOString() : "") + "&";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processExportDetails(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processExportDetails(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<void>;
                }
            } else
                return _observableThrow(response_) as any as Observable<void>;
        }));
    }

    protected processExportDetails(response: HttpResponseBase): Observable<void> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return _observableOf(null as any);
            }));
        } else if (status === 404) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result404: any = null;
            let resultData404 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result404 = ProblemDetails.fromJS(resultData404);
            return throwException("A server side error occurred.", status, _responseText, _headers, result404);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }
}

@Injectable({
    providedIn: 'root'
})
export class TasksClient {
    private http: HttpClient;
    private baseUrl: string;
    protected jsonParseReviver: ((key: string, value: any) => any) | undefined = undefined;

    constructor(@Inject(HttpClient) http: HttpClient, @Optional() @Inject(API_BASE_URL) baseUrl?: string) {
        this.http = http;
        this.baseUrl = baseUrl ?? "";
    }

    getAll(search: string | null | undefined, status: string[] | null | undefined, priority: string[] | null | undefined, sourceType: string[] | null | undefined, state: string[] | null | undefined, teamID: number | null | undefined, assignedUserID: string | null | undefined, dueFrom: string | null | undefined, dueTo: string | null | undefined, mineOnly: boolean | undefined, overdueOnly: boolean | undefined, period: number | null | undefined, metricFocus: string | null | undefined, sortKey: string | null | undefined, sortDirection: string | null | undefined, skip: number | null | undefined, take: number | null | undefined, completionScope: string | null | undefined): Observable<TaskDto[]> {
        let url_ = this.baseUrl + "/api/Tasks?";
        if (search !== undefined && search !== null)
            url_ += "Search=" + encodeURIComponent("" + search) + "&";
        if (status !== undefined && status !== null)
            status && status.forEach(item => { url_ += "Status=" + encodeURIComponent("" + item) + "&"; });
        if (priority !== undefined && priority !== null)
            priority && priority.forEach(item => { url_ += "Priority=" + encodeURIComponent("" + item) + "&"; });
        if (sourceType !== undefined && sourceType !== null)
            sourceType && sourceType.forEach(item => { url_ += "SourceType=" + encodeURIComponent("" + item) + "&"; });
        if (state !== undefined && state !== null)
            state && state.forEach(item => { url_ += "State=" + encodeURIComponent("" + item) + "&"; });
        if (teamID !== undefined && teamID !== null)
            url_ += "TeamID=" + encodeURIComponent("" + teamID) + "&";
        if (assignedUserID !== undefined && assignedUserID !== null)
            url_ += "AssignedUserID=" + encodeURIComponent("" + assignedUserID) + "&";
        if (dueFrom !== undefined && dueFrom !== null)
            url_ += "DueFrom=" + encodeURIComponent("" + dueFrom) + "&";
        if (dueTo !== undefined && dueTo !== null)
            url_ += "DueTo=" + encodeURIComponent("" + dueTo) + "&";
        if (mineOnly === null)
            throw new Error("The parameter 'mineOnly' cannot be null.");
        else if (mineOnly !== undefined)
            url_ += "MineOnly=" + encodeURIComponent("" + mineOnly) + "&";
        if (overdueOnly === null)
            throw new Error("The parameter 'overdueOnly' cannot be null.");
        else if (overdueOnly !== undefined)
            url_ += "OverdueOnly=" + encodeURIComponent("" + overdueOnly) + "&";
        if (period !== undefined && period !== null)
            url_ += "Period=" + encodeURIComponent("" + period) + "&";
        if (metricFocus !== undefined && metricFocus !== null)
            url_ += "MetricFocus=" + encodeURIComponent("" + metricFocus) + "&";
        if (sortKey !== undefined && sortKey !== null)
            url_ += "SortKey=" + encodeURIComponent("" + sortKey) + "&";
        if (sortDirection !== undefined && sortDirection !== null)
            url_ += "SortDirection=" + encodeURIComponent("" + sortDirection) + "&";
        if (skip !== undefined && skip !== null)
            url_ += "Skip=" + encodeURIComponent("" + skip) + "&";
        if (take !== undefined && take !== null)
            url_ += "Take=" + encodeURIComponent("" + take) + "&";
        if (completionScope !== undefined && completionScope !== null)
            url_ += "CompletionScope=" + encodeURIComponent("" + completionScope) + "&";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetAll(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetAll(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<TaskDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<TaskDto[]>;
        }));
    }

    protected processGetAll(response: HttpResponseBase): Observable<TaskDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(TaskDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    create(request: CreateTaskRequest): Observable<TaskDto> {
        let url_ = this.baseUrl + "/api/Tasks";
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(request);

        let options_ : any = {
            body: content_,
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Content-Type": "application/json",
                "Accept": "application/json"
            })
        };

        return this.http.request("post", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processCreate(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processCreate(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<TaskDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<TaskDto>;
        }));
    }

    protected processCreate(response: HttpResponseBase): Observable<TaskDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = TaskDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getById(id: number): Observable<TaskDto> {
        let url_ = this.baseUrl + "/api/Tasks/{id}";
        if (id === undefined || id === null)
            throw new Error("The parameter 'id' must be defined.");
        url_ = url_.replace("{id}", encodeURIComponent("" + id));
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetById(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetById(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<TaskDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<TaskDto>;
        }));
    }

    protected processGetById(response: HttpResponseBase): Observable<TaskDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = TaskDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    update(id: number, request: UpdateTaskRequest): Observable<TaskDto> {
        let url_ = this.baseUrl + "/api/Tasks/{id}";
        if (id === undefined || id === null)
            throw new Error("The parameter 'id' must be defined.");
        url_ = url_.replace("{id}", encodeURIComponent("" + id));
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(request);

        let options_ : any = {
            body: content_,
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Content-Type": "application/json",
                "Accept": "application/json"
            })
        };

        return this.http.request("put", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processUpdate(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processUpdate(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<TaskDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<TaskDto>;
        }));
    }

    protected processUpdate(response: HttpResponseBase): Observable<TaskDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = TaskDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getCount(search: string | null | undefined, status: string[] | null | undefined, priority: string[] | null | undefined, sourceType: string[] | null | undefined, state: string[] | null | undefined, teamID: number | null | undefined, assignedUserID: string | null | undefined, dueFrom: string | null | undefined, dueTo: string | null | undefined, mineOnly: boolean | undefined, overdueOnly: boolean | undefined, period: number | null | undefined, metricFocus: string | null | undefined, sortKey: string | null | undefined, sortDirection: string | null | undefined, skip: number | null | undefined, take: number | null | undefined, completionScope: string | null | undefined): Observable<number> {
        let url_ = this.baseUrl + "/api/Tasks/count?";
        if (search !== undefined && search !== null)
            url_ += "Search=" + encodeURIComponent("" + search) + "&";
        if (status !== undefined && status !== null)
            status && status.forEach(item => { url_ += "Status=" + encodeURIComponent("" + item) + "&"; });
        if (priority !== undefined && priority !== null)
            priority && priority.forEach(item => { url_ += "Priority=" + encodeURIComponent("" + item) + "&"; });
        if (sourceType !== undefined && sourceType !== null)
            sourceType && sourceType.forEach(item => { url_ += "SourceType=" + encodeURIComponent("" + item) + "&"; });
        if (state !== undefined && state !== null)
            state && state.forEach(item => { url_ += "State=" + encodeURIComponent("" + item) + "&"; });
        if (teamID !== undefined && teamID !== null)
            url_ += "TeamID=" + encodeURIComponent("" + teamID) + "&";
        if (assignedUserID !== undefined && assignedUserID !== null)
            url_ += "AssignedUserID=" + encodeURIComponent("" + assignedUserID) + "&";
        if (dueFrom !== undefined && dueFrom !== null)
            url_ += "DueFrom=" + encodeURIComponent("" + dueFrom) + "&";
        if (dueTo !== undefined && dueTo !== null)
            url_ += "DueTo=" + encodeURIComponent("" + dueTo) + "&";
        if (mineOnly === null)
            throw new Error("The parameter 'mineOnly' cannot be null.");
        else if (mineOnly !== undefined)
            url_ += "MineOnly=" + encodeURIComponent("" + mineOnly) + "&";
        if (overdueOnly === null)
            throw new Error("The parameter 'overdueOnly' cannot be null.");
        else if (overdueOnly !== undefined)
            url_ += "OverdueOnly=" + encodeURIComponent("" + overdueOnly) + "&";
        if (period !== undefined && period !== null)
            url_ += "Period=" + encodeURIComponent("" + period) + "&";
        if (metricFocus !== undefined && metricFocus !== null)
            url_ += "MetricFocus=" + encodeURIComponent("" + metricFocus) + "&";
        if (sortKey !== undefined && sortKey !== null)
            url_ += "SortKey=" + encodeURIComponent("" + sortKey) + "&";
        if (sortDirection !== undefined && sortDirection !== null)
            url_ += "SortDirection=" + encodeURIComponent("" + sortDirection) + "&";
        if (skip !== undefined && skip !== null)
            url_ += "Skip=" + encodeURIComponent("" + skip) + "&";
        if (take !== undefined && take !== null)
            url_ += "Take=" + encodeURIComponent("" + take) + "&";
        if (completionScope !== undefined && completionScope !== null)
            url_ += "CompletionScope=" + encodeURIComponent("" + completionScope) + "&";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetCount(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetCount(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<number>;
                }
            } else
                return _observableThrow(response_) as any as Observable<number>;
        }));
    }

    protected processGetCount(response: HttpResponseBase): Observable<number> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
                result200 = resultData200 !== undefined ? resultData200 : <any>null;
    
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getMetrics(completionScope: string | null | undefined): Observable<TaskMetricsDto> {
        let url_ = this.baseUrl + "/api/Tasks/metrics?";
        if (completionScope !== undefined && completionScope !== null)
            url_ += "completionScope=" + encodeURIComponent("" + completionScope) + "&";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetMetrics(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetMetrics(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<TaskMetricsDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<TaskMetricsDto>;
        }));
    }

    protected processGetMetrics(response: HttpResponseBase): Observable<TaskMetricsDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = TaskMetricsDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    markViewed(id: number): Observable<FileResponse> {
        let url_ = this.baseUrl + "/api/Tasks/{id}/view";
        if (id === undefined || id === null)
            throw new Error("The parameter 'id' must be defined.");
        url_ = url_.replace("{id}", encodeURIComponent("" + id));
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/octet-stream"
            })
        };

        return this.http.request("post", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processMarkViewed(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processMarkViewed(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<FileResponse>;
                }
            } else
                return _observableThrow(response_) as any as Observable<FileResponse>;
        }));
    }

    protected processMarkViewed(response: HttpResponseBase): Observable<FileResponse> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200 || status === 206) {
            const contentDisposition = response.headers ? response.headers.get("content-disposition") : undefined;
            let fileNameMatch = contentDisposition ? /filename\*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/g.exec(contentDisposition) : undefined;
            let fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[3] || fileNameMatch[2] : undefined;
            if (fileName) {
                fileName = decodeURIComponent(fileName);
            } else {
                fileNameMatch = contentDisposition ? /filename="?([^"]*?)"?(;|$)/g.exec(contentDisposition) : undefined;
                fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[1] : undefined;
            }
            return _observableOf({ fileName: fileName, data: responseBlob as any, status: status, headers: _headers });
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getLookups(): Observable<TaskLookupsDto> {
        let url_ = this.baseUrl + "/api/Tasks/lookups";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetLookups(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetLookups(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<TaskLookupsDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<TaskLookupsDto>;
        }));
    }

    protected processGetLookups(response: HttpResponseBase): Observable<TaskLookupsDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = TaskLookupsDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getComments(id: number): Observable<CommentDto[]> {
        let url_ = this.baseUrl + "/api/Tasks/{id}/comments";
        if (id === undefined || id === null)
            throw new Error("The parameter 'id' must be defined.");
        url_ = url_.replace("{id}", encodeURIComponent("" + id));
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetComments(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetComments(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<CommentDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<CommentDto[]>;
        }));
    }

    protected processGetComments(response: HttpResponseBase): Observable<CommentDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(CommentDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    addComment(id: number, request: AddCommentRequest): Observable<CommentDto> {
        let url_ = this.baseUrl + "/api/Tasks/{id}/comments";
        if (id === undefined || id === null)
            throw new Error("The parameter 'id' must be defined.");
        url_ = url_.replace("{id}", encodeURIComponent("" + id));
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(request);

        let options_ : any = {
            body: content_,
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Content-Type": "application/json",
                "Accept": "application/json"
            })
        };

        return this.http.request("post", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processAddComment(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processAddComment(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<CommentDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<CommentDto>;
        }));
    }

    protected processAddComment(response: HttpResponseBase): Observable<CommentDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = CommentDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getHistory(id: number): Observable<HistoryDto[]> {
        let url_ = this.baseUrl + "/api/Tasks/{id}/history";
        if (id === undefined || id === null)
            throw new Error("The parameter 'id' must be defined.");
        url_ = url_.replace("{id}", encodeURIComponent("" + id));
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetHistory(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetHistory(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<HistoryDto[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<HistoryDto[]>;
        }));
    }

    protected processGetHistory(response: HttpResponseBase): Observable<HistoryDto[]> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            if (Array.isArray(resultData200)) {
                result200 = [] as any;
                for (let item of resultData200)
                    result200!.push(HistoryDto.fromJS(item));
            }
            else {
                result200 = <any>null;
            }
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    changeStatus(id: number, request: ChangeStatusRequest): Observable<TaskDto> {
        let url_ = this.baseUrl + "/api/Tasks/{id}/status";
        if (id === undefined || id === null)
            throw new Error("The parameter 'id' must be defined.");
        url_ = url_.replace("{id}", encodeURIComponent("" + id));
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(request);

        let options_ : any = {
            body: content_,
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Content-Type": "application/json",
                "Accept": "application/json"
            })
        };

        return this.http.request("put", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processChangeStatus(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processChangeStatus(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<TaskDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<TaskDto>;
        }));
    }

    protected processChangeStatus(response: HttpResponseBase): Observable<TaskDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = TaskDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }
}

@Injectable({
    providedIn: 'root'
})
export class UserDisplaySettingsClient {
    private http: HttpClient;
    private baseUrl: string;
    protected jsonParseReviver: ((key: string, value: any) => any) | undefined = undefined;

    constructor(@Inject(HttpClient) http: HttpClient, @Optional() @Inject(API_BASE_URL) baseUrl?: string) {
        this.http = http;
        this.baseUrl = baseUrl ?? "";
    }

    get(): Observable<DisplaySettingsDto> {
        let url_ = this.baseUrl + "/api/user-display-settings";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGet(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGet(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<DisplaySettingsDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<DisplaySettingsDto>;
        }));
    }

    protected processGet(response: HttpResponseBase): Observable<DisplaySettingsDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = DisplaySettingsDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    put(request: SaveDisplaySettingsRequest): Observable<FileResponse> {
        let url_ = this.baseUrl + "/api/user-display-settings";
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(request);

        let options_ : any = {
            body: content_,
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Content-Type": "application/json",
                "Accept": "application/octet-stream"
            })
        };

        return this.http.request("put", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processPut(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processPut(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<FileResponse>;
                }
            } else
                return _observableThrow(response_) as any as Observable<FileResponse>;
        }));
    }

    protected processPut(response: HttpResponseBase): Observable<FileResponse> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200 || status === 206) {
            const contentDisposition = response.headers ? response.headers.get("content-disposition") : undefined;
            let fileNameMatch = contentDisposition ? /filename\*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/g.exec(contentDisposition) : undefined;
            let fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[3] || fileNameMatch[2] : undefined;
            if (fileName) {
                fileName = decodeURIComponent(fileName);
            } else {
                fileNameMatch = contentDisposition ? /filename="?([^"]*?)"?(;|$)/g.exec(contentDisposition) : undefined;
                fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[1] : undefined;
            }
            return _observableOf({ fileName: fileName, data: responseBlob as any, status: status, headers: _headers });
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    me(): Observable<UserIdDto> {
        let url_ = this.baseUrl + "/api/user-display-settings/me";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processMe(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processMe(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<UserIdDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<UserIdDto>;
        }));
    }

    protected processMe(response: HttpResponseBase): Observable<UserIdDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = UserIdDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getPeriod(): Observable<UserDisplayPeriodDto> {
        let url_ = this.baseUrl + "/api/user-display-settings/period";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetPeriod(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetPeriod(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<UserDisplayPeriodDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<UserDisplayPeriodDto>;
        }));
    }

    protected processGetPeriod(response: HttpResponseBase): Observable<UserDisplayPeriodDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = UserDisplayPeriodDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    putPeriod(request: SaveDisplayPeriodRequest): Observable<FileResponse> {
        let url_ = this.baseUrl + "/api/user-display-settings/period";
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(request);

        let options_ : any = {
            body: content_,
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Content-Type": "application/json",
                "Accept": "application/octet-stream"
            })
        };

        return this.http.request("put", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processPutPeriod(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processPutPeriod(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<FileResponse>;
                }
            } else
                return _observableThrow(response_) as any as Observable<FileResponse>;
        }));
    }

    protected processPutPeriod(response: HttpResponseBase): Observable<FileResponse> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200 || status === 206) {
            const contentDisposition = response.headers ? response.headers.get("content-disposition") : undefined;
            let fileNameMatch = contentDisposition ? /filename\*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/g.exec(contentDisposition) : undefined;
            let fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[3] || fileNameMatch[2] : undefined;
            if (fileName) {
                fileName = decodeURIComponent(fileName);
            } else {
                fileNameMatch = contentDisposition ? /filename="?([^"]*?)"?(;|$)/g.exec(contentDisposition) : undefined;
                fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[1] : undefined;
            }
            return _observableOf({ fileName: fileName, data: responseBlob as any, status: status, headers: _headers });
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    getMetrics(): Observable<MetricSettingsDto> {
        let url_ = this.baseUrl + "/api/user-display-settings/metrics";
        url_ = url_.replace(/[?&]$/, "");

        let options_ : any = {
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Accept": "application/json"
            })
        };

        return this.http.request("get", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processGetMetrics(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processGetMetrics(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<MetricSettingsDto>;
                }
            } else
                return _observableThrow(response_) as any as Observable<MetricSettingsDto>;
        }));
    }

    protected processGetMetrics(response: HttpResponseBase): Observable<MetricSettingsDto> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = MetricSettingsDto.fromJS(resultData200);
            return _observableOf(result200);
            }));
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }

    putMetrics(request: SaveMetricSettingsRequest): Observable<FileResponse> {
        let url_ = this.baseUrl + "/api/user-display-settings/metrics";
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(request);

        let options_ : any = {
            body: content_,
            observe: "response",
            responseType: "blob",
            headers: new HttpHeaders({
                "Content-Type": "application/json",
                "Accept": "application/octet-stream"
            })
        };

        return this.http.request("put", url_, options_).pipe(_observableMergeMap((response_ : any) => {
            return this.processPutMetrics(response_);
        })).pipe(_observableCatch((response_: any) => {
            if (response_ instanceof HttpResponseBase) {
                try {
                    return this.processPutMetrics(response_ as any);
                } catch (e) {
                    return _observableThrow(e) as any as Observable<FileResponse>;
                }
            } else
                return _observableThrow(response_) as any as Observable<FileResponse>;
        }));
    }

    protected processPutMetrics(response: HttpResponseBase): Observable<FileResponse> {
        const status = response.status;
        const responseBlob =
            response instanceof HttpResponse ? response.body :
            (response as any).error instanceof Blob ? (response as any).error : undefined;

        let _headers: any = {}; if (response.headers) { for (let key of response.headers.keys()) { _headers[key] = response.headers.get(key); }}
        if (status === 200 || status === 206) {
            const contentDisposition = response.headers ? response.headers.get("content-disposition") : undefined;
            let fileNameMatch = contentDisposition ? /filename\*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/g.exec(contentDisposition) : undefined;
            let fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[3] || fileNameMatch[2] : undefined;
            if (fileName) {
                fileName = decodeURIComponent(fileName);
            } else {
                fileNameMatch = contentDisposition ? /filename="?([^"]*?)"?(;|$)/g.exec(contentDisposition) : undefined;
                fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[1] : undefined;
            }
            return _observableOf({ fileName: fileName, data: responseBlob as any, status: status, headers: _headers });
        } else if (status !== 200 && status !== 204) {
            return blobToText(responseBlob).pipe(_observableMergeMap((_responseText: string) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            }));
        }
        return _observableOf(null as any);
    }
}

export class MetricListItemDto implements IMetricListItemDto {
    metricId?: number;
    metricName?: string;
    sourceId?: number;
    calculationTypeId?: number;
    calculationType?: string | undefined;
    sumFieldId?: number | undefined;
    groupFieldId?: number | undefined;
    dateRangeType?: string | undefined;
    iconCode?: string | undefined;
    isActive?: boolean;
    detailFieldIds?: number[];
    dateRangeValue?: string | undefined;
    rowVersion?: string | undefined;
    filtersJson?: string | undefined;

    constructor(data?: IMetricListItemDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.metricId = _data["metricId"];
            this.metricName = _data["metricName"];
            this.sourceId = _data["sourceId"];
            this.calculationTypeId = _data["calculationTypeId"];
            this.calculationType = _data["calculationType"];
            this.sumFieldId = _data["sumFieldId"];
            this.groupFieldId = _data["groupFieldId"];
            this.dateRangeType = _data["dateRangeType"];
            this.iconCode = _data["iconCode"];
            this.isActive = _data["isActive"];
            if (Array.isArray(_data["detailFieldIds"])) {
                this.detailFieldIds = [] as any;
                for (let item of _data["detailFieldIds"])
                    this.detailFieldIds!.push(item);
            }
            this.dateRangeValue = _data["dateRangeValue"];
            this.rowVersion = _data["rowVersion"];
            this.filtersJson = _data["filtersJson"];
        }
    }

    static fromJS(data: any): MetricListItemDto {
        data = typeof data === 'object' ? data : {};
        let result = new MetricListItemDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["metricId"] = this.metricId;
        data["metricName"] = this.metricName;
        data["sourceId"] = this.sourceId;
        data["calculationTypeId"] = this.calculationTypeId;
        data["calculationType"] = this.calculationType;
        data["sumFieldId"] = this.sumFieldId;
        data["groupFieldId"] = this.groupFieldId;
        data["dateRangeType"] = this.dateRangeType;
        data["iconCode"] = this.iconCode;
        data["isActive"] = this.isActive;
        if (Array.isArray(this.detailFieldIds)) {
            data["detailFieldIds"] = [];
            for (let item of this.detailFieldIds)
                data["detailFieldIds"].push(item);
        }
        data["dateRangeValue"] = this.dateRangeValue;
        data["rowVersion"] = this.rowVersion;
        data["filtersJson"] = this.filtersJson;
        return data;
    }
}

export interface IMetricListItemDto {
    metricId?: number;
    metricName?: string;
    sourceId?: number;
    calculationTypeId?: number;
    calculationType?: string | undefined;
    sumFieldId?: number | undefined;
    groupFieldId?: number | undefined;
    dateRangeType?: string | undefined;
    iconCode?: string | undefined;
    isActive?: boolean;
    detailFieldIds?: number[];
    dateRangeValue?: string | undefined;
    rowVersion?: string | undefined;
    filtersJson?: string | undefined;
}

export class MetricDraftDto implements IMetricDraftDto {
    name?: string;
    sourceId?: number;
    calculationTypeId?: number;
    sumFieldId?: number | undefined;
    groupFieldId?: number | undefined;
    dateRangeType?: string | undefined;
    dateFromFieldId?: number | undefined;
    dateToFieldId?: number | undefined;
    iconCode?: string | undefined;
    detailFieldIds?: number[];
    displayInDashboard?: boolean;
    filtersJson?: string | undefined;

    constructor(data?: IMetricDraftDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.name = _data["name"];
            this.sourceId = _data["sourceId"];
            this.calculationTypeId = _data["calculationTypeId"];
            this.sumFieldId = _data["sumFieldId"];
            this.groupFieldId = _data["groupFieldId"];
            this.dateRangeType = _data["dateRangeType"];
            this.dateFromFieldId = _data["dateFromFieldId"];
            this.dateToFieldId = _data["dateToFieldId"];
            this.iconCode = _data["iconCode"];
            if (Array.isArray(_data["detailFieldIds"])) {
                this.detailFieldIds = [] as any;
                for (let item of _data["detailFieldIds"])
                    this.detailFieldIds!.push(item);
            }
            this.displayInDashboard = _data["displayInDashboard"];
            this.filtersJson = _data["filtersJson"];
        }
    }

    static fromJS(data: any): MetricDraftDto {
        data = typeof data === 'object' ? data : {};
        let result = new MetricDraftDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["name"] = this.name;
        data["sourceId"] = this.sourceId;
        data["calculationTypeId"] = this.calculationTypeId;
        data["sumFieldId"] = this.sumFieldId;
        data["groupFieldId"] = this.groupFieldId;
        data["dateRangeType"] = this.dateRangeType;
        data["dateFromFieldId"] = this.dateFromFieldId;
        data["dateToFieldId"] = this.dateToFieldId;
        data["iconCode"] = this.iconCode;
        if (Array.isArray(this.detailFieldIds)) {
            data["detailFieldIds"] = [];
            for (let item of this.detailFieldIds)
                data["detailFieldIds"].push(item);
        }
        data["displayInDashboard"] = this.displayInDashboard;
        data["filtersJson"] = this.filtersJson;
        return data;
    }
}

export interface IMetricDraftDto {
    name?: string;
    sourceId?: number;
    calculationTypeId?: number;
    sumFieldId?: number | undefined;
    groupFieldId?: number | undefined;
    dateRangeType?: string | undefined;
    dateFromFieldId?: number | undefined;
    dateToFieldId?: number | undefined;
    iconCode?: string | undefined;
    detailFieldIds?: number[];
    displayInDashboard?: boolean;
    filtersJson?: string | undefined;
}

export class SetMetricActiveRequest implements ISetMetricActiveRequest {
    isActive?: boolean;

    constructor(data?: ISetMetricActiveRequest) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.isActive = _data["isActive"];
        }
    }

    static fromJS(data: any): SetMetricActiveRequest {
        data = typeof data === 'object' ? data : {};
        let result = new SetMetricActiveRequest();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["isActive"] = this.isActive;
        return data;
    }
}

export interface ISetMetricActiveRequest {
    isActive?: boolean;
}

export class CalculationDayDto implements ICalculationDayDto {
    id?: number;
    name?: string;
    value?: number;

    constructor(data?: ICalculationDayDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.id = _data["id"];
            this.name = _data["name"];
            this.value = _data["value"];
        }
    }

    static fromJS(data: any): CalculationDayDto {
        data = typeof data === 'object' ? data : {};
        let result = new CalculationDayDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["id"] = this.id;
        data["name"] = this.name;
        data["value"] = this.value;
        return data;
    }
}

export interface ICalculationDayDto {
    id?: number;
    name?: string;
    value?: number;
}

export class LookupOptionDto implements ILookupOptionDto {
    value?: string;
    label?: string;
    icon?: string | undefined;
    isSum?: boolean;
    code?: string | undefined;
    requiresSumField?: boolean;

    constructor(data?: ILookupOptionDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.value = _data["value"];
            this.label = _data["label"];
            this.icon = _data["icon"];
            this.isSum = _data["isSum"];
            this.code = _data["code"];
            this.requiresSumField = _data["requiresSumField"];
        }
    }

    static fromJS(data: any): LookupOptionDto {
        data = typeof data === 'object' ? data : {};
        let result = new LookupOptionDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["value"] = this.value;
        data["label"] = this.label;
        data["icon"] = this.icon;
        data["isSum"] = this.isSum;
        data["code"] = this.code;
        data["requiresSumField"] = this.requiresSumField;
        return data;
    }
}

export interface ILookupOptionDto {
    value?: string;
    label?: string;
    icon?: string | undefined;
    isSum?: boolean;
    code?: string | undefined;
    requiresSumField?: boolean;
}

export class DataSourceDto implements IDataSourceDto {
    sourceId?: number;
    label?: string;
    sourceType?: string;
    outputType?: string;
    dateFieldId?: number | undefined;
    hasDateParameters?: boolean;
    fields?: DataSourceFieldDto[];

    constructor(data?: IDataSourceDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.sourceId = _data["sourceId"];
            this.label = _data["label"];
            this.sourceType = _data["sourceType"];
            this.outputType = _data["outputType"];
            this.dateFieldId = _data["dateFieldId"];
            this.hasDateParameters = _data["hasDateParameters"];
            if (Array.isArray(_data["fields"])) {
                this.fields = [] as any;
                for (let item of _data["fields"])
                    this.fields!.push(DataSourceFieldDto.fromJS(item));
            }
        }
    }

    static fromJS(data: any): DataSourceDto {
        data = typeof data === 'object' ? data : {};
        let result = new DataSourceDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["sourceId"] = this.sourceId;
        data["label"] = this.label;
        data["sourceType"] = this.sourceType;
        data["outputType"] = this.outputType;
        data["dateFieldId"] = this.dateFieldId;
        data["hasDateParameters"] = this.hasDateParameters;
        if (Array.isArray(this.fields)) {
            data["fields"] = [];
            for (let item of this.fields)
                data["fields"].push(item.toJSON());
        }
        return data;
    }
}

export interface IDataSourceDto {
    sourceId?: number;
    label?: string;
    sourceType?: string;
    outputType?: string;
    dateFieldId?: number | undefined;
    hasDateParameters?: boolean;
    fields?: DataSourceFieldDto[];
}

export class DataSourceFieldDto implements IDataSourceFieldDto {
    fieldId?: number;
    label?: string;
    fieldName?: string;
    dataType?: string;
    isSummable?: boolean;
    isGroupable?: boolean;
    isFilterable?: boolean;
    filterInputType?: string | undefined;
    valueSource?: string | undefined;
    isNullable?: boolean | undefined;

    constructor(data?: IDataSourceFieldDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.fieldId = _data["fieldId"];
            this.label = _data["label"];
            this.fieldName = _data["fieldName"];
            this.dataType = _data["dataType"];
            this.isSummable = _data["isSummable"];
            this.isGroupable = _data["isGroupable"];
            this.isFilterable = _data["isFilterable"];
            this.filterInputType = _data["filterInputType"];
            this.valueSource = _data["valueSource"];
            this.isNullable = _data["isNullable"];
        }
    }

    static fromJS(data: any): DataSourceFieldDto {
        data = typeof data === 'object' ? data : {};
        let result = new DataSourceFieldDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["fieldId"] = this.fieldId;
        data["label"] = this.label;
        data["fieldName"] = this.fieldName;
        data["dataType"] = this.dataType;
        data["isSummable"] = this.isSummable;
        data["isGroupable"] = this.isGroupable;
        data["isFilterable"] = this.isFilterable;
        data["filterInputType"] = this.filterInputType;
        data["valueSource"] = this.valueSource;
        data["isNullable"] = this.isNullable;
        return data;
    }
}

export interface IDataSourceFieldDto {
    fieldId?: number;
    label?: string;
    fieldName?: string;
    dataType?: string;
    isSummable?: boolean;
    isGroupable?: boolean;
    isFilterable?: boolean;
    filterInputType?: string | undefined;
    valueSource?: string | undefined;
    isNullable?: boolean | undefined;
}

export class FilterOperatorDto implements IFilterOperatorDto {
    code?: string;
    label?: string;
    needsValue?: boolean;
    isMultiValue?: boolean;

    constructor(data?: IFilterOperatorDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.code = _data["code"];
            this.label = _data["label"];
            this.needsValue = _data["needsValue"];
            this.isMultiValue = _data["isMultiValue"];
        }
    }

    static fromJS(data: any): FilterOperatorDto {
        data = typeof data === 'object' ? data : {};
        let result = new FilterOperatorDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["code"] = this.code;
        data["label"] = this.label;
        data["needsValue"] = this.needsValue;
        data["isMultiValue"] = this.isMultiValue;
        return data;
    }
}

export interface IFilterOperatorDto {
    code?: string;
    label?: string;
    needsValue?: boolean;
    isMultiValue?: boolean;
}

export class MetricCardDto implements IMetricCardDto {
    key?: string;
    title?: string;
    icon?: string;
    value?: string;
    unit?: string | undefined;
    source?: string;
    sourceObject?: string;
    valueField?: string | undefined;
    groupField?: string | undefined;
    groupFieldLabel?: string | undefined;
    groups?: MetricGroupDto[];
    dateField?: string | undefined;
    isStale?: boolean;
    isError?: boolean;
    trend?: number;
    hasComparison?: boolean | undefined;
    trendPositive?: boolean;
    status?: string;
    updated?: boolean;
    targetText?: string | undefined;
    signType?: string | undefined;
    calcType?: string | undefined;

    constructor(data?: IMetricCardDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.key = _data["key"];
            this.title = _data["title"];
            this.icon = _data["icon"];
            this.value = _data["value"];
            this.unit = _data["unit"];
            this.source = _data["source"];
            this.sourceObject = _data["sourceObject"];
            this.valueField = _data["valueField"];
            this.groupField = _data["groupField"];
            this.groupFieldLabel = _data["groupFieldLabel"];
            if (Array.isArray(_data["groups"])) {
                this.groups = [] as any;
                for (let item of _data["groups"])
                    this.groups!.push(MetricGroupDto.fromJS(item));
            }
            this.dateField = _data["dateField"];
            this.isStale = _data["isStale"];
            this.isError = _data["isError"];
            this.trend = _data["trend"];
            this.hasComparison = _data["hasComparison"];
            this.trendPositive = _data["trendPositive"];
            this.status = _data["status"];
            this.updated = _data["updated"];
            this.targetText = _data["targetText"];
            this.signType = _data["signType"];
            this.calcType = _data["calcType"];
        }
    }

    static fromJS(data: any): MetricCardDto {
        data = typeof data === 'object' ? data : {};
        let result = new MetricCardDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["key"] = this.key;
        data["title"] = this.title;
        data["icon"] = this.icon;
        data["value"] = this.value;
        data["unit"] = this.unit;
        data["source"] = this.source;
        data["sourceObject"] = this.sourceObject;
        data["valueField"] = this.valueField;
        data["groupField"] = this.groupField;
        data["groupFieldLabel"] = this.groupFieldLabel;
        if (Array.isArray(this.groups)) {
            data["groups"] = [];
            for (let item of this.groups)
                data["groups"].push(item.toJSON());
        }
        data["dateField"] = this.dateField;
        data["isStale"] = this.isStale;
        data["isError"] = this.isError;
        data["trend"] = this.trend;
        data["hasComparison"] = this.hasComparison;
        data["trendPositive"] = this.trendPositive;
        data["status"] = this.status;
        data["updated"] = this.updated;
        data["targetText"] = this.targetText;
        data["signType"] = this.signType;
        data["calcType"] = this.calcType;
        return data;
    }
}

export interface IMetricCardDto {
    key?: string;
    title?: string;
    icon?: string;
    value?: string;
    unit?: string | undefined;
    source?: string;
    sourceObject?: string;
    valueField?: string | undefined;
    groupField?: string | undefined;
    groupFieldLabel?: string | undefined;
    groups?: MetricGroupDto[];
    dateField?: string | undefined;
    isStale?: boolean;
    isError?: boolean;
    trend?: number;
    hasComparison?: boolean | undefined;
    trendPositive?: boolean;
    status?: string;
    updated?: boolean;
    targetText?: string | undefined;
    signType?: string | undefined;
    calcType?: string | undefined;
}

export class MetricGroupDto implements IMetricGroupDto {
    value?: string;
    records?: number;
    totalValue?: number | undefined;
    isError?: boolean;

    constructor(data?: IMetricGroupDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.value = _data["value"];
            this.records = _data["records"];
            this.totalValue = _data["totalValue"];
            this.isError = _data["isError"];
        }
    }

    static fromJS(data: any): MetricGroupDto {
        data = typeof data === 'object' ? data : {};
        let result = new MetricGroupDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["value"] = this.value;
        data["records"] = this.records;
        data["totalValue"] = this.totalValue;
        data["isError"] = this.isError;
        return data;
    }
}

export interface IMetricGroupDto {
    value?: string;
    records?: number;
    totalValue?: number | undefined;
    isError?: boolean;
}

export class PaymentDto implements IPaymentDto {
    paymentId?: number;
    paymentDate?: string;
    payerName?: string;
    paymentsCount?: number;
    fullPayment?: number;
    paymentDepartment?: string | undefined;

    constructor(data?: IPaymentDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.paymentId = _data["paymentId"];
            this.paymentDate = _data["paymentDate"];
            this.payerName = _data["payerName"];
            this.paymentsCount = _data["paymentsCount"];
            this.fullPayment = _data["fullPayment"];
            this.paymentDepartment = _data["paymentDepartment"];
        }
    }

    static fromJS(data: any): PaymentDto {
        data = typeof data === 'object' ? data : {};
        let result = new PaymentDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["paymentId"] = this.paymentId;
        data["paymentDate"] = this.paymentDate;
        data["payerName"] = this.payerName;
        data["paymentsCount"] = this.paymentsCount;
        data["fullPayment"] = this.fullPayment;
        data["paymentDepartment"] = this.paymentDepartment;
        return data;
    }
}

export interface IPaymentDto {
    paymentId?: number;
    paymentDate?: string;
    payerName?: string;
    paymentsCount?: number;
    fullPayment?: number;
    paymentDepartment?: string | undefined;
}

export class FineDto implements IFineDto {
    fineId?: number;
    payerName?: string;
    fineDate?: string;
    fineReason?: string | undefined;
    fineAmount?: number;
    isPaid?: boolean;

    constructor(data?: IFineDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.fineId = _data["fineId"];
            this.payerName = _data["payerName"];
            this.fineDate = _data["fineDate"];
            this.fineReason = _data["fineReason"];
            this.fineAmount = _data["fineAmount"];
            this.isPaid = _data["isPaid"];
        }
    }

    static fromJS(data: any): FineDto {
        data = typeof data === 'object' ? data : {};
        let result = new FineDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["fineId"] = this.fineId;
        data["payerName"] = this.payerName;
        data["fineDate"] = this.fineDate;
        data["fineReason"] = this.fineReason;
        data["fineAmount"] = this.fineAmount;
        data["isPaid"] = this.isPaid;
        return data;
    }
}

export interface IFineDto {
    fineId?: number;
    payerName?: string;
    fineDate?: string;
    fineReason?: string | undefined;
    fineAmount?: number;
    isPaid?: boolean;
}

export class ClaimDto implements IClaimDto {
    claimId?: number;
    claimDate?: string;
    claimantName?: string;
    claimDescription?: string | undefined;
    claimAmount?: number;
    claimantsCount?: number;
    claimDepartment?: string | undefined;

    constructor(data?: IClaimDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.claimId = _data["claimId"];
            this.claimDate = _data["claimDate"];
            this.claimantName = _data["claimantName"];
            this.claimDescription = _data["claimDescription"];
            this.claimAmount = _data["claimAmount"];
            this.claimantsCount = _data["claimantsCount"];
            this.claimDepartment = _data["claimDepartment"];
        }
    }

    static fromJS(data: any): ClaimDto {
        data = typeof data === 'object' ? data : {};
        let result = new ClaimDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["claimId"] = this.claimId;
        data["claimDate"] = this.claimDate;
        data["claimantName"] = this.claimantName;
        data["claimDescription"] = this.claimDescription;
        data["claimAmount"] = this.claimAmount;
        data["claimantsCount"] = this.claimantsCount;
        data["claimDepartment"] = this.claimDepartment;
        return data;
    }
}

export interface IClaimDto {
    claimId?: number;
    claimDate?: string;
    claimantName?: string;
    claimDescription?: string | undefined;
    claimAmount?: number;
    claimantsCount?: number;
    claimDepartment?: string | undefined;
}

export class MetricDetailDto implements IMetricDetailDto {
    key?: string;
    title?: string;
    dataValue?: string;
    recordsInSample?: number;
    sourceName?: string;
    createdDate?: string;
    valueFieldName?: string | undefined;
    groupFieldName?: string | undefined;
    groupFieldLabel?: string;
    totalRecords?: number;
    totalValue?: number | undefined;
    systems?: SystemGroupDto[];
    columns?: DetailColumnDto[];
    records?: { [key: string]: any; }[];
    isStale?: boolean;
    signType?: string | undefined;
    calcType?: string | undefined;

    constructor(data?: IMetricDetailDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.key = _data["key"];
            this.title = _data["title"];
            this.dataValue = _data["dataValue"];
            this.recordsInSample = _data["recordsInSample"];
            this.sourceName = _data["sourceName"];
            this.createdDate = _data["createdDate"];
            this.valueFieldName = _data["valueFieldName"];
            this.groupFieldName = _data["groupFieldName"];
            this.groupFieldLabel = _data["groupFieldLabel"];
            this.totalRecords = _data["totalRecords"];
            this.totalValue = _data["totalValue"];
            if (Array.isArray(_data["systems"])) {
                this.systems = [] as any;
                for (let item of _data["systems"])
                    this.systems!.push(SystemGroupDto.fromJS(item));
            }
            if (Array.isArray(_data["columns"])) {
                this.columns = [] as any;
                for (let item of _data["columns"])
                    this.columns!.push(DetailColumnDto.fromJS(item));
            }
            if (Array.isArray(_data["records"])) {
                this.records = [] as any;
                for (let item of _data["records"])
                    this.records!.push(item);
            }
            this.isStale = _data["isStale"];
            this.signType = _data["signType"];
            this.calcType = _data["calcType"];
        }
    }

    static fromJS(data: any): MetricDetailDto {
        data = typeof data === 'object' ? data : {};
        let result = new MetricDetailDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["key"] = this.key;
        data["title"] = this.title;
        data["dataValue"] = this.dataValue;
        data["recordsInSample"] = this.recordsInSample;
        data["sourceName"] = this.sourceName;
        data["createdDate"] = this.createdDate;
        data["valueFieldName"] = this.valueFieldName;
        data["groupFieldName"] = this.groupFieldName;
        data["groupFieldLabel"] = this.groupFieldLabel;
        data["totalRecords"] = this.totalRecords;
        data["totalValue"] = this.totalValue;
        if (Array.isArray(this.systems)) {
            data["systems"] = [];
            for (let item of this.systems)
                data["systems"].push(item.toJSON());
        }
        if (Array.isArray(this.columns)) {
            data["columns"] = [];
            for (let item of this.columns)
                data["columns"].push(item.toJSON());
        }
        if (Array.isArray(this.records)) {
            data["records"] = [];
            for (let item of this.records)
                data["records"].push(item);
        }
        data["isStale"] = this.isStale;
        data["signType"] = this.signType;
        data["calcType"] = this.calcType;
        return data;
    }
}

export interface IMetricDetailDto {
    key?: string;
    title?: string;
    dataValue?: string;
    recordsInSample?: number;
    sourceName?: string;
    createdDate?: string;
    valueFieldName?: string | undefined;
    groupFieldName?: string | undefined;
    groupFieldLabel?: string;
    totalRecords?: number;
    totalValue?: number | undefined;
    systems?: SystemGroupDto[];
    columns?: DetailColumnDto[];
    records?: { [key: string]: any; }[];
    isStale?: boolean;
    signType?: string | undefined;
    calcType?: string | undefined;
}

export class SystemGroupDto implements ISystemGroupDto {
    sourceId?: number;
    sourceName?: string;
    groupValue?: string;
    records?: number;
    totalValue?: number | undefined;
    isError?: boolean;

    constructor(data?: ISystemGroupDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.sourceId = _data["sourceId"];
            this.sourceName = _data["sourceName"];
            this.groupValue = _data["groupValue"];
            this.records = _data["records"];
            this.totalValue = _data["totalValue"];
            this.isError = _data["isError"];
        }
    }

    static fromJS(data: any): SystemGroupDto {
        data = typeof data === 'object' ? data : {};
        let result = new SystemGroupDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["sourceId"] = this.sourceId;
        data["sourceName"] = this.sourceName;
        data["groupValue"] = this.groupValue;
        data["records"] = this.records;
        data["totalValue"] = this.totalValue;
        data["isError"] = this.isError;
        return data;
    }
}

export interface ISystemGroupDto {
    sourceId?: number;
    sourceName?: string;
    groupValue?: string;
    records?: number;
    totalValue?: number | undefined;
    isError?: boolean;
}

export class DetailColumnDto implements IDetailColumnDto {
    fieldName?: string;
    label?: string;
    dataType?: string;
    isHidden?: boolean;

    constructor(data?: IDetailColumnDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.fieldName = _data["fieldName"];
            this.label = _data["label"];
            this.dataType = _data["dataType"];
            this.isHidden = _data["isHidden"];
        }
    }

    static fromJS(data: any): DetailColumnDto {
        data = typeof data === 'object' ? data : {};
        let result = new DetailColumnDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["fieldName"] = this.fieldName;
        data["label"] = this.label;
        data["dataType"] = this.dataType;
        data["isHidden"] = this.isHidden;
        return data;
    }
}

export interface IDetailColumnDto {
    fieldName?: string;
    label?: string;
    dataType?: string;
    isHidden?: boolean;
}

export class ProblemDetails implements IProblemDetails {
    type?: string | undefined;
    title?: string | undefined;
    status?: number | undefined;
    detail?: string | undefined;
    instance?: string | undefined;

    [key: string]: any;

    constructor(data?: IProblemDetails) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            for (var property in _data) {
                if (_data.hasOwnProperty(property))
                    this[property] = _data[property];
            }
            this.type = _data["type"];
            this.title = _data["title"];
            this.status = _data["status"];
            this.detail = _data["detail"];
            this.instance = _data["instance"];
        }
    }

    static fromJS(data: any): ProblemDetails {
        data = typeof data === 'object' ? data : {};
        let result = new ProblemDetails();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        for (var property in this) {
            if (this.hasOwnProperty(property))
                data[property] = this[property];
        }
        data["type"] = this.type;
        data["title"] = this.title;
        data["status"] = this.status;
        data["detail"] = this.detail;
        data["instance"] = this.instance;
        return data;
    }
}

export interface IProblemDetails {
    type?: string | undefined;
    title?: string | undefined;
    status?: number | undefined;
    detail?: string | undefined;
    instance?: string | undefined;

    [key: string]: any;
}

export class TaskDto implements ITaskDto {
    taskID?: number;
    taskTitle?: string;
    taskDescription?: string | undefined;
    teamID?: number;
    assignedUserID?: string | undefined;
    priority?: string;
    status?: string;
    dueDate?: string;
    completedDate?: string | undefined;
    cancelledDate?: string | undefined;
    sourceType?: string;
    sourceSystemCode?: string | undefined;
    sourceEntityType?: string | undefined;
    sourceEntityID?: string | undefined;
    sourceURL?: string | undefined;
    metricID?: number | undefined;
    createdBy?: string;
    createdDate?: string;
    updatedBy?: string | undefined;
    updatedDate?: string | undefined;
    rowVersion?: string;
    isNewForMe?: boolean;

    constructor(data?: ITaskDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.taskID = _data["taskID"];
            this.taskTitle = _data["taskTitle"];
            this.taskDescription = _data["taskDescription"];
            this.teamID = _data["teamID"];
            this.assignedUserID = _data["assignedUserID"];
            this.priority = _data["priority"];
            this.status = _data["status"];
            this.dueDate = _data["dueDate"];
            this.completedDate = _data["completedDate"];
            this.cancelledDate = _data["cancelledDate"];
            this.sourceType = _data["sourceType"];
            this.sourceSystemCode = _data["sourceSystemCode"];
            this.sourceEntityType = _data["sourceEntityType"];
            this.sourceEntityID = _data["sourceEntityID"];
            this.sourceURL = _data["sourceURL"];
            this.metricID = _data["metricID"];
            this.createdBy = _data["createdBy"];
            this.createdDate = _data["createdDate"];
            this.updatedBy = _data["updatedBy"];
            this.updatedDate = _data["updatedDate"];
            this.rowVersion = _data["rowVersion"];
            this.isNewForMe = _data["isNewForMe"];
        }
    }

    static fromJS(data: any): TaskDto {
        data = typeof data === 'object' ? data : {};
        let result = new TaskDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["taskID"] = this.taskID;
        data["taskTitle"] = this.taskTitle;
        data["taskDescription"] = this.taskDescription;
        data["teamID"] = this.teamID;
        data["assignedUserID"] = this.assignedUserID;
        data["priority"] = this.priority;
        data["status"] = this.status;
        data["dueDate"] = this.dueDate;
        data["completedDate"] = this.completedDate;
        data["cancelledDate"] = this.cancelledDate;
        data["sourceType"] = this.sourceType;
        data["sourceSystemCode"] = this.sourceSystemCode;
        data["sourceEntityType"] = this.sourceEntityType;
        data["sourceEntityID"] = this.sourceEntityID;
        data["sourceURL"] = this.sourceURL;
        data["metricID"] = this.metricID;
        data["createdBy"] = this.createdBy;
        data["createdDate"] = this.createdDate;
        data["updatedBy"] = this.updatedBy;
        data["updatedDate"] = this.updatedDate;
        data["rowVersion"] = this.rowVersion;
        data["isNewForMe"] = this.isNewForMe;
        return data;
    }
}

export interface ITaskDto {
    taskID?: number;
    taskTitle?: string;
    taskDescription?: string | undefined;
    teamID?: number;
    assignedUserID?: string | undefined;
    priority?: string;
    status?: string;
    dueDate?: string;
    completedDate?: string | undefined;
    cancelledDate?: string | undefined;
    sourceType?: string;
    sourceSystemCode?: string | undefined;
    sourceEntityType?: string | undefined;
    sourceEntityID?: string | undefined;
    sourceURL?: string | undefined;
    metricID?: number | undefined;
    createdBy?: string;
    createdDate?: string;
    updatedBy?: string | undefined;
    updatedDate?: string | undefined;
    rowVersion?: string;
    isNewForMe?: boolean;
}

export class TaskMetricsDto implements ITaskMetricsDto {
    open?: number;
    inProgress?: number;
    late?: number;
    highPriority?: number;
    completed?: number;
    completedOnTime?: number;
    onTimeRatePercent?: number | undefined;
    total?: number;

    constructor(data?: ITaskMetricsDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.open = _data["open"];
            this.inProgress = _data["inProgress"];
            this.late = _data["late"];
            this.highPriority = _data["highPriority"];
            this.completed = _data["completed"];
            this.completedOnTime = _data["completedOnTime"];
            this.onTimeRatePercent = _data["onTimeRatePercent"];
            this.total = _data["total"];
        }
    }

    static fromJS(data: any): TaskMetricsDto {
        data = typeof data === 'object' ? data : {};
        let result = new TaskMetricsDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["open"] = this.open;
        data["inProgress"] = this.inProgress;
        data["late"] = this.late;
        data["highPriority"] = this.highPriority;
        data["completed"] = this.completed;
        data["completedOnTime"] = this.completedOnTime;
        data["onTimeRatePercent"] = this.onTimeRatePercent;
        data["total"] = this.total;
        return data;
    }
}

export interface ITaskMetricsDto {
    open?: number;
    inProgress?: number;
    late?: number;
    highPriority?: number;
    completed?: number;
    completedOnTime?: number;
    onTimeRatePercent?: number | undefined;
    total?: number;
}

export class TaskLookupsDto implements ITaskLookupsDto {
    teams?: LookupItemDto[];
    people?: LookupItemDto[];

    constructor(data?: ITaskLookupsDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            if (Array.isArray(_data["teams"])) {
                this.teams = [] as any;
                for (let item of _data["teams"])
                    this.teams!.push(LookupItemDto.fromJS(item));
            }
            if (Array.isArray(_data["people"])) {
                this.people = [] as any;
                for (let item of _data["people"])
                    this.people!.push(LookupItemDto.fromJS(item));
            }
        }
    }

    static fromJS(data: any): TaskLookupsDto {
        data = typeof data === 'object' ? data : {};
        let result = new TaskLookupsDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        if (Array.isArray(this.teams)) {
            data["teams"] = [];
            for (let item of this.teams)
                data["teams"].push(item.toJSON());
        }
        if (Array.isArray(this.people)) {
            data["people"] = [];
            for (let item of this.people)
                data["people"].push(item.toJSON());
        }
        return data;
    }
}

export interface ITaskLookupsDto {
    teams?: LookupItemDto[];
    people?: LookupItemDto[];
}

export class LookupItemDto implements ILookupItemDto {
    value?: string;
    label?: string;
    teamID?: number | undefined;

    constructor(data?: ILookupItemDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.value = _data["value"];
            this.label = _data["label"];
            this.teamID = _data["teamID"];
        }
    }

    static fromJS(data: any): LookupItemDto {
        data = typeof data === 'object' ? data : {};
        let result = new LookupItemDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["value"] = this.value;
        data["label"] = this.label;
        data["teamID"] = this.teamID;
        return data;
    }
}

export interface ILookupItemDto {
    value?: string;
    label?: string;
    teamID?: number | undefined;
}

export class CommentDto implements ICommentDto {
    commentID?: number;
    taskID?: number;
    commentText?: string;
    createdBy?: string;
    createdDate?: string;

    constructor(data?: ICommentDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.commentID = _data["commentID"];
            this.taskID = _data["taskID"];
            this.commentText = _data["commentText"];
            this.createdBy = _data["createdBy"];
            this.createdDate = _data["createdDate"];
        }
    }

    static fromJS(data: any): CommentDto {
        data = typeof data === 'object' ? data : {};
        let result = new CommentDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["commentID"] = this.commentID;
        data["taskID"] = this.taskID;
        data["commentText"] = this.commentText;
        data["createdBy"] = this.createdBy;
        data["createdDate"] = this.createdDate;
        return data;
    }
}

export interface ICommentDto {
    commentID?: number;
    taskID?: number;
    commentText?: string;
    createdBy?: string;
    createdDate?: string;
}

export class HistoryDto implements IHistoryDto {
    historyID?: number;
    taskID?: number;
    actionType?: string;
    fieldName?: string | undefined;
    oldValue?: string | undefined;
    newValue?: string | undefined;
    changedBy?: string;
    changedDate?: string;

    constructor(data?: IHistoryDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.historyID = _data["historyID"];
            this.taskID = _data["taskID"];
            this.actionType = _data["actionType"];
            this.fieldName = _data["fieldName"];
            this.oldValue = _data["oldValue"];
            this.newValue = _data["newValue"];
            this.changedBy = _data["changedBy"];
            this.changedDate = _data["changedDate"];
        }
    }

    static fromJS(data: any): HistoryDto {
        data = typeof data === 'object' ? data : {};
        let result = new HistoryDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["historyID"] = this.historyID;
        data["taskID"] = this.taskID;
        data["actionType"] = this.actionType;
        data["fieldName"] = this.fieldName;
        data["oldValue"] = this.oldValue;
        data["newValue"] = this.newValue;
        data["changedBy"] = this.changedBy;
        data["changedDate"] = this.changedDate;
        return data;
    }
}

export interface IHistoryDto {
    historyID?: number;
    taskID?: number;
    actionType?: string;
    fieldName?: string | undefined;
    oldValue?: string | undefined;
    newValue?: string | undefined;
    changedBy?: string;
    changedDate?: string;
}

export class UpdateTaskRequest implements IUpdateTaskRequest {
    taskTitle?: string;
    taskDescription?: string | undefined;
    teamID?: number;
    assignedUserID?: string | undefined;
    priority?: string;
    dueDate?: string;
    rowVersion?: string | undefined;

    constructor(data?: IUpdateTaskRequest) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.taskTitle = _data["taskTitle"];
            this.taskDescription = _data["taskDescription"];
            this.teamID = _data["teamID"];
            this.assignedUserID = _data["assignedUserID"];
            this.priority = _data["priority"];
            this.dueDate = _data["dueDate"];
            this.rowVersion = _data["rowVersion"];
        }
    }

    static fromJS(data: any): UpdateTaskRequest {
        data = typeof data === 'object' ? data : {};
        let result = new UpdateTaskRequest();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["taskTitle"] = this.taskTitle;
        data["taskDescription"] = this.taskDescription;
        data["teamID"] = this.teamID;
        data["assignedUserID"] = this.assignedUserID;
        data["priority"] = this.priority;
        data["dueDate"] = this.dueDate;
        data["rowVersion"] = this.rowVersion;
        return data;
    }
}

export interface IUpdateTaskRequest {
    taskTitle?: string;
    taskDescription?: string | undefined;
    teamID?: number;
    assignedUserID?: string | undefined;
    priority?: string;
    dueDate?: string;
    rowVersion?: string | undefined;
}

export class ChangeStatusRequest implements IChangeStatusRequest {
    status?: string;
    rowVersion?: string | undefined;

    constructor(data?: IChangeStatusRequest) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.status = _data["status"];
            this.rowVersion = _data["rowVersion"];
        }
    }

    static fromJS(data: any): ChangeStatusRequest {
        data = typeof data === 'object' ? data : {};
        let result = new ChangeStatusRequest();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["status"] = this.status;
        data["rowVersion"] = this.rowVersion;
        return data;
    }
}

export interface IChangeStatusRequest {
    status?: string;
    rowVersion?: string | undefined;
}

export class AddCommentRequest implements IAddCommentRequest {
    commentText?: string;

    constructor(data?: IAddCommentRequest) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.commentText = _data["commentText"];
        }
    }

    static fromJS(data: any): AddCommentRequest {
        data = typeof data === 'object' ? data : {};
        let result = new AddCommentRequest();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["commentText"] = this.commentText;
        return data;
    }
}

export interface IAddCommentRequest {
    commentText?: string;
}

export class CreateTaskRequest implements ICreateTaskRequest {
    taskTitle?: string;
    taskDescription?: string | undefined;
    teamID?: number;
    assignedUserID?: string | undefined;
    priority?: string;
    dueDate?: string;
    sourceSystemCode?: string | undefined;
    sourceEntityType?: string | undefined;
    sourceEntityID?: string | undefined;
    sourceURL?: string | undefined;
    metricID?: number | undefined;

    constructor(data?: ICreateTaskRequest) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.taskTitle = _data["taskTitle"];
            this.taskDescription = _data["taskDescription"];
            this.teamID = _data["teamID"];
            this.assignedUserID = _data["assignedUserID"];
            this.priority = _data["priority"];
            this.dueDate = _data["dueDate"];
            this.sourceSystemCode = _data["sourceSystemCode"];
            this.sourceEntityType = _data["sourceEntityType"];
            this.sourceEntityID = _data["sourceEntityID"];
            this.sourceURL = _data["sourceURL"];
            this.metricID = _data["metricID"];
        }
    }

    static fromJS(data: any): CreateTaskRequest {
        data = typeof data === 'object' ? data : {};
        let result = new CreateTaskRequest();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["taskTitle"] = this.taskTitle;
        data["taskDescription"] = this.taskDescription;
        data["teamID"] = this.teamID;
        data["assignedUserID"] = this.assignedUserID;
        data["priority"] = this.priority;
        data["dueDate"] = this.dueDate;
        data["sourceSystemCode"] = this.sourceSystemCode;
        data["sourceEntityType"] = this.sourceEntityType;
        data["sourceEntityID"] = this.sourceEntityID;
        data["sourceURL"] = this.sourceURL;
        data["metricID"] = this.metricID;
        return data;
    }
}

export interface ICreateTaskRequest {
    taskTitle?: string;
    taskDescription?: string | undefined;
    teamID?: number;
    assignedUserID?: string | undefined;
    priority?: string;
    dueDate?: string;
    sourceSystemCode?: string | undefined;
    sourceEntityType?: string | undefined;
    sourceEntityID?: string | undefined;
    sourceURL?: string | undefined;
    metricID?: number | undefined;
}

export class DisplaySettingsDto implements IDisplaySettingsDto {
    cardsPerRow?: number;

    constructor(data?: IDisplaySettingsDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.cardsPerRow = _data["cardsPerRow"];
        }
    }

    static fromJS(data: any): DisplaySettingsDto {
        data = typeof data === 'object' ? data : {};
        let result = new DisplaySettingsDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["cardsPerRow"] = this.cardsPerRow;
        return data;
    }
}

export interface IDisplaySettingsDto {
    cardsPerRow?: number;
}

export class UserIdDto implements IUserIdDto {
    id?: string;

    constructor(data?: IUserIdDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.id = _data["id"];
        }
    }

    static fromJS(data: any): UserIdDto {
        data = typeof data === 'object' ? data : {};
        let result = new UserIdDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["id"] = this.id;
        return data;
    }
}

export interface IUserIdDto {
    id?: string;
}

export class UserDisplayPeriodDto implements IUserDisplayPeriodDto {
    periodDays?: number;

    constructor(data?: IUserDisplayPeriodDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.periodDays = _data["periodDays"];
        }
    }

    static fromJS(data: any): UserDisplayPeriodDto {
        data = typeof data === 'object' ? data : {};
        let result = new UserDisplayPeriodDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["periodDays"] = this.periodDays;
        return data;
    }
}

export interface IUserDisplayPeriodDto {
    periodDays?: number;
}

export class SaveDisplayPeriodRequest implements ISaveDisplayPeriodRequest {
    days?: number;

    constructor(data?: ISaveDisplayPeriodRequest) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.days = _data["days"];
        }
    }

    static fromJS(data: any): SaveDisplayPeriodRequest {
        data = typeof data === 'object' ? data : {};
        let result = new SaveDisplayPeriodRequest();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["days"] = this.days;
        return data;
    }
}

export interface ISaveDisplayPeriodRequest {
    days?: number;
}

export class MetricSettingsDto implements IMetricSettingsDto {
    items?: MetricSettingsItemDto[];

    constructor(data?: IMetricSettingsDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            if (Array.isArray(_data["items"])) {
                this.items = [] as any;
                for (let item of _data["items"])
                    this.items!.push(MetricSettingsItemDto.fromJS(item));
            }
        }
    }

    static fromJS(data: any): MetricSettingsDto {
        data = typeof data === 'object' ? data : {};
        let result = new MetricSettingsDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        if (Array.isArray(this.items)) {
            data["items"] = [];
            for (let item of this.items)
                data["items"].push(item.toJSON());
        }
        return data;
    }
}

export interface IMetricSettingsDto {
    items?: MetricSettingsItemDto[];
}

export class MetricSettingsItemDto implements IMetricSettingsItemDto {
    metricId?: number;
    metricName?: string;
    iconCode?: string | undefined;
    displayOrder?: number | undefined;
    isVisible?: boolean;

    constructor(data?: IMetricSettingsItemDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.metricId = _data["metricId"];
            this.metricName = _data["metricName"];
            this.iconCode = _data["iconCode"];
            this.displayOrder = _data["displayOrder"];
            this.isVisible = _data["isVisible"];
        }
    }

    static fromJS(data: any): MetricSettingsItemDto {
        data = typeof data === 'object' ? data : {};
        let result = new MetricSettingsItemDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["metricId"] = this.metricId;
        data["metricName"] = this.metricName;
        data["iconCode"] = this.iconCode;
        data["displayOrder"] = this.displayOrder;
        data["isVisible"] = this.isVisible;
        return data;
    }
}

export interface IMetricSettingsItemDto {
    metricId?: number;
    metricName?: string;
    iconCode?: string | undefined;
    displayOrder?: number | undefined;
    isVisible?: boolean;
}

export class SaveDisplaySettingsRequest implements ISaveDisplaySettingsRequest {
    cardsPerRow?: number;

    constructor(data?: ISaveDisplaySettingsRequest) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.cardsPerRow = _data["cardsPerRow"];
        }
    }

    static fromJS(data: any): SaveDisplaySettingsRequest {
        data = typeof data === 'object' ? data : {};
        let result = new SaveDisplaySettingsRequest();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["cardsPerRow"] = this.cardsPerRow;
        return data;
    }
}

export interface ISaveDisplaySettingsRequest {
    cardsPerRow?: number;
}

export class SaveMetricSettingsRequest implements ISaveMetricSettingsRequest {
    items?: MetricSettingsItemDto[];

    constructor(data?: ISaveMetricSettingsRequest) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            if (Array.isArray(_data["items"])) {
                this.items = [] as any;
                for (let item of _data["items"])
                    this.items!.push(MetricSettingsItemDto.fromJS(item));
            }
        }
    }

    static fromJS(data: any): SaveMetricSettingsRequest {
        data = typeof data === 'object' ? data : {};
        let result = new SaveMetricSettingsRequest();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        if (Array.isArray(this.items)) {
            data["items"] = [];
            for (let item of this.items)
                data["items"].push(item.toJSON());
        }
        return data;
    }
}

export interface ISaveMetricSettingsRequest {
    items?: MetricSettingsItemDto[];
}

export interface FileResponse {
    data: Blob;
    status: number;
    fileName?: string;
    headers?: { [name: string]: any };
}

export class ApiException extends Error {
    override message: string;
    status: number;
    response: string;
    headers: { [key: string]: any; };
    result: any;

    constructor(message: string, status: number, response: string, headers: { [key: string]: any; }, result: any) {
        super();

        this.message = message;
        this.status = status;
        this.response = response;
        this.headers = headers;
        this.result = result;
    }

    protected isApiException = true;

    static isApiException(obj: any): obj is ApiException {
        return obj.isApiException === true;
    }
}

function throwException(message: string, status: number, response: string, headers: { [key: string]: any; }, result?: any): Observable<any> {
    if (result !== null && result !== undefined)
        return _observableThrow(result);
    else
        return _observableThrow(new ApiException(message, status, response, headers, null));
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