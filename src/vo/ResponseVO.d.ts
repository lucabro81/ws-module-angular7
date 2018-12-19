
export interface ResponseVO<T> extends Response {
    http_status?: number;
    code?: string;
    message?: string;
    data:Array<T>;
}