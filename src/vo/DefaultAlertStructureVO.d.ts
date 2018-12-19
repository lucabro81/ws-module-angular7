import {BtnAlertStructureVO} from "./BtnAlertStructureVO";

export interface DefaultAlertStructureVO {
    title: string,
    body:string,
    btn_arr:Array<BtnAlertStructureVO>
}