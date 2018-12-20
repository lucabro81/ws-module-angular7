import { Subject } from "rxjs";
import { GetListServiceParamsVO } from "./GetListServiceParamsVO";

export interface SubjectContVO {
    [key: string]: Subject<GetListServiceParamsVO>
}