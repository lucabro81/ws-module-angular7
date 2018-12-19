import { IListener } from "./IListener";

export class Listener implements IListener {

    constructor() {

    }

    public onError(evt:any):void {
        // console.log("Listener onError");
    }

    public onSuccess(evt:any):void {
        // console.log("Listener onSuccess");
    }

    public destroy():void {

    }
}