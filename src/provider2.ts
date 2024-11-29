import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Shell from "gi://Shell";
import Clutter from 'gi://Clutter?version=15';
import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import { AppSearchProvider } from "resource:///org/gnome/shell/ui/appDisplay.js";
import { Pixabay, PixabayImage }  from "./pixabay.js";
import { SearchProvider, ResultMeta} from "./aux.js";


export default class PixabaySearchProvider<
    T extends Extension & { _settings: Gio.Settings | null },
> implements SearchProvider {
    workspaces: Record<string, { name: string; path: string }> = {};
    _pixabayClient: Pixabay;
    _extension: T;
    _timeoutId: number;
    _results: Map<string, PixabayImage>;
    _messages: Map<string, Object>;
    app: Shell.App | null = null;

    constructor(extension: T) {
        this._pixabayClient = new Pixabay("", "es");
        this._extension = extension;
        this._results = new Map();
        this._timeoutId = 0;
        this._messages = new Map();
        this._messages.set("__loading__", new Message("__loading__", _("Pixabay"), _("Loading images from Pixabay, please wait...")));
        this._messages.set("__error__", new Message("__error__", _("Pixabay"), _("Oops, an error occurred while searching.")));
        this._messages.set("__nothing_found__", new Message("__nothing_found__", _("Pixabay"), _("Oops, I didn't found what you are looking for")));
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
        console.debug(`activateResult(${result})`);
        const image = this._results.get(result);
        if(image !== undefined){
            GLib.spawn_command_line_async(`xdg-open ${image.pageURL}`);
        }
    }

    async getInitialResultSet(terms: string[], cancellable: Gio.Cancellable) : Promise<string[]> {
        console.debug(`getInitialResultSet([${terms}])`);
        const results = [];
        if (terms != null && terms.length > 0 && terms[0].substring(0, 2) === "p:"){
            const query = terms.join(" ");
            const response = await this._pixabayClient.search(query, cancellable);
            for(let image of response){
                this._results.set(`${image.id}`, image);
                results.push(`${image.id}`);
            }
        }
        return results;
    }

    async getSubsearchResultSet(previousResults: string[], terms: string[]) : Promise<string[]> {
        console.log(`${previousResults} => ${terms}`)
        return previousResults.filter((id) => {
            let image = this._results.get(id);
            if(image === undefined){
                return false;
            }
            let include = true;
            for(let term of terms){
                if(!image.tags.includes(term)){
                    include = false;
                    break;
                }
            }
        });
    }

    async getResultMetas(ids: string[]) {
        return ids.map((id) => ({
            id,
            name:
                this.workspaces[id].name + this._customSuffix(this.workspaces[id].path),
            description: this.workspaces[id].path,
            createIcon: (size: number) => this.app?.create_icon_texture(size),
        }));
    }

    createResultObject(meta: ResultMeta): Clutter.Actor | null {
        console.debug(`createResultObject(${meta.id})`);

        return null;
    }

    filterResults(results: string[], maxResults: number) {
        return results.slice(0, maxResults);
    }

    showMessage(identifier: string, callback: Function){
        callback([identifier]);
    }
}
