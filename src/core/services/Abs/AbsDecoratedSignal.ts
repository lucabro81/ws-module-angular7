import {ISignal} from "../Signal/ISignal";

export class AbsDecoratedSignal<T> {


    /**
     * If Signal is active and should broadcast events.
     */
    active: boolean;

    /**
     * If Signal should keep record of previously dispatched parameters and automatically
     * execute listener during add()/addOnce() if Signal was already dispatched before.
     */
    memorize: boolean;

    /**
     * Signals Version Number
     */
    VERSION: string;

    protected container:T;

    constructor(private decorated_signal:ISignal, container:T) {

        this.decorated_signal = decorated_signal;
        this.container = container;

        this.active = this.decorated_signal.active;
        this.memorize = this.decorated_signal.memorize;
        this.VERSION = this.decorated_signal.VERSION;
    }

    /**
     * Add a listener to the signal.
     *
     * @param listener Signal handler function.
     * @param listenercontext Context on which listener will be executed (object that should represent the
     * `this` variable inside listener function).
     * @param priority The priority level of the event listener. Listeners with higher priority will be executed before
     * listeners with lower priority. Listeners with same priority level will be executed at the same order as they
     * were added. (default = 0)
     */
    public add(listener: (scope:any, params:Array<any>) => void,
               listenerContext?: any,
               priority?: Number):T {
        this.decorated_signal.add(listener, listenerContext, priority);
        return this.container;
    }

    /**
     * Add listener to the signal that should be removed after first execution (will be executed only once).
     *
     * @param listener Signal handler function.
     * @param listenercontext Context on which listener will be executed (object that should represent the
     * `this` variable inside listener function).
     * @param priority The priority level of the event listener. Listeners with higher priority will be executed before
     * listeners with lower priority. Listeners with same priority level will be executed at the same order as they
     * were added. (default = 0)
     * @param return_container
     */
    public addOnce(listener: Function,
                   listenerContext?: any,
                   priority?: Number):T {
        this.decorated_signal.addOnce(listener, listenerContext, priority);
        return this.container;
    }

    /**
     * Dispatch/Broadcast Signal to all listeners added to the queue.
     *
     * @param params Parameters that should be passed to each handler.
     */
    public dispatch(...params: any[]): T {
        this.decorated_signal.dispatch(params[0], params[1]);
        return this.container;
    }

    /**
     * Remove all bindings from signal and destroy any reference to external objects (destroy Signal object).
     */
    public dispose(): T {
        this.decorated_signal.dispose();
        return this.container;
    }

    /**
     * Forget memorized arguments.
     */
    public forget(): T {
        this.decorated_signal.forget();
        return this.container;
    }

    /**
     * Returns a number of listeners attached to the Signal.
     */
    public getNumListeners(): number {
        return this.decorated_signal.getNumListeners();
    }

    /**
     * Stop propagation of the event, blocking the dispatch to next listeners on the queue.
     */
    public halt(): T {
        this.decorated_signal.halt();
        return this.container;
    }

    /**
     * Check if listener was attached to Signal.
     *
     * @param return_container
     */
    public has(listener: Function,
               context?: any):boolean {
        return this.decorated_signal.has(listener, context);
    }

    /**
     * Remove a single listener from the dispatch queue.
     *
     * @param return_container
     */
    public remove(listener: Function, context?: any):Function {
        return this.decorated_signal.remove(listener, context);
    }

    public removeAnd(listener: Function, context?: any):T {
        this.decorated_signal.remove(listener, context);
        return this.container;
    }

    public removeAll(): T {
        this.decorated_signal.removeAll();
        return this.container;
    }
}