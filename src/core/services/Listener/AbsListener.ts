import { IListener } from "./IListener";

export abstract class AbsListener implements IListener{

    protected decorated_listener:IListener;

    constructor() {}

    public init(decorated_listener:IListener) {
        this.decorated_listener = decorated_listener;
    }

    public onError(evt:any):void {
        // console.log("AbsListener.onError");
        this.decorated_listener.onError(evt);
    }

    public onSuccess(evt:any):void {
        // console.log("AbsListener.onSuccess");
        this.decorated_listener.onSuccess(evt);
    }

    public destroy():void {
        this.decorated_listener.destroy();
    }
}