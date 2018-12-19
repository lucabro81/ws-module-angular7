import {RequestManager} from "./RequestManager";
import {AbsListener} from "../Listener/AbsListener";
import {ResponseVO} from "../../../vo/ResponseVO";

export interface IService<R, L extends AbsListener, S, P> {
    request:(params:any, scope?:any) => RequestManager<ResponseVO<R>, L>;
    properties:P,
    signals:S;
}