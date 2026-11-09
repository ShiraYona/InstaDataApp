

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

    get(): Observable<Metric[]> {
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
                    return _observableThrow(e) as any as Observable<Metric[]>;
                }
            } else
                return _observableThrow(response_) as any as Observable<Metric[]>;
        }));
    }

    protected processGet(response: HttpResponseBase): Observable<Metric[]> {
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
                    result200!.push(Metric.fromJS(item));
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

    getClaims(): Observable<ClaimDto[]> {
        let url_ = this.baseUrl + "/api/Metrics/claims";
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

export class Metric implements IMetric {
    metricId?: number;
    metricName?: string;
    iconCode?: string | undefined;
    isActive?: boolean;
    createdDate?: Date;
    sourceId?: number;
    calculationType?: string;
    sumFieldId?: number | undefined;
    groupFieldId?: number | undefined;
    dateRangeType?: string;
    createdBy?: string;
    updatedBy?: string | undefined;
    updatedDate?: Date | undefined;
    rowVersion?: string;

    constructor(data?: IMetric) {
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
            this.isActive = _data["isActive"];
            this.createdDate = _data["createdDate"] ? new Date(_data["createdDate"].toString()) : <any>undefined;
            this.sourceId = _data["sourceId"];
            this.calculationType = _data["calculationType"];
            this.sumFieldId = _data["sumFieldId"];
            this.groupFieldId = _data["groupFieldId"];
            this.dateRangeType = _data["dateRangeType"];
            this.createdBy = _data["createdBy"];
            this.updatedBy = _data["updatedBy"];
            this.updatedDate = _data["updatedDate"] ? new Date(_data["updatedDate"].toString()) : <any>undefined;
            this.rowVersion = _data["rowVersion"];
        }
    }

    static fromJS(data: any): Metric {
        data = typeof data === 'object' ? data : {};
        let result = new Metric();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["metricId"] = this.metricId;
        data["metricName"] = this.metricName;
        data["iconCode"] = this.iconCode;
        data["isActive"] = this.isActive;
        data["createdDate"] = this.createdDate ? this.createdDate.toISOString() : <any>undefined;
        data["sourceId"] = this.sourceId;
        data["calculationType"] = this.calculationType;
        data["sumFieldId"] = this.sumFieldId;
        data["groupFieldId"] = this.groupFieldId;
        data["dateRangeType"] = this.dateRangeType;
        data["createdBy"] = this.createdBy;
        data["updatedBy"] = this.updatedBy;
        data["updatedDate"] = this.updatedDate ? this.updatedDate.toISOString() : <any>undefined;
        data["rowVersion"] = this.rowVersion;
        return data;
    }
}

export interface IMetric {
    metricId?: number;
    metricName?: string;
    iconCode?: string | undefined;
    isActive?: boolean;
    createdDate?: Date;
    sourceId?: number;
    calculationType?: string;
    sumFieldId?: number | undefined;
    groupFieldId?: number | undefined;
    dateRangeType?: string;
    createdBy?: string;
    updatedBy?: string | undefined;
    updatedDate?: Date | undefined;
    rowVersion?: string;
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

export interface IMetricSettingsDto {
    items?: MetricSettingsItemDto[];
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
    groupValue?: string | undefined;
    groups?: MetricGroupDto[];
    dateField?: string | undefined;
    isStale?: boolean;
    trend?: number;
    hasComparison?: boolean | undefined;
    trendPositive?: boolean;
    status?: string;
    updated?: boolean;
    targetText?: string | undefined;

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
            this.groupValue = _data["groupValue"];
            if (Array.isArray(_data["groups"])) {
                this.groups = [] as any;
                for (let item of _data["groups"])
                    this.groups!.push(MetricGroupDto.fromJS(item));
            }
            this.dateField = _data["dateField"];
            this.isStale = _data["isStale"];
            this.trend = _data["trend"];
            this.hasComparison = _data["hasComparison"];
            this.trendPositive = _data["trendPositive"];
            this.status = _data["status"];
            this.updated = _data["updated"];
            this.targetText = _data["targetText"];
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
        data["groupValue"] = this.groupValue;
        if (Array.isArray(this.groups)) {
            data["groups"] = [];
            for (let item of this.groups)
                data["groups"].push(item.toJSON());
        }
        data["dateField"] = this.dateField;
        data["isStale"] = this.isStale;
        data["trend"] = this.trend;
        data["hasComparison"] = this.hasComparison;
        data["trendPositive"] = this.trendPositive;
        data["status"] = this.status;
        data["updated"] = this.updated;
        data["targetText"] = this.targetText;
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
    groupValue?: string | undefined;
    groups?: MetricGroupDto[];
    dateField?: string | undefined;
    isStale?: boolean;
    trend?: number;
    hasComparison?: boolean | undefined;
    trendPositive?: boolean;
    status?: string;
    updated?: boolean;
    targetText?: string | undefined;
}

export class MetricGroupDto implements IMetricGroupDto {
    value?: string;
    records?: number;
    totalValue?: number | undefined;

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
        return data;
    }
}

export interface IMetricGroupDto {
    value?: string;
    records?: number;
    totalValue?: number | undefined;
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

export interface ISaveMetricSettingsRequest {
    items?: MetricSettingsItemDto[];
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