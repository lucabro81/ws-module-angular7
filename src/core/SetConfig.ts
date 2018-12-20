import { ConfigVO } from "ws-module-common";

export var Configuration:ConfigVO = <ConfigVO>{};

export function SetConfig(config:ConfigVO) {
    Configuration = config;
}