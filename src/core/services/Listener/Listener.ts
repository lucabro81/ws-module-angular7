import { IListener } from "./IListener";

export class Listener implements IListener {

    constructor() {

    }

    public onError(evt:any, callback:() => void):void {
        // console.log("Listener onError");
        callback();
    }

    public onSuccess(evt:any, callback:() => void):void {
        // console.log("Listener onSuccess");
        callback();
    }

    public destroy():void {

    }
}