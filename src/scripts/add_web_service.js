#!/usr/bin/env node

let utils = require("./utils");
let placeholders = require("./placeholders");

let fs = require('fs');
let path = require('path');
let cp = require('child_process');
let stdin = process.stdin;
let stdout = process.stdout;

let path_endpoints_arr = utils.path_endpoints.split("/");
path_endpoints_arr.splice(-1, 1);
let endpoints_class = require(path_endpoints_arr.join("/")+ "/endpoints.json");

const base_path = utils.path_services;

  ///////////////////
 ////// UTILS //////
///////////////////

/**
 *
 * @param nomi_metodi_arr
 * @param text
 * @param result
 * @param endpoint_arr
 * @param index_metodi_arr
 */
function addModifiedText(nomi_metodi_arr, text, result, endpoint_arr, index_metodi_arr) {

    let text_mod;

    nomi_metodi_arr.forEach(function (nome, index) {
        nome = nome.replace('\n', '');
        text_mod = text.replace(placeholders.re_mtd_1, nome);
        text_mod = text_mod.replace(placeholders.re_mtd_2, utils.capitalizeFirstLetter(nome));
        text_mod = text_mod.replace(placeholders.endpoint_obj, "EndPoints." + endpoint_arr[parseInt(index_metodi_arr[index])].key.toUpperCase());
        text_mod = text_mod.replace(
            placeholders.http_method,
            utils.capitalizeFirstLetter(endpoint_arr[parseInt(index_metodi_arr[index])].obj.method.toLowerCase()));

        if (text_mod.includes('-->')) {
            result.value += text_mod.replace('-->', '') + "\n";
        }
        else {
            result.value += text_mod + "\n";
        }

    });
}

  ////////////////////
 ////// SCRIPT //////
////////////////////

stdin.resume();
stdout.write("Nome del service: ");

stdin.once('data', function(data) {
    let nome_classe = data.toString().trim().replace(' ', '').toLowerCase();

    stdin.resume();

    let endpoint_arr = utils.askForEndpoints(endpoints_class, stdout);

    stdin.once('data', function(data) {

        let index_metodi_arr = data.toString().split(' ');
        let nomi_metodi_arr = utils.createNameArray(index_metodi_arr, endpoint_arr);

        // creo la cartella del service...
        // fs.mkdirSync(base_path + nome_classe);

        // e quella dei decorators
        // fs.mkdirSync(base_path + nome_classe + "/decorators", {recursive: true});

        utils.mkDirByPathSync(base_path + nome_classe + "/decorators");

        // popolo il service.template
        let service_template_result = {value: ""};
        let service_template_line_arr;

        service_template_line_arr = require('./templates/service.template.json').txt;

        let l = service_template_line_arr.length;
        // Per ogni riga del file service.template.txt ...
        for (let j = 0; j < l; j++) {

            let line = service_template_line_arr[j];
            let line_mod;

            // .... duplica la riga che inizia per --> per ogni metodo richiesto, oppure ...
            if (line.includes('-->')) {
                addModifiedText(nomi_metodi_arr, line, service_template_result, endpoint_arr, index_metodi_arr);
            }
            // ... duplica il blocco chiuso tra </ e /> per ogni metodo richiesto, oppure ...
            else if (line.includes('</')) {

                let i = 1;
                let block = "";

                while (!service_template_line_arr[j + i].includes('/>')) {
                    block += service_template_line_arr[j + i] + "\n";
                    i++;
                }

                addModifiedText(nomi_metodi_arr, block, service_template_result, endpoint_arr, index_metodi_arr);

                j = j + i;
            }
            // ... sostituisci normalmente senza duplicare
            else {
                line_mod = line.replace(placeholders.re_srv_1, nome_classe);
                line_mod = line_mod.replace(placeholders.re_srv_2, utils.capitalizeFirstLetter(nome_classe));
                service_template_result.value += line_mod + "\n";
            }
        }

        // sostituisco il path degli endpoints...

        let path_endpoints_arr = process.env.npm_package_config_endpoints.split("/");
        let path_services_arr = process.env.npm_package_config_services.split("/");
        let depth = "";

        for (let i = 0; i < path_services_arr.length; i++) {
            let path_service_segment = path_services_arr[i];
            // console.log("path_service_segment", path_service_segment);
            let path_endpoints_segment = (path_endpoints_arr[i]) ? path_endpoints_arr[i] : null;
            // console.log("path_endpoints_segment", path_endpoints_segment);
            if (path_service_segment !== path_endpoints_segment) {
                depth += "../";
                // console.log("depth", depth);
            }
        }

        let end_point_class = (depth + process.env.npm_package_config_endpoints).replace(".ts", "");
        // console.log("end_point_class", end_point_class);

        service_template_result.value =
            service_template_result.value.replace(placeholders.ep_class_path, end_point_class);

        // ... e salvo

        fs.writeFileSync(base_path +
            nome_classe + '/' + nome_classe + '.service.ts', service_template_result.value, 'utf8');

        // creazione dei file che devono stare dentro a /decorators
        nomi_metodi_arr.forEach((name) => {

            let service_method_signal_template = require('./templates/serviceMethodSignalContainer.template.json').txt.join('\n');
            service_method_signal_template = service_method_signal_template.replace(placeholders.re_srv_2, utils.capitalizeFirstLetter(name));

            let service_method_listener_template = require('./templates/onServiceMethodListener.template.json').txt.join('\n');
            service_method_listener_template = service_method_listener_template.replace(placeholders.re_srv_2, utils.capitalizeFirstLetter(name));

            fs.writeFileSync(base_path +
                nome_classe + '/decorators/' + utils.capitalizeFirstLetter(name) + 'ServiceMethodSignalContainer.ts',
                service_method_signal_template, 'utf8');
            fs.writeFileSync(base_path +
                nome_classe + '/decorators/' + 'On' + utils.capitalizeFirstLetter(name) + 'ServiceMethodListener.ts',
                service_method_listener_template, 'utf8');
        });

        // alla fine aggiungo i file al worktree di git
        cp.exec('git add ./src/services/web/' + nome_classe);

        process.exit();
    });
});
