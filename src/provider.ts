import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Shell from "gi://Shell";
import Clutter from 'gi://Clutter?version=15';
import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import { AppSearchProvider } from "resource:///org/gnome/shell/ui/appDisplay.js";
import { fileExists, readFile, uniqueId } from "./util.js";
import { Pixabay, PixabayImage }  from "./pixabay.js";

interface VSStorage {
    profileAssociations: {
        workspaces: Record<string, string>;
    };
}

interface ResultMeta {
    id: string;
    name: string;
    description?: string;
    clipboardText?: string;
    createIcon?: Function;
}

class Message implements ResultMeta {
    id: string;
    name: string;
    description?: string;
    clipboardText?: string;
    createIcon?: Function;

    constructor(id: string, name: string, description: string){
        this.id = id;
        this.name = name;
        this.description = description;
        this.clipboardText = "";
        this.createIcon = () => {};
    }

}

export default class PixabaySearchProvider<
    T extends Extension & { _settings: Gio.Settings | null },
> implements AppSearchProvider {
    workspaces: Record<string, { name: string; path: string }> = {};
    _pixabayClient: Pixabay;
    _extension: T;
    _timeoutId: number;
    _results: Map<string, ResultMeta>;
    _messages: Map<string, Object>;
    app: Shell.App | null = null;
    appInfo: Gio.DesktopAppInfo | undefined;

    constructor(extension: T) {
        this._pixabayClient = new Pixabay("", "es");
        this._extension = extension;
        this.appInfo = this.app?.appInfo;
        this._results = new Map();
        this._timeoutId = 0;
        this._messages = new Map();
        this._messages.set("__loading__", new Message("__loading__", _("Pixabay"), _("Loading images from Pixabay, please wait...")));
        this._messages.set("__error__", new Message("__error__", _("Pixabay"), _("Oops, an error occurred while searching.")));
        this._messages.set("__nothing_found__", new Message("__nothing_found__", _("Pixabay"), _("Oops, I didn't found what you are looking for")));
    }

    filterResults(results: string[], maxResults: number) {
        return results.slice(0, maxResults);
    }

    showMessage(identifier: string, callback: Function){
        callback([identifier]);
    }

    async getInitialResultSet(terms: string[], cb: (results: string[]) => void, cancellable: Gio.Cancellable) {
        console.debug(`getInitialResultSet([${terms}])`);
        if (terms != null && terms.length > 0 && terms[0].substring(0, 2) === "p:"){
            const query = terms.join(" ");
            const response = await this._pixabayClient.search(query, cancellable);
        }
        return [];
    }

    _getResultSet(error: null|string, images: PixabayImage[]|null, callback: Function, timeoutId: number) {
        console.log("Error: ", error);
        console.log("Result: ", images);
        console.log("Callback: ", callback);
        console.log("timeoutId: ", timeoutId);
        console.log('FFFF: 01');
        let results: string[] = [];
        if (timeoutId === this._timeoutId) {
            console.log('FFFF: 02');
            if(images !== null && images.length > 0){
                console.log('FFFF: 03');
                images.forEach((image) => {
                    console.log('FFFF: 04');
                    const imageId = `${image.id}`;
                    this._results.set(imageId, new Message(
                        imageId,
                        image.tags,
                        image.user
                    ));
                    results.push(imageId);
                });
                callback(results);
            }else{
                this.showMessage('__nothing_found__', callback);
            }
        } else if (error) {
            // Let the user know that an error has occurred.
            this.showMessage('__error__', callback);
        }
    }


    async getSubsearchResultSet(previousResults: string[], terms: string[]) {
        console.log(`${previousResults} => ${terms}`)
        //this.getInitialResultSet(terms, callback, cancellable);
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
}

