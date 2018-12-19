import {WarningLevel} from "../utils/Emun";

export interface OverrideRequestDataVO {
    warning_level:WarningLevel
    retry: number;
    debounce:number;
}