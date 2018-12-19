import {ConfigVO} from "../vo/ConfigVO";

export var Configuration:ConfigVO = <ConfigVO>{};

export function SetConfig(config:ConfigVO) {
    Configuration = config;
}