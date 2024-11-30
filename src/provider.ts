import GLib from "gi://GLib";
import Gio from "gi://Gio";
import St from "gi://St";
import Shell from "gi://Shell";
import Clutter from 'gi://Clutter?version=15';
import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import { Pixabay, PixabayImage }  from "./pixabay.js";
import { SearchProvider, ResultMeta} from "./aux.js";


export default class PixabaySearchProvider<
    T extends Extension & { _settings: Gio.Settings | null },
> implements SearchProvider {
    _pixabayClient: Pixabay;
    _extension: T;
    _timeoutId: any;
    _results: Map<string, PixabayImage>;
    _messages: Map<string, Object>;
    app: Shell.App | null = null;

    constructor(extension: T) {
        this._pixabayClient = new Pixabay("", "es");
        this._extension = extension;
        this._results = new Map();
        this._timeoutId = 0;
        this._messages = new Map<string, ResultMeta>();
        this._messages.set("__loading__", {id: "__loading__", name: _("Pixabay"), description: _("Loading images from Pixabay, please wait...")});
        this._messages.set("__error__", {id: "__error__", name: _("Pixabay"), description: _("Oops, an error occurred while searching.")});
        this._messages.set("__nothing_found__", {id: "__nothing_found__", name: _("Pixabay"), description: _("Oops, I didn't found what you are looking for")});
    }

    get appInfo(): Gio.AppInfo | null {
        return null;
    }

    get canLaunchSearch(): boolean {
        return false;
    }

    get id(): string{
        return this._extension.uuid;
    }

    activateResult(result: string, _terms: string[]){
        console.log(`activateResult(${result})`);
        const image = this._results.get(result);
        if(image !== undefined){
            GLib.spawn_command_line_async(`xdg-open ${image.pageURL}`);
        }
    }

    launchSearch(terms: string[]): void {
        console.log(`launchSearch([${terms}])`);
        
    }

    createResultObject(meta: ResultMeta): Clutter.Actor | null {
        console.debug(`createResultObject(${meta.id})`);
        const selected = this._results.get(meta.id);
        if(selected){
            let actor = new Clutter.Actor();
            let gicon = Gio.icon_new_for_string(selected.previewURL);
            let icon = new St.Icon({gicon: gicon,
                                    style_class: 'youtube-icon'});
            icon.set_icon_size(150);
            actor.add_child(icon);
            return actor;
        }
        return null;
    }

    getResultMetas(identifiers: string[], callback: Function) {
        let metas = [];
        for(const identifier of identifiers){
            if (identifier in this._messages){
                metas.push(this._messages.get(identifier));
            }else{
                // TODO: check for messages that don't exist, show generic error message
                let meta = this._results.get(identifier);
                if (meta){
                    log("Id: " + meta.id);
                    log("Url: " + meta.previewURL);
                    log("widht: " + meta.previewWidth);
                    log("height: " + meta.previewHeight);
                    metas.push({
                        id: meta.id,
                        name: meta.tags,
                        description : meta.tags,
                        createIcon: ()=>{
                            log('Actor')
                            let actor = new Clutter.Actor();
                            let gicon = Gio.icon_new_for_string(meta.previewURL);
                            let icon = new St.Icon({gicon: gicon,
                                                    style_class: 'youtube-icon'});
                            icon.set_icon_size(150);
                            actor.add_child(icon);
                            return actor;
                        }
                    });
                }
            }
        }
        callback(metas);
    }


    getInitialResultSet(terms: string[], callback: Function, cancellable: Gio.Cancellable) : void{
        console.log(`getInitialResultSet([${terms}])`);
        if (terms != null && terms.length > 0 && terms[0].substring(0, 2) === "p:"){
            if (this._timeoutId > 0){
                GLib.source_remove(this._timeoutId);
                this._timeoutId = 0;
            }
            let pixabaySourceFunc: GLib.SourceFunc;
            pixabaySourceFunc = () => {
                const query = terms.join(" ");
                const response = this._pixabayClient.search(query, cancellable);
                if(response) {
                    const results = [];
                    for(let image of response){
                        this._results.set(`${image.id}`, image);
                        results.push(`${image.id}`);
                    }
                    callback(results);
                }
                return true;
            };
            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, pixabaySourceFunc);
        }
    }

    getSubsearchResultSet(previousResults: string[], terms: string[], callback: Function, cancellable: Gio.Cancellable): void{
        console.log(`getSubsearchResultSet`);

    }

    filterResults(results: string[], maxResults: number) {
        return results.slice(0, maxResults);
    }

    showMessage(identifier: string, callback: Function){
        callback([identifier]);
    }
}
