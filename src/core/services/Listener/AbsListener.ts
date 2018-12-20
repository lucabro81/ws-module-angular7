import { IListener } from "./IListener";

export abstract class AbsListener implements IListener{

    protected decorated_listener:IListener;

    constructor() {}

    public init(decorated_listener:IListener) {
        this.decorated_listener = decorated_listener;
    }

    public onError(evt:any, callback:() => void):void {
        this.decorated_listener.onError(evt, callback);
        callback();
    }

    public onSuccess(evt:any, callback:() => void):void {
        this.decorated_listener.onSuccess(evt, callback);
        callback();
    }

    public destroy():void {
        this.decorated_listener.destroy();
    }
}