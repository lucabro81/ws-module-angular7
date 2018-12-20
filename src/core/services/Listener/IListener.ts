interface IListener {
    onError(evt:any, callback:() => void):void;
    onSuccess(evt:any, callback:() => void):void;
    destroy():void;
} export {IListener}
