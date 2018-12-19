export enum WarningLevel {
    SILENT = 0,     // nessuna notifica se la chiamata fallisce, nessuna callback eseguita
    LOW = 1,        // notifiche di errore visualizzate, nessuna callback di logout o reset app verrà eseguita
    MEDIUM = 2,     // notifiche di errore visualizzate, eseguite callback di logout
    HIGH = 3,       // notifiche di errore visualizzate, eseguite callback di logout e reset app
}