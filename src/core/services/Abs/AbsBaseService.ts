import { WarningLevel } from "../../../utils/Emun";
import { Signal } from "signals";
import { RequestVO } from "../../../vo/RequestVO";
import { OverrideRequestDataVO } from "../../../vo/OverrideRequestDataVO";

import {AbsListener} from "../Listener/AbsListener";
import {AbsHandlerManager} from "./AbsHandlerManager";
import {RequestManager} from "../System/RequestManager";
import {IService} from "../System/IService";
import { Observable, throwError } from 'rxjs';
import { retry, flatMap, catchError } from 'rxjs/operators';

import {ResponseVO} from "../../../vo/ResponseVO";
import {DefaultAlertStructureVO} from "../../../vo/DefaultAlertStructureVO";
import {Configuration} from "../../SetConfig";
import { HttpClient, HttpEvent } from "@angular/common/http";

export class AbsBaseService extends AbsHandlerManager {

    protected static is_connection_enabled:boolean = true;

    [method_name: string]: any;

    /**
     *
     */
    constructor(public http: HttpClient) {
        super()
    }

///////////////////////////////
////////// PROTECTED //////////
///////////////////////////////

    /**
     * Gestisce una richiesta http GET, di default gestisce anche la fine della richiesta
     *
     * @param options                   oggetto che descrive la richiesta
     * @returns {Observable<Response>}
     */
    protected requestGet<T extends Response>(options:RequestVO):Observable<T> {

        console.log("registrazione richiesta", this);

        options.config.headers = this.setHeaders(options);
        options.config.observe = 'body';

        let url:string = this.setSegmentedUrl(options.endpoint.url, options.data);
        if (options.data && options.data.body) {
            // parse body to query string
            url += "?" + Object.keys(options.data.body).map(function (k) {
                    return encodeURIComponent(k) + '=' + encodeURIComponent(options.data.body[k]);
                }).join('&');
        }

        let override_data: OverrideRequestDataVO = this.overrideRequestData(options);
        let response: Observable<T> = <Observable<T>><any>this.http.get<T>(url, options.config); // unknown pare non funzionare

        return this.setResponse<T>(options, url, override_data, response);

    }

    /**
     *
     * @param options
     * @returns {Observable<R>}
     */
    protected requestPost<T extends Response>(options:RequestVO):Observable<T> {

        options.config.headers = this.setHeaders(options);

        let url:string;
        let data:any;

        if (options.data && options.data.segments) {
            url = this.setSegmentedUrl(options.endpoint.url, options.data);
            data = null;
        }
        else {
            url = options.endpoint.url;
            data = JSON.stringify(options.data);
        }

        if (options.data && options.data.body) {
            data = options.data.body;
        }

        let override_data: OverrideRequestDataVO = this.overrideRequestData(options);
        let response: Observable<T> = <Observable<T>><any>this.http.post<T>(url, data, options.config);

        return this.setResponse<T>(options, url, override_data, response);
    }

    /**
     *
     * @param options
     * @returns {Observable<R>}
     */
    protected requestPut<T extends Response>(options:RequestVO):Observable<T> {

        options.config.headers = this.setHeaders(options);

        let url: string;
        let data: any = null;
        if (options.data && options.data.segments) {
            url = this.setSegmentedUrl(options.endpoint.url, options.data);
        }
        else {
            url = options.endpoint.url;
        }

        if (options.data && options.data.body) {
            data = options.data.body;
        }

        let override_data: OverrideRequestDataVO = this.overrideRequestData(options);
        let response: Observable<T> = <Observable<T>><any>this.http.put(url, data, options.config);

        return this.setResponse<T>(options, url, override_data, response);
    }

    /**
     *
     * @param options
     * @returns {Observable<R>}
     */
    protected requestDelete<T extends Response>(options:RequestVO):Observable<T> {

        options.config.headers = this.setHeaders(options);

        let url: string = this.setSegmentedUrl(options.endpoint.url, options.data);

        if (options.data && options.data.body) {
            // parse body to query string
            url += "?" + Object.keys(options.data.body).map(function (k) {
                    return encodeURIComponent(k) + '=' + encodeURIComponent(options.data.body[k]);
                }).join('&');
        }

        let override_data: OverrideRequestDataVO = this.overrideRequestData(options);
        let response: Observable<T> = <Observable<T>><any>this.http.delete(url, options.config);

        return this.setResponse<T>(options, url, override_data, response);
    }

    /**
     *
     * @param message_obj
     */
    protected showAlert(message_obj:DefaultAlertStructureVO):void {
        console.log("message_obj", message_obj);
        Configuration.errorAlertRequest(message_obj);
    }

    /**
     * Callbak da eseguire in caso di richiesta andata a buon fine
     *
     * @param response
     * @param url
     * @returns {{}}
     */
    protected onSuccess(response:Response, url:string):Promise<any> {
        console.log("response", response);

        this.nextRequest();

        let body = response.json();

        return new Promise((resolve) => {
            // console.log("nessun nodo jwt presente");
            resolve(body || {});
        });

    }

    /**
     * Palo nel c... uore
     *
     * @param error
     * @param error_signals
     * @param error_intercept
     * @param error_callback
     * @param warning_level
     * @returns {any}
     */
    protected onError(error:Response,
                   error_signals:Array<Signal>|undefined,
                   error_intercept:boolean|undefined,
                   error_callback:(() => void)|undefined,
                   warning_level:WarningLevel, options:any):Observable<never> {

        // console.log("onError fine richiesta", error, options);

        // this.nextRequest();

        this.dispatchSignals(error_signals, error.json());

        if (error_intercept) {
            this.manageError(error.json(), error_callback, warning_level);
        }

        let error_json;
        try {
            error_json = error.json();
        }
        catch (e) {
            return throwError(new Error('Server error'));
        }

        return throwError(error_json || 'Server error');
    }

    /**
     *
     * @param id_request
     * @returns {Array<T>}
     */
    protected getListeners<T>(id_request:string):Array<T> {
        return RequestManager.getListeners<T>(id_request);
    }

    /**
     *
     * @param id_request
     * @returns {RequestManager<R, L>}
     */
    protected getRequest(id_request:string):RequestManager<any, any> {
        return RequestManager.getRequest(id_request);
    }

    /**
     *
     * @param request_manager
     * @param options
     * @param success_handler
     * @param error_handler
     * @returns {RequestManager<ResponseVO<R>, ResponseVO<any>>}
     */
    protected setRequestGET(request_manager:RequestManager<ResponseVO<any>, AbsListener>,
                         options:RequestVO,
                         success_handler: (response: ResponseVO<any>) => void,
                         error_handler: (error:any) => void):RequestManager<ResponseVO<any>, AbsListener> {
        let request:Observable<ResponseVO<any>> = this.requestGet<ResponseVO<any>>(options);
        this.setHandlers(request_manager, options);
        return request_manager.init(request,
            success_handler,
            error_handler
        );
    }

    /**
     *
     * @param request_manager
     * @param options
     * @param success_handler
     * @param error_handler
     * @returns {RequestManager<ResponseVO<R>, ResponseVO<any>>}
     */
    protected setRequestPOST(request_manager:RequestManager<ResponseVO<any>, AbsListener>,
                            options:RequestVO,
                            success_handler: (response: ResponseVO<any>) => void,
                            error_handler: (error:any) => void):RequestManager<ResponseVO<any>, AbsListener> {
        let request:Observable<ResponseVO<any>> = this.requestPost<ResponseVO<any>>(options);
        this.setHandlers(request_manager, options);
        return request_manager.init(request,
            success_handler,
            error_handler
        );
    }

    /**
     *
     * @param request_manager
     * @param options
     * @param success_handler
     * @param error_handler
     * @returns {RequestManager<ResponseVO<R>, ResponseVO<any>>}
     */
    protected setRequestPUT(request_manager:RequestManager<ResponseVO<any>, AbsListener>,
                             options:RequestVO,
                             success_handler: (response: ResponseVO<any>) => void,
                             error_handler: (error:any) => void):RequestManager<ResponseVO<any>, AbsListener> {
        let request:Observable<ResponseVO<any>> = this.requestPut<ResponseVO<any>>(options);
        this.setHandlers(request_manager, options);
        return request_manager.init(request,
            success_handler,
            error_handler
        );
    }

    /**
     *
     * @param request_manager
     * @param evt_name
     * @param response
     */
    protected fireEvent(request_manager:any, evt_name:string, response:any):void {
        // metto request_manager e response a any altrimenti si diventa pazzi passando generics ovunque
        let l:number = RequestManager.listener_decorator.length;
        for (let i = 0; i < l; i++) {
            if (RequestManager.listener_decorator[i].id === request_manager.id_request &&
                RequestManager.listener_decorator[i].listener[evt_name]) {
                RequestManager.listener_decorator[i].listener[evt_name](response);
            }
        }
    }

    /**
     *
     * @param signal_container
     * @param method_name
     * @param testSrvProperties
     * @returns {IService<any, AbsListener, any, any>}
     */
    protected setServiceObj(signal_container:{new(): any; },
                            method_name:string,
                            testSrvProperties:{new(): any; }):IService<any, AbsListener, any, any> {
        let service_obj:IService<any, AbsListener, any, any> = <IService<any, AbsListener, any, any>>{};

        service_obj.request =
            (params:any):RequestManager<ResponseVO<any>, AbsListener> => {
                return this["_" + method_name](params);
            };

        service_obj.signals = new signal_container();

        service_obj.properties = new testSrvProperties();

        return service_obj;
    }

/////////////////////////////
////////// PRIVATE //////////
/////////////////////////////

    /**
     * Setta gli headers delle richieste, attaccando, quando richiesto, anche il token opportuno
     *
     * @param end_point
     * @returns {Headers}
     */
    // private setHeaders(end_point:EndPointVO) {
    private setHeaders(options:RequestVO) {

        // let end_point:EndPointVO = options.endpoint;

        let headers: any = {};

        if (options.config.headers) {
            headers = options.config.headers;
        }
        else {
            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'app'
            };
        }

        return new Headers(headers);
    }

    /**
     *
     * @param options
     * @param url
     * @param override_data
     * @param response
     * @returns {Observable<R>}
     */
    private setResponse<T extends Response>(options:RequestVO,
                                            url:string,
                                            override_data:OverrideRequestDataVO,
                                            response:Observable<Response>):Observable<T> {

        let pipes:Array<any> = [];

        if (override_data.retry > 0) {
            // response = response.retry(override_data.retry);
            pipes.push(retry(override_data.retry));
        }

        // if (override_data.debounce > 0) {
        //     response = response.debounce(override_data.debounce).distinctUntilChanged();
        // }

        pipes.push(flatMap((response: T) => {
            return this.onSuccess(response, url)
        }));

        pipes.push(catchError((err: any) => this.onError(err, options.error_signals, options.error_intercept,
            options.error_callback, override_data.warning_level, options)));

        // type Parameters<T> = T extends (...args: infer U) => any ? U : never;

        return <Observable<T>>response.pipe.apply(null, pipes); // ma dioc...
            // .catch((response: any) => this.onError(response, options.error_signals, options.error_intercept,
            //     options.error_callback, override_data.warning_level, options));
    }

    /**
     *
     * @param options
     * @returns {OverrideRequestDataVO}
     */
    private overrideRequestData(options:RequestVO):OverrideRequestDataVO {
        let override_data:OverrideRequestDataVO = <OverrideRequestDataVO>{};

        override_data.retry = options.retry_override || options.endpoint.retry || 0;
        override_data.warning_level = options.warning_level_override || options.endpoint.warning_level;
        override_data.debounce = options.debounce_override || options.endpoint.debounce || 0;

        return override_data;
    }

    /**
     *
     * @param url
     * @param data
     * @returns {string}
     */
    private setSegmentedUrl(url:string, data:any) {

        if (data && data.segments) {
            let segments:Array<any> = data.segments;
            let l:number = segments.length;

            for (let i = 0; i < l; i++) {
                url += "/" + segments[i];
            }
        }

        return url;
    }

    /**
     * In caso di errore dispaccia i signals contenuti in signals
     *
     * @param signals
     * @param error
     */
    private dispatchSignals(signals:Array<Signal>|undefined, error:any):void {
        if (signals) {
            let l:number = signals.length;
            for (let i = 0; i < l; i++) {
                // console.log("signals[" + i + "]", signals[i]);
                signals[i].dispatch(error);
            }
        }
    }


    /**
     * Gestione automatica dell'errore in base a warning level
     *
     * @param risp
     * @param user_callback
     * @param warning_level
     */
    private manageError(risp:any, user_callback:(() => void)|undefined, warning_level:WarningLevel):void {

        // console.log("risp", risp);

        let body:string = risp.message;
        let title:string = "Errore";
        // let final_callback:() => void;
        let msg:DefaultAlertStructureVO;

        switch (warning_level) {
            case WarningLevel.SILENT:
                // nessuna notifica se la chiamata fallisce, nessuna callback di logout o reset app verrà eseguita
                if (user_callback) user_callback();
                break;
            case WarningLevel.LOW:
                // notifiche di errore visualizzate, nessuna callback di logout o reset app verrà eseguita
                msg = {
                    title: title,
                    body: body,
                    btn_arr: [
                        {text: "OK", handler: user_callback}
                    ]
                };
                this.showAlert(msg);
                break;
        }
    }

    private nextRequest() {

        console.log("next!!!!");

        if (RequestManager.request_queue_list.length() > 1) {
            RequestManager.request_queue_list.shiftLeft();
            RequestManager.request_queue_list.start.data.subscribe();
        }
        else {
            RequestManager.request_queue_list.destroy();
        }

    }

}