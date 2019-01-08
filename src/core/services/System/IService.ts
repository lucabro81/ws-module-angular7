import {RequestManager} from "./RequestManager";
import {AbsListener} from "../Listener/AbsListener";
import { ResponseVO } from "ws-module-common";

export interface IService<R, L extends AbsListener, S, P> {
    request:(params:any, scope?:any) => RequestManager<ResponseVO<R>, L>;
    data:P,
    signals:S;
}