import Gio from "gi://Gio";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { AppSearchProvider } from "resource:///org/gnome/shell/ui/appDisplay.js";
import PixabaySearchProvider from "./provider.js";
import { SearchProvider } from "./aux.js";

export default class PixabaySearchProviderExtension extends Extension {
    provider: SearchProvider | null = null;
    _settings: Gio.Settings | null = null;

    enable() {
        console.log("[PSP]", "Enable PixabaySearchProviderExtension");
        this._settings = this.getSettings();
        this.provider = new PixabaySearchProvider(this);
        Main.overview.searchController.addProvider(this.provider);
    }

    disable() {
        console.log("[PSP]", "Disable PixabaySearchProviderExtension");
        this._settings = null;
        if (this.provider) {
            Main.overview.searchController.removeProvider(this.provider);
            this.provider = null;
        }
    }
}

