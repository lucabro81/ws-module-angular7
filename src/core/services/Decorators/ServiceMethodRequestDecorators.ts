// ref. https://gist.github.com/remojansen/16c661a7afd68e22ac6e

import {RequestManager} from "../System/RequestManager";
import {AbsListener} from "../Listener/AbsListener";
import {RequestVO} from "../../../vo/RequestVO";

///////////////////////////////////////////////////////////
//////////////////// INTERFACES / ENUM ////////////////////
///////////////////////////////////////////////////////////

export enum Platform {
    IOS = 0,
    ANDROID = 1,
    WEB = 2,
}

interface IStorageDataArgs {
    platform:Platform,
    method:MemMethod
}


interface IHandleDataDecoratorArgs {
    [prop_name:string]: Array<IStorageDataArgs>
}

export enum MemMethod {
    LOCALHOST = 0,
    FILE = 1,
    SECURESTORAGE = 2,
}

///////////////////////////////////////////////
//////////////////// UTILS ////////////////////
///////////////////////////////////////////////

/**
 *
 * @param target
 * @param key
 * @param descriptor
 */
function originalMethodGen(target: Object,
                           key: string,
                           descriptor: any) {
    if (descriptor === undefined) {
        descriptor = Object.getOwnPropertyDescriptor(target, key);
    }

    return descriptor.value;
}

/**
 *
 * @param scope
 * @param originalMethod
 * @returns {{originalMethod, args: Array}}
 */
function before<R, L extends AbsListener>(originalMethod:any, scope:any) {

    let args = [];
    for (let i = 0; i < arguments.length; i++) {
        args[i] = arguments[i];
    }

    console.log("before args", arguments);

    let request_manager: RequestManager<R, L> =
        new RequestManager<R, L>();
    args[0]["request_manager"] = request_manager;

    return { originalMethod: originalMethod.apply(scope, args), args:args};
}

/**
 *
 * @param endpoint
 * @param result
 * @param args
 * @param method
 * @param diocane
 * @returns {RequestManager<R, L>}
 */
function after<R, L extends AbsListener>(endpoint:RequestVO, result:any, args:any, method:string, diocane:any) {
    console.log("result", result);
    endpoint["data"] = args[0];
    // FIXME: se uso questa ottengo: Untyped function calls may not accept type arguments
    // return this.setRequestGet<R, L>
    return <RequestManager<R, L>>diocane["setRequest" + method](
        args[0]["request_manager"],
        endpoint,
        result["success_handler"],
        result["error_handler"]
    );
}

/**
 *
 * @param item
 * @param data
 * @param scope
 */
function storeData(item:any, data:any, scope:any) {
    console.log("storeData", {
        item: item,
        data: data,
        scope: scope
    });
}

////////////////////////////////////////////////////
//////////////////// DECORATORS ////////////////////
////////////////////////////////////////////////////

/**
 *
 * @param endpoint
 * @returns {(target:Object, key:string, descriptor:any)=>TypedPropertyDescriptor<(params:any)=>RequestManager<R, L>>}
 * @constructor
 */
export function Post<R, L extends AbsListener>(endpoint:RequestVO):(
    target: Object,
    key: string,
    descriptor: any)=> TypedPropertyDescriptor<(params:any) => RequestManager<R, L>> {

    return (
        target: Object,
        key: string,
        descriptor: any): TypedPropertyDescriptor<(params:any) => RequestManager<R, L>> => {

        let originalMethod = originalMethodGen(target, key, descriptor);

        descriptor.value = function () {
            let result = before(originalMethod, this);
            return after<R, L>(endpoint, result.originalMethod, result.args, "POST", this);
        };

        return descriptor;
    }
}

/**
 *
 * @param endpoint
 * @returns {(target:Object, key:string, descriptor:any)=>TypedPropertyDescriptor<(params:any)=>RequestManager<R, L>>}
 * @constructor
 */
export function Get<R, L extends AbsListener>(endpoint:RequestVO):(
    target: Object,
    key: string,
    descriptor: any)=> TypedPropertyDescriptor<(params:any) => RequestManager<R, L>> {

    return (
        target: Object,
        key: string,
        descriptor: any): TypedPropertyDescriptor<(params:any) => RequestManager<R, L>> => {

        let originalMethod = originalMethodGen(target, key, descriptor);

        descriptor.value = function () {
            let result = before(originalMethod, this);
            return after<R, L>(endpoint, result.originalMethod, result.args, "GET", this);
        };

        return descriptor;
    }
}
