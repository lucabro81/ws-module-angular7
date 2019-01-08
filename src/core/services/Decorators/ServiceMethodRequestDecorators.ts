// ref. https://gist.github.com/remojansen/16c661a7afd68e22ac6e

import {RequestManager} from "../System/RequestManager";
import {AbsListener} from "../Listener/AbsListener";
import { RequestVO } from "ws-module-common";

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


    let request_manager: RequestManager<R, L> =
        new RequestManager<R, L>();
    args[0]["request_manager"] = request_manager;
    console.log("debug before args", args);
    console.log("debug before scope", scope);

    return { originalMethod: originalMethod.apply(scope, args), args:args};
}

/**
 *
 * @param endpoint
 * @param result
 * @param args
 * @param method
 * @param _this
 * @returns {RequestManager<R, L>}
 */
function after<R, L extends AbsListener>(options:RequestVO, result:any, args:any, method:string, _this:any) {
    console.log("result", result);
    options["data"] = args[0];
    // FIXME: se uso questa ottengo: Untyped function calls may not accept type arguments
    // return this.setRequestGet<R, L>

    console.log("debug after \"setRequest\" + method", "setRequest" + method);
    console.log("debug after _this", _this);

    return <RequestManager<R, L>>_this["setRequest" + method](
        args[0]["request_manager"],
        options,
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
 * @param options
 * @returns {(target:Object, key:string, descriptor:any)=>TypedPropertyDescriptor<(params:any)=>RequestManager<R, L>>}
 * @constructor
 */
export function Post<R, L extends AbsListener>(options:RequestVO):(
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
            return after<R, L>(options, result.originalMethod, result.args, "POST", this);
        };

        return descriptor;
    }
}

/**
 *
 * @param options
 * @returns {(target:Object, key:string, descriptor:any)=>TypedPropertyDescriptor<(params:any)=>RequestManager<R, L>>}
 * @constructor
 */
export function Get<R, L extends AbsListener>(options:RequestVO):(
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
            return after<R, L>(options, result.originalMethod, result.args, "GET", this);
        };

        console.log("debug Get", descriptor);

        return descriptor;
    }
}
