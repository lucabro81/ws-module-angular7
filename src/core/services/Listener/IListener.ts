interface IListener {
    onError(evt:any):void;
    onSuccess(evt:any):void;
    destroy():void;
} export {IListener}
