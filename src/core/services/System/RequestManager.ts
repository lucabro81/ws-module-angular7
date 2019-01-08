// TODO: set a request priority

import { LinkedList } from "lucabro-linked-list/package/LinkedList";
import { ListElement } from "lucabro-linked-list/package/ListElement";
import { AbsListener } from "../Listener/AbsListener";
import { Listener } from "../Listener/Listener";
import { IListener } from "../Listener/IListener";
import { Observable, Subject } from "rxjs";
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { GetListServiceParamsVO, RequestVO, SubjectContVO } from "ws-module-common";

interface RequestManagerHashVO<R, T extends AbsListener> {
    [id: string]: RequestManager<R, T>
}

interface SignalsHashVO {
    [id: string]: any
}

interface ListenerDecoratorVO {
    id: string | null,
    listener: any
}

export class RequestManager<R, T extends AbsListener> {

    // public static
    public static request_queue_list: LinkedList<ListElement>;
    public static listener_decorator: Array<ListenerDecoratorVO> = [];
    public static request_manager_list: RequestManagerHashVO<any, any> = <RequestManagerHashVO<any, any>>{}; // dioc... Static members cannot reference class type parameters.
    public static signals: SignalsHashVO = <SignalsHashVO>{};
    public static is_stop_on_error_active: boolean = false;
    public static stop_on_error_active_callback: ((evt: any) => void) | null;
    public static request_counter: number = 0;

    // public
    public listener: Listener | null;
    public id_request: string;
    public options: RequestVO;

    // private static
    private static id_index: number = 0;
    private static subject_cont: SubjectContVO = <SubjectContVO>{};

    // private
    private is_synchronized: boolean;
    private request: Observable<R> | null;
    private onSuccess: (evt: any, callback: () => void) => void;
    private onError: (error: any, callback: () => void) => void;
    private onStartRequest: ((request: RequestManager<R, T>) => void) = ({}) => {};
    private onFinishRequest: ((request: RequestManager<R, T>) => void) = ({}) => {};
    private context: any;
    private scope: RequestManager<R, T>; // only for interface purpose

/////////////////////////////////
////////// CONSTRUCTOR //////////
/////////////////////////////////

    /**
     * Inizializzazione
     *
     * @constructor
     */
    public constructor() {
        this.listener = null;
        this.is_synchronized = false;
        this.request = null;
        this.scope = this;

        if (!RequestManager.request_queue_list) {
            RequestManager.request_queue_list = new LinkedList<ListElement>();
            RequestManager.request_queue_list.init(ListElement);
        }
    }

////////////////////////////
////////// PUBLIC //////////
////////////////////////////

    /**
     * Set request object and handlers for success and error
     *
     * @param request
     * @param onSuccess
     * @param onError
     * @param options
     * @param onStartRequest
     * @param onFinishRequest
     * @returns {RequestManager}
     */
    public init(request: Observable<R>,
                onSuccess: (evt: any) => void,
                onError: (error: any) => void): RequestManager<R, T> {

        this.request = request;
        this.onSuccess = onSuccess;
        this.onError = onError;

        RequestManager.request_counter++;

        return this;
    }

    /**
     * Set a string id for the request of the current instance, then store request data in the requests queue
     *
     * @param id
     * @returns {RequestManager}
     */
    public setRequestId(id: string): RequestManager<R, T> {
        if ((id === null) || (id === "")) {
            this.id_request = "id_" + RequestManager.id_index++;
        }
        else {
            this.id_request = id;
        }

        if (RequestManager.request_manager_list[this.id_request]) {
            RequestManager.request_manager_list[this.id_request].request = this.request;
            RequestManager.request_manager_list[this.id_request].onSuccess = this.onSuccess;
            RequestManager.request_manager_list[this.id_request].onError = this.onError;
        }
        else {
            RequestManager.request_manager_list[this.id_request] = this;
        }

        return this;
    }

    /**
     * Return the observable of the current request
     *
     * @returns {Observable<R>}
     */
    public getObservable(): Observable<R> | null {
        return this.request;
    }

    /**
     * Set a listener object for the current request
     *
     * @param listener_decorator
     * @returns {RequestManager}
     */
    public setListener(listener_decorator: T): RequestManager<R, T> {

        if (!this.id_request) {
            this.id_request = "id_" + RequestManager.id_index++;
        }

        RequestManager.listener_decorator.push({id: this.id_request, listener: listener_decorator});
        return this;
    }

    /**
     * Retrieve the listener object by request id form the request queue
     *
     * @param id
     * @returns {any}
     */
    public static getListeners<ServiceListener>(id: string): Array<ServiceListener> {

        let req_manager: any = RequestManager.request_manager_list[id];
        let l: number = req_manager.listener_decorator.length;
        let listener_arr: Array<ServiceListener> = [];

        for (let i = 0; i < l; i++) {
            listener_arr.push(req_manager.listener_decorator[i].listener);
        }

        return listener_arr;
    }

    /**
     * Retrieve the request manager object by request id form the request queue
     *
     * @param id
     * @returns {any}
     */
    public static getRequest(id: string): RequestManager<any, any> {

        if (RequestManager.request_manager_list[id]) {
            return RequestManager.request_manager_list[id];
        }

        RequestManager.request_manager_list[id] = new RequestManager<any, any>();
        (<RequestManager<any, any>>RequestManager.request_manager_list[id]).id_request = id;

        return RequestManager.request_manager_list[id];

    }

    /**
     * Synchorize the request in the queue: a request will be executed only when the last one is finished
     *
     * @returns {RequestManager}
     */
    public synchronize(): RequestManager<R, T> {
        this.is_synchronized = true;
        return this;
    }

    /**
     * Asynchronize the request in the queue, they will be executed together
     *
     * @returns {RequestManager}
     */
    public asynchronize(): RequestManager<R, T> {
        this.is_synchronized = false;
        return this;
    }

    /**
     * Stop the execution of the request queue when errors occurs
     *
     * @returns {RequestManager}
     */
    public stopOnError(active: boolean, callback: ((evt: any) => void) | null = null): RequestManager<R, T> {
        RequestManager.is_stop_on_error_active = active;
        RequestManager.stop_on_error_active_callback = callback;
        return this;
    }

    /**
     *
     * @param context
     * @param options
     * @param onStartRequest
     * @param onFinishRequest
     */
    public setStartAndFinishReqHandlers(options: RequestVO,
                                        onStartRequest?: (request: RequestManager<R, T>) => void,
                                        onFinishRequest?: (request: RequestManager<R, T>) => void) {
        this.options = options;
        this.onStartRequest = onStartRequest;
        this.onFinishRequest = onFinishRequest;
    }

    /**
     *
     * @param id_request
     * @param debounce
     */
    public runWithDebounce(id_request:string, debounce?: number) {
        // console.log("RequestManager - runWithDebounce - id_request >>> ", id_request);

        if (id_request) {
            this.id_request = id_request;
        }
        else {
            throw new Error('id_request deve essere una stringa valida!');
        }

        if (!RequestManager.subject_cont[this.id_request]) {
            RequestManager.subject_cont[this.id_request] = new Subject<GetListServiceParamsVO>();

            RequestManager.subject_cont[this.id_request]
                .asObservable()
                .pipe(
                    debounceTime((debounce)),
                    distinctUntilChanged()
                )
                .subscribe((params: GetListServiceParamsVO) => {

                    // if the current id doesn't match with stored ones in the listener queue,
                    // a default listener is created
                    if (!this.checkListenerIdRequest()) {
                        RequestManager.listener_decorator.push(
                            {
                                id: this.id_request,
                                listener: new class extends AbsListener {
                                    constructor() {
                                        super();
                                    }

                                    public init(decorated_listener: IListener) {
                                        super.init(decorated_listener);
                                    }

                                    public onError(evt: any, callback:() => void) {
                                        this.decorated_listener.onError(evt, callback);
                                        // callback();
                                    }

                                    public onSuccess(evt: any, callback:() => void) {
                                        this.decorated_listener.onSuccess(evt, callback);
                                        // callback();
                                    }

                                    public destroy() {
                                        this.decorated_listener.destroy();
                                    }
                                }
                            });
                    }

                    let l: number = RequestManager.listener_decorator.length;
                    for (let i = 0; i < l; i++) {
                        RequestManager.listener_decorator[i].listener.init(new Listener());
                    }

                    if (this.is_synchronized) {
                        RequestManager.request_queue_list.addElem({subscribe: this.setSubscribe, scope: this});

                        if (RequestManager.request_queue_list.length() === 1) {
                            return RequestManager.request_queue_list.start.data.subscribe();
                        }

                    }
                    else {
                        this.setSubscribe();
                    }

                });
        }

        RequestManager.subject_cont[this.id_request].next();
    }

    /**
     * Run the current request
     *
     */
    public run() {

        if (!this.id_request) {
            this.id_request = "id_" + RequestManager.id_index++;
        }

        console.log("debug run this.id_request", this, this.id_request);

        // if the current id doesn't match with stored ones in the listener queue,
        // a default listener is created
        if (!this.checkListenerIdRequest()) {
            RequestManager.listener_decorator.push(
                {
                    id: this.id_request,
                    listener: new class extends AbsListener {
                        constructor() {
                            super();
                        }

                        public init(decorated_listener: IListener) {
                            super.init(decorated_listener);
                        }

                        public onError(evt: any, callback:() => void) {
                            this.decorated_listener.onError(evt, callback);
                            // callback();
                        }

                        public onSuccess(evt: any, callback:() => void) {
                            this.decorated_listener.onSuccess(evt, callback);
                            // callback();
                        }

                        public destroy() {
                            this.decorated_listener.destroy();
                        }
                    }
                });
        }

        let l: number = RequestManager.listener_decorator.length;
        for (let i = 0; i < l; i++) {
            RequestManager.listener_decorator[i].listener.init(new Listener());
        }

        if (this.is_synchronized) {
            RequestManager.request_queue_list.addElem({subscribe: this.setSubscribe, scope: this});

            if (RequestManager.request_queue_list.length() === 1) {
                return RequestManager.request_queue_list.start.data.subscribe();
            }

        }
        else {
            this.setSubscribe();
        }
    }

    /**
     *
     */
    public destroy() {

        let index:number = -1;
        for (let i = 0; i < RequestManager.listener_decorator.length; i++) {
            if (this.id_request === RequestManager.listener_decorator[i].id) {
                index = i;
                break;
            }
        }

        if (index >= 0)
            RequestManager.listener_decorator.splice(index, 1);

        if (RequestManager.request_queue_list)
            RequestManager.request_queue_list.removeElemByData(this.request);

        if (RequestManager.request_manager_list[this.id_request])
            delete RequestManager.request_manager_list[this.id_request];

        if (RequestManager.signals[this.id_request])
            delete RequestManager.signals[this.id_request];

        RequestManager.request_counter--;

        delete this["listener"];
        delete this["id_request"];
        delete this["options"];

        delete this["is_synchronized"];
        delete this["request"];
        delete this["onSuccess"];
        delete this["onError"];
        delete this["onStartRequest"];
        delete this["onFinishRequest"];
        delete this["context"];
        delete this["scope"];
    }

/////////////////////////////
////////// PRIVATE //////////
/////////////////////////////

    /**
     *
     * @param evt
     */
    private subscribeSuccess(evt: any):void {

        let l: number = RequestManager.listener_decorator.length;

        let ready_to_go_arr:Array<boolean> = [];
        let index = 0;

        // init array to check if all listener ended
        for (index = 0; index < l+1; index++) {
            ready_to_go_arr.push(false);
        }

        for (let i = 0; i < l; i++) {
            if (RequestManager.listener_decorator[i].id === this.id_request) {
                RequestManager.listener_decorator[i].listener.onSuccess(evt, () => {
                    ready_to_go_arr[i] = true;
                    this.checkIfReadyToGo(ready_to_go_arr);
                });
            }
        }

        this.onSuccess(evt, () => {
            ready_to_go_arr[index] = true;
            this.checkIfReadyToGo(ready_to_go_arr);
        });

    }

    /**
     *
     * @param ready_to_go_arr
     */
    private checkIfReadyToGo(ready_to_go_arr:Array<any>):void {

        for (let i = 0; i < ready_to_go_arr.length; i++) {
            if (!ready_to_go_arr[i]) {
                return;
            }
        }

        this.destroy();
    }

    /**
     *
     * @param evt
     */
    private subscribeError(evt: any): void {
        let l: number = RequestManager.listener_decorator.length;

        let ready_to_go_arr:Array<boolean> = [];
        let index = 0;

        // init array to check if all listener ended
        for (index = 0; index < l+1; index++) {
            ready_to_go_arr.push(false);
        }

        for (let i = 0; i < l; i++) {
            if (RequestManager.listener_decorator[i].id === this.id_request) {
                RequestManager.listener_decorator[i].listener.onError(evt, () => {
                    ready_to_go_arr[i] = true;
                    this.checkIfReadyToGo(ready_to_go_arr);
                });
            }
        }

        if (RequestManager.is_stop_on_error_active) {
            this.listener = null;
            this.destroyListenerCollection();
            if (RequestManager.stop_on_error_active_callback) {
                RequestManager.stop_on_error_active_callback(evt);
            }
        }

        this.onError(evt, () => {
            ready_to_go_arr[index] = true;
            this.checkIfReadyToGo(ready_to_go_arr);
        });
    }

    /**
     *
     */
    private setSubscribe() {

        console.log("inizia richiesta", this, this.scope);
        // if (this.scope.onStartRequest) {
            this.scope.onStartRequest(this.scope);

            if (this.scope.request) {
                this.scope.request.subscribe(
                    (evt) => {
                        RequestManager.request_counter--;
                        // console.log("fine richiesta", this.scope.id_request);
                        this.scope.subscribeSuccess(evt);
                        // console.log("fine richiesta");
                        // if (this.scope.onFinishRequest) {
                            this.scope.onFinishRequest(this.scope);
                        // }
                        // else {
                            //TODO: error?
                        // }
                    },
                    (error) => {
                        RequestManager.request_counter--;
                        this.scope.subscribeError(error);
                        // console.log("fine richiesta errore", this.scope.id_request);
                        // if (this.scope.onFinishRequest) {
                            this.scope.onFinishRequest(this.scope);
                        // }
                        // else {
                            //TODO: error?
                        // }
                    }
                );
            }
            else {
                //TODO: error?
            }
        // }
        // else {
            //TODO: error?
        // }
    }

    /**
     *
     */
    private destroyListenerCollection() {

        let l: number = RequestManager.listener_decorator.length;

        for (let i = l - 1; i >= 0; i--) {
            RequestManager.listener_decorator[i].listener.destroy();
            RequestManager.listener_decorator[i].listener = null;
            RequestManager.listener_decorator[i].id = null;
            RequestManager.listener_decorator.pop();
        }
        RequestManager.listener_decorator = [];
    }

    /**
     * Check if the request id of the current request match with another one in the queue of listeners
     *
     * @returns {boolean}
     */
    private checkListenerIdRequest(): boolean {

        let l: number = RequestManager.listener_decorator.length;

        for (let i = 0; i < l; i++) {
            if (RequestManager.listener_decorator[i].id === this.id_request) {
                return true;
            }
        }

        return false;
    }

}