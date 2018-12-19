import {Signal} from "signals";
import {WarningLevel} from "../utils/Emun";

export interface RequestVO {
    endpoint: any, // sarebbe EndPointVO ma preferisco generarla per ogni progetto
    method?: string,
    data?: any,
    config?: any,
    error_signals?: Array<Signal>,
    error_intercept?: boolean,
    error_callback?: () => void,
    warning_level_override?: WarningLevel,
    retry_override?: number,
    debounce_override?: number
}