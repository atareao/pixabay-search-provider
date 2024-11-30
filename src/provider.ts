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
    _timeout: number;
    _results: Map<string, PixabayImage>;
    _messages: Map<string, Object>;
    app: Shell.App | null = null;

    constructor(extension: T) {
        this._pixabayClient = new Pixabay("", "es");
        this._extension = extension;
        this._results = new Map();
        this._timeout = 0;
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
        console.log("[PSP]", `activateResult(${result})`);
        const image = this._results.get(result);
        if(image !== undefined){
            GLib.spawn_command_line_async(`xdg-open ${image.pageURL}`);
        }
    }

    launchSearch(terms: string[]): void {
        console.log("[PSP]", `launchSearch([${terms}])`);
        
    }

    createResultObject(meta: ResultMeta): Clutter.Actor | null {
        console.log("[PSP]", `createResultObject(${meta})`);
        console.debug(`createResultObject(${meta.id})`);
        const selected = this._results.get(meta.id);
        if(selected){
            console.log("[PSP]", `selected ${meta.name}`);
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

    async getResultMetas(results: string[], cancellable: Gio.Cancellable) : Promise<ResultMeta[]> {
        console.log("[PSP]", `getResultMetas(${results})`);
        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(
                () => reject(Error('Operation Cancelled')));

            const resultMetas: ResultMeta[] = [];

            for(const identifier of results){
                // TODO: check for messages that don't exist, show generic error message
                let meta = this._results.get(identifier);
                if (meta){
                    //console.log("[PSP]", "Id: " + meta.id);
                    //console.log("[PSP]", "Url: " + meta.previewURL);
                    //console.log("[PSP]", "widht: " + meta.previewWidth);
                    //console.log("[PSP]", "height: " + meta.previewHeight);
                    resultMetas.push({
                        id: `${meta.id}`,
                        name: meta.tags,
                        description : meta.tags,
                        createIcon: (size) => {
                            //console.log("[PSP]", "height: " + meta.previewHeight);
                            console.log(size);
                            const actor = new Clutter.Actor(); 
                            const gicon = Gio.icon_new_for_string(meta.previewURL);
                            const icon = new St.Icon({
                                gicon: gicon,
                                width: meta.previewWidth,
                                height: meta.previewHeight,
                                style_class: 'youtube-icon'
                            });
                            actor.add_child(icon);
                            return actor;
                        },
                    });
                }
            }

            cancellable.disconnect(cancelledId);
            if (!cancellable.is_cancelled())
                resolve(resultMetas);
        });
    }


    async getInitialResultSet(terms: string[], cancellable: Gio.Cancellable) : Promise<string[]> {
        console.log("[PSP]", `getInitialResultSet([${terms}])`);
        if(terms.length > 0 && terms[0].trim().length > 2 && terms[0].trim().substring(0, 2) == "p:"){
            console.log("[PSP]", "antes");
            const images = await this._pixabayClient.search_async(terms[0].trim().substring(2), cancellable);
            console.log("[PSP]", `images: ${images}`);
            for(let image of images){
                this._results.set(image.id.toString(), image);
            }
            const identifers = Array.from(this._results.keys());
            return identifers;
        }else{
            console.log("[PSP]", "quer raro");
            console.log("[PSP]", `'${terms}'`);
            console.log("[PSP]", `Length: ${terms.length}`);
            console.log("[PSP]", `Length: ${terms[0].length}`);
            console.log("[PSP]", `Start: ${terms[0].trim().substring(0, 2)}`);
        }
        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(
                () => reject(Error('Search Cancelled')));
            cancellable.disconnect(cancelledId);
            if (!cancellable.is_cancelled())
                resolve([]);
        });
    }

    async getSubsearchResultSet(previousResults: string[], terms: string[], cancellable: Gio.Cancellable): Promise<string[]>{
        console.log("[PSP]", `getSubsearchResultSet`);
        console.log("[PSP]", `previousResults: ${previousResults}`);
        console.log("[PSP]", `terms: ${terms}`);
        if (cancellable.is_cancelled()){
            throw Error('Search Cancelled');
        }
        return this.getInitialResultSet(terms, cancellable);
    }

    filterResults(results: string[], maxResults: number) {
        console.log("[PSP]", `filterResults`);
        return results.slice(0, maxResults);
    }

    showMessage(identifier: string, callback: Function){
        console.log("[PSP]", `showMessage`);
        callback([identifier]);
    }
}
