import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Shell from "gi://Shell";
import Clutter from 'gi://Clutter?version=15';
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { AppSearchProvider } from "resource:///org/gnome/shell/ui/appDisplay.js";
import { fileExists, readFile, uniqueId } from "./util.js";

interface VSStorage {
    profileAssociations: {
        workspaces: Record<string, string>;
    };
}

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Me.metadata.uuid);
const _ = Gettext.gettext;



class Message {
    _id: string;
    _name: string;
    _description: string;
    _createIcon: Function;

    constructor(id: string, name: string, description: string){
        this._id = id;
        this._name = name;
        this._description = description;
        this._createIcon = () => {};
    }

}
interface ResultMeta {
    id: string;
    name: string;
    description?: string;
    clipboardText?: string;
    createIcon?: string;
}

export default class PixabaySearchProvider<
    T extends Extension & { _settings: Gio.Settings | null },
> implements AppSearchProvider {
    workspaces: Record<string, { name: string; path: string }> = {};
    _extension: T;
    _timeoutId: number;
    _results: Map<string, ResultMeta>;
    _messages: Map<string, Object>;
    app: Shell.App | null = null;
    appInfo: Gio.DesktopAppInfo | undefined;

    constructor(extension: T) {
        this._extension = extension;
        this._findApp();
        this._loadWorkspaces();
        this.appInfo = this.app?.appInfo;
        this._results = new Map();
        this._timeoutId = 0;
        this._messages = new Map();
        this._messages.set("__loading__", new Message("__loading__", _("Pixabay"), _("Loading items from YouTube, please wait...")));
        this._messages.set("__error__", new Message("__error__", _("Pixabay"), _("Oops, an error occurred while searching.")));
        this._messages.set("__nothing_found__", new Message("__nothing_found__", _("Pixabay"), _("Oops, I didn't found what you are looking for")));
    }

    _loadWorkspaces() {
        const codeConfig = this._getConfig();
        if (!codeConfig) {
            console.error("Failed to read vscode storage.json");
            return;
        }

        const paths = Object.keys(codeConfig.profileAssociations.workspaces).sort();

        this.workspaces = {};
        for (const path of paths.map(decodeURIComponent)) {
            if (path.startsWith("vscode-remote://dev-container")) {
                continue;
            }
            const name = path.split("/").pop()!;
            this.workspaces[uniqueId()] = {
                name: name.replace(".code-workspace", " Workspace"),
                path: path.replace("file://", ""),
            };
        }
    }

    _getConfig(): VSStorage | undefined {
        const configDirs = [
            GLib.get_user_config_dir(),
            `${GLib.get_home_dir()}/.var/app`,
        ];

        const appDirs = [
            // XDG_CONFIG_DIRS
            "Code",
            "Code - Insiders",
            "VSCodium",
            "VSCodium - Insiders",

            // Flatpak
            "com.vscodium.codium/config/VSCodium",
            "com.vscodium.codium-insiders/config/VSCodium - Insiders",
        ];

        for (const configDir of configDirs) {
            for (const appDir of appDirs) {
                const path = `${configDir}/${appDir}/User/globalStorage/storage.json`;
                if (!fileExists(path)) {
                    continue;
                }

                const storage = readFile(path);

                if (storage) {
                    return JSON.parse(storage);
                }
            }
        }
    }

    _findApp() {
        const ids = [
            "code",
            "code-insiders",
            "code-oss",
            "com.vscodium.codium",
            "com.vscodium.codium-insiders",
        ];

        for (let i = 0; !this.app && i < ids.length; i++) {
            this.app = Shell.AppSystem.get_default().lookup_app(ids[i] + ".desktop");
        }

        if (!this.app) {
            console.error("Failed to find vscode application");
        }
    }

    activateResult(result: string): void {
        if (this.app) {
            const path = this.workspaces[result].path;
            if (
                path.startsWith("vscode-remote://") ||
                path.startsWith("vscode-vfs://")
            ) {
                const lastSegment = path.split("/").pop();
                const type = lastSegment?.slice(1)?.includes(".") ? "file" : "folder";

                const command =
                    this.app?.app_info.get_executable() + " --" + type + "-uri " + path;
                GLib.spawn_command_line_async(command);
            } else {
                this.app?.app_info.launch([Gio.file_new_for_path(path)], null);
            }
        }
    }

    _customSuffix(path: string) {
        if (!this._extension?._settings?.get_boolean("suffix")) {
            return "";
        }

        const prefixes = {
            "vscode-remote://codespaces": "[Codespaces]",
            "vscode-remote://": "[Remote]",
            "vscode-vfs://github": "[Github]",
        };

        for (const prefix of Object.keys(prefixes)) {
            if (path.startsWith(prefix)) {
                return " " + prefixes[prefix as keyof typeof prefixes];
            }
        }

        return "";
    }

    filterResults(results: string[], maxResults: number) {
        return results.slice(0, maxResults);
    }

    showMessage(identifier: string, callback: Function){
        callback([identifier]);
    }

    async getInitialResultSet(terms: string[], callback, cancellable: Gio.Cancellable) {
        console.debug(`getInitialResultSet([${terms}])`);
        if (terms != null && terms.length > 0 && terms[0].substring(0, 2) === "p:"){
             // show the loading message
            this.showMessage('__loading__', callback);
            // remove previous timeout
            if (this._timeoutId > 0) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = 0;
            }
            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                // now search
                let query = terms.join(' ');
                this._api.get(
                    this._getQuery(query.substring(2)),
                    this._getResultSet.bind(this),
                    callback,
                    this._timeoutId
                );
                return false;
            });
        } else {
            // return an emtpy result set
            this._getResultSet(null, {}, callback, 0);
        }
        this._loadWorkspaces();
        const searchTerm = terms.join("").toLowerCase();
        return Object.keys(this.workspaces).filter((id) =>
            this.workspaces[id].name.toLowerCase().includes(searchTerm),
        );
    }

    _getResultSet(error: null|string, result: Object|null, callback: Function, timeoutId: number) {
        console.log("Error: ", error);
        console.log("Result: ", result);
        console.log("Callback: ", callback);
        console.log("timeoutId: ", timeoutId);
        console.log('FFFF: 01');
        let results: string[] = [];
        if (timeoutId === this._timeoutId && result && result.length > 0) {
            console.log('FFFF: 02');
            if(result.length > 0){
                console.log('FFFF: 03');
                result.forEach((aresult) => {
                    console.log('FFFF: 04');
                    this._results.set(aresult.id, aresult);
                    results.push(aresult.id);
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
        const searchTerm = terms.join("").toLowerCase();
        return previousResults.filter((id) =>
            this.workspaces[id].name.toLowerCase().includes(searchTerm),
        );
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

