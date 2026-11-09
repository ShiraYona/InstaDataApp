
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

export class Metric implements IMetric {
    metricId?: number;
    metricName?: string;
    sourceId?: number;
    calculationType?: string;
    sumFieldId?: number | undefined;
    groupFieldId?: number | undefined;
    dateRangeType?: string;
    iconCode?: string | undefined;
    isActive?: boolean;
    createdBy?: string;
    createdDate?: Date;
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
            this.sourceId = _data["sourceId"];
            this.calculationType = _data["calculationType"];
            this.sumFieldId = _data["sumFieldId"];
            this.groupFieldId = _data["groupFieldId"];
            this.dateRangeType = _data["dateRangeType"];
            this.iconCode = _data["iconCode"];
            this.isActive = _data["isActive"];
            this.createdBy = _data["createdBy"];
            this.createdDate = _data["createdDate"] ? new Date(_data["createdDate"].toString()) : <any>undefined;
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
        data["sourceId"] = this.sourceId;
        data["calculationType"] = this.calculationType;
        data["sumFieldId"] = this.sumFieldId;
        data["groupFieldId"] = this.groupFieldId;
        data["dateRangeType"] = this.dateRangeType;
        data["iconCode"] = this.iconCode;
        data["isActive"] = this.isActive;
        data["createdBy"] = this.createdBy;
        data["createdDate"] = this.createdDate ? this.createdDate.toISOString() : <any>undefined;
        data["updatedBy"] = this.updatedBy;
        data["updatedDate"] = this.updatedDate ? this.updatedDate.toISOString() : <any>undefined;
        data["rowVersion"] = this.rowVersion;
        return data;
    }
}

export interface IMetric {
    metricId?: number;
    metricName?: string;
    sourceId?: number;
    calculationType?: string;
    sumFieldId?: number | undefined;
    groupFieldId?: number | undefined;
    dateRangeType?: string;
    iconCode?: string | undefined;
    isActive?: boolean;
    createdBy?: string;
    createdDate?: Date;
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