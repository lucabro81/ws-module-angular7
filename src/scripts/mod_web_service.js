#!/usr/bin/env node

let utils = require("./utils");

let fs = require('fs');
let path = require('path');
let cp = require('child_process');
let stdin = process.stdin;
let stdout = process.stdout;
let endpoints_class = require(utils.path_endpoints);

let re_srv_2 = /{nome_srv_u}/gi;

const base_path = utils.path_services;

/**
 *
 * @returns {Array}
 */
function getWebSrvNames() {

    let dir_arr = [];

    fs.readdirSync(base_path).forEach(file => {
        dir_arr.push(file);
    });

    return dir_arr;
}

let srv_names = getWebSrvNames();

stdin.resume();
stdout.write("Selezion fra i seguenti il web service da modificare: \n\n");

let select_srv_question = "";

srv_names.forEach((obj, index) => {
    select_srv_question += "[" + index + "] " + obj + "\n";
});

stdout.write(select_srv_question + "\n(indica il numero del service interessato):");

stdin.once('data', function(data) {
    let index = data.toString().trim().split(' ')[0];
    let nome_classe = srv_names[index];

    stdin.resume();
    let endpoint_arr = utils.askForEndpoints(endpoints_class, stdout);

    stdin.once('data', function(data) {

        let index_metodi_arr = data.toString().split(' ');
        let nomi_metodi_arr = utils.createNameArray(index_metodi_arr, endpoint_arr);

        // popolo il service.template
        let service_source = fs.readFileSync(base_path + nome_classe + "/" + nome_classe + ".service.ts", 'utf8');
        let service_result = {value: ""};
        let service_line_arr = [];

        service_line_arr = service_source.split('\n');

        let l = service_line_arr.length;
        // Per ogni riga del file service.template.txt ...
        let symbol_counter = 0;
        let tab_array = {
            1: "",
            2: "",
            3: "",
            4: "\t",
            5: "\t\t",
            6: "\t"
        };
        for (let j = 0; j < l; j++) {

            let line = service_line_arr[j];
            let line_mod;

            //console.log("line", line.includes("//--//"), line);

            if (line.includes("//--//")) {
                nomi_metodi_arr.forEach((name, index) => {
                    let capitalized_name = utils.capitalizeFirstLetter(name);
                    switch (symbol_counter) {
                        case 1: // ServiceMethodSignalContainer
                            service_result.value += "import {On" + capitalized_name + "ServiceMethodListener} from \"./decorators/On" + capitalized_name + "ServiceMethodListener\";\n";
                            break;
                        case 2: // ServiceMethodSignalContainer
                            service_result.value += "import {" + capitalized_name + "ServiceMethodSignalContainer} from \"./decorators/" + capitalized_name + "ServiceMethodSignalContainer\";\n";
                            break;
                        case 3: // SrvProperties
                            service_result.value += "class " + capitalized_name + "SrvProperties {\n}\n\n";
                            break;
                        case 4: // public {nome_mtd}Srv
                            service_result.value += "\tpublic " + name + "Srv:IService<any, On" + capitalized_name + "ServiceMethodListener, " + capitalized_name + "ServiceMethodSignalContainer, " + capitalized_name + "SrvProperties>;\n";
                            break;
                        case 5: // this.{nome_mtd}Srv
                            service_result.value += "\t\tthis." + name + "Srv = this.setServiceObj(" + capitalized_name + "ServiceMethodSignalContainer, \"" + capitalized_name + "Srv\", " + capitalized_name + "SrvProperties);\n";
                            break;
                        case 6: // @{http_method}<ResponseVO<any>, On{nome_mtd_u}ServiceMethodListener>
                            service_result.value += "\t/**\n" +
                                "\t*\n" +
                                "\t* @param params\n" +
                                "\t* @returns {RequestManager<ResponseVO<ResponseVO<any>>, on" + capitalized_name + "ServiceMethodListener>}\n" +
                                "\t*/\n" +
                                "\t@" + endpoint_arr[parseInt(index_metodi_arr[index])].obj.default_method + "<ResponseVO<any>, On" + capitalized_name + "ServiceMethodListener>({\n" +
                                "\t\tendpoint: EndPoints." + endpoint_arr[parseInt(index_metodi_arr[index])].key + ",\n" +
                                "\t\tconfig: {}\n" +
                                "\t})\n" +
                                "\t\private _" + name + "Srv(params:any):any {\n" +
                                "\t\treturn {\n" +
                                "\t\t\tsuccess_handler:\n" +
                                "\t\t\t\t(response: ResponseVO<any>) => {\n" +
                                "\t\t\t\t\t/* do something */\n" +
                                "\t\t\t\t},\n" +
                                "\n" +
                                "\t\t\terror_handler:\n" +
                                "\t\t\t\t(error) => {\n" +
                                "\t\t\t\t\t/* do something */\n" +
                                "\t\t\t\t}\n" +
                                "\t\t}\n" +
                                "\t}\n\n";
                            break;
                        default:
                            break;
                    }
                });

                if (symbol_counter > 0) {
                    service_result.value += tab_array[symbol_counter] + "//--//\n";
                }
                else {
                    service_result.value += line + "\n";
                }

                symbol_counter++;
            }
            else {
                service_result.value += line + "\n";
            }

        }

        // creazione dei file che devono stare dentro a /decorators
        nomi_metodi_arr.forEach((name) => {

            let service_method_signal_template = require('./templates/serviceMethodSignalContainer.template.json').txt.join('\n');
            service_method_signal_template = service_method_signal_template.replace(re_srv_2, utils.capitalizeFirstLetter(name));

            let service_method_listener_template = require('./templates/onServiceMethodListener.template.json').txt.join('\n');
            service_method_listener_template = service_method_listener_template.replace(re_srv_2, utils.capitalizeFirstLetter(name));

            fs.writeFileSync(base_path +
                nome_classe + '/decorators/' + utils.capitalizeFirstLetter(name) + 'ServiceMethodSignalContainer.ts',
                service_method_signal_template, 'utf8');
            fs.writeFileSync(base_path +
                nome_classe + '/decorators/' + 'On' + utils.capitalizeFirstLetter(name) + 'ServiceMethodListener.ts',
                service_method_listener_template, 'utf8');
        });

        fs.writeFileSync(base_path +
            nome_classe + '/' + nome_classe + '.service.ts', service_result.value, 'utf8');

        // alla fine aggiungo i file al worktree di git
        cp.exec('git add ./src/services/web/' + nome_classe);

        process.exit();
    });

});