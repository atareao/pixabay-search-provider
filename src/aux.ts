import Glib from "gi://GLib";
import Gio from "gi://Gio";
import Clutter from 'gi://Clutter?version=15';

export interface ResultMeta {
    id: string;
    name: string;
    description?: string;
    clipboardText?: string;
    createIcon?: (size: number) => Clutter.Actor;
}

export interface SearchProvider {
    /**
    * The application of the provider.
    *
    * Applications will return a `Gio.AppInfo` representing themselves.
    * Extensions will usually return `null`.
    */
    get appInfo(): Gio.AppInfo | null;
    /**
    * Whether the provider offers detailed results.
    *
    * Applications will return `true` if they have a way to display more
    * detailed or complete results. Extensions will usually return `false`.
    */
    get canLaunchSearch(): boolean;
    /**
    * The unique ID of the provider.
    *
    * Applications will return their application ID. Extensions will usually
    * return their UUID.
    */
    get id(): string;
    /**
    * Launch the search result.
    *    
    * This method is called when a search provider result is activated.
    */
    activateResult(result: string, terms: string[]): void;
    /**
    * Launch the search provider.
    *
    * This method is called when a search provider is activated. A provider can
    * only be activated if the `appInfo` property holds a valid `Gio.AppInfo`
    * and the `canLaunchSearch` property is `true`.
    */
    launchSearch(terms: string[]): void;
    /**
    * Create a result object.
    *
    * This method is called to create an actor to represent a search result.
    */
    createResultObject(meta: ResultMeta): Clutter.Actor | null;
    /**
    * Get result metadata.
    *
    * This method is called to get a `ResultMeta` for each identifier.
    */
    getResultMetas(results: string[], cancellable: Gio.Cancellable): Promise<ResultMeta[]>;
    /**
    * Initiate a new search.
    *
    * This method is called to start a new search and should return a list of
    * unique identifiers for the results.
    */
    getInitialResultSet(terms: string[], cancellable: Gio.Cancellable): Promise<string[]>;
    /**
    * Refine the current search.
    *
    * This method is called to refine the current search results with
    * expanded terms and should return a subset of the original result set.
    *
    * Implementations may use this method to refine the search results more
    * efficiently than running a new search, or simply pass the terms to the
    * implementation of `getInitialResultSet
    */
    getSubsearchResultSet(results: string[], terms: string[], cancellable: Gio.Cancellable): Promise<string[]>;
    /**
    * Filter the current search.
    *
    * This method is called to truncate the number of search results.
    *
    * Implementations may use their own criteria for discarding results, or
    * simply return the first n-items.
    */
    filterResults(results: string[], maxResults: number): string[];

}

class SearchProvider2 {
    constructor(extension) {
        this._extension = extension;
    }

    /**
     * The application of the provider.
     *
     * Applications will return a `Gio.AppInfo` representing themselves.
     * Extensions will usually return `null`.
     *
     * @type {Gio.AppInfo}
     */
    get appInfo(): Gio.AppInfo {
        return null;
    }

    /**
     * Whether the provider offers detailed results.
     *
     * Applications will return `true` if they have a way to display more
     * detailed or complete results. Extensions will usually return `false`.
     *
     * @type {boolean}
     */
    get canLaunchSearch() {
        return false;
    }

    /**
     * The unique ID of the provider.
     *
     * Applications will return their application ID. Extensions will usually
     * return their UUID.
     *
     * @type {string}
     */
    get id() {
        return this._extension.uuid;
    }

    /**
     * Launch the search result.
     *
     * This method is called when a search provider result is activated.
     *
     * @param {string} result - The result identifier
     * @param {string[]} terms - The search terms
     */
    activateResult(result, terms) {
        console.debug(`activateResult(${result}, [${terms}])`);
    }

    /**
     * Launch the search provider.
     *
     * This method is called when a search provider is activated. A provider can
     * only be activated if the `appInfo` property holds a valid `Gio.AppInfo`
     * and the `canLaunchSearch` property is `true`.
     *
     * Applications will typically open a window to display more detailed or
     * complete results.
     *
     * @param {string[]} terms - The search terms
     */
    launchSearch(terms) {
        console.debug(`launchSearch([${terms}])`);
    }

    /**
     * Create a result object.
     *
     * This method is called to create an actor to represent a search result.
     *
     * Implementations may return any `Clutter.Actor` to serve as the display
     * result, or `null` for the default implementation.
     *
     * @param {ResultMeta} meta - A result metadata object
     * @returns {Clutter.Actor|null} An actor for the result
     */
    createResultObject(meta) {
        console.debug(`createResultObject(${meta.id})`);

        return null;
    }

    /**
     * Get result metadata.
     *
     * This method is called to get a `ResultMeta` for each identifier.
     *
     * If @cancellable is triggered, this method should throw an error.
     *
     * @async
     * @param {string[]} results - The result identifiers
     * @param {Gio.Cancellable} cancellable - A cancellable for the operation
     * @returns {Promise<ResultMeta[]>} A list of result metadata objects
     */
    getResultMetas(results, cancellable) {
        console.debug(`getResultMetas([${results}])`);

        const {scaleFactor} = St.ThemeContext.get_for_stage(global.stage);

        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(
                () => reject(Error('Operation Cancelled')));

            const resultMetas = [];

            for (const identifier of results) {
                const meta = {
                    id: identifier,
                    name: 'Result Name',
                    description: 'The result description',
                    clipboardText: 'Content for the clipboard',
                    createIcon: size => {
                        return new St.Icon({
                            icon_name: 'dialog-information',
                            width: size * scaleFactor,
                            height: size * scaleFactor,
                        });
                    },
                };

                resultMetas.push(meta);
            }

            cancellable.disconnect(cancelledId);
            if (!cancellable.is_cancelled())
                resolve(resultMetas);
        });
    }

    /**
     * Initiate a new search.
     *
     * This method is called to start a new search and should return a list of
     * unique identifiers for the results.
     *
     * If @cancellable is triggered, this method should throw an error.
     *
     * @async
     * @param {string[]} terms - The search terms
     * @param {Gio.Cancellable} cancellable - A cancellable for the operation
     * @returns {Promise<string[]>} A list of result identifiers
     */
    getInitialResultSet(terms, cancellable) {
        console.debug(`getInitialResultSet([${terms}])`);

        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(
                () => reject(Error('Search Cancelled')));

            const identifiers = [
                'result-01',
                'result-02',
                'result-03',
            ];

            cancellable.disconnect(cancelledId);
            if (!cancellable.is_cancelled())
                resolve(identifiers);
        });
    }

    /**
     * Refine the current search.
     *
     * This method is called to refine the current search results with
     * expanded terms and should return a subset of the original result set.
     *
     * Implementations may use this method to refine the search results more
     * efficiently than running a new search, or simply pass the terms to the
     * implementation of `getInitialResultSet()`.
     *
     * If @cancellable is triggered, this method should throw an error.
     *
     * @async
     * @param {string[]} results - The original result set
     * @param {string[]} terms - The search terms
     * @param {Gio.Cancellable} cancellable - A cancellable for the operation
     * @returns {Promise<string[]>}
     */
    getSubsearchResultSet(results, terms, cancellable) {
        console.debug(`getSubsearchResultSet([${results}], [${terms}])`);

        if (cancellable.is_cancelled())
            throw Error('Search Cancelled');

        return this.getInitialResultSet(terms, cancellable);
    }

    /**
     * Filter the current search.
     *
     * This method is called to truncate the number of search results.
     *
     * Implementations may use their own criteria for discarding results, or
     * simply return the first n-items.
     *
     * @param {string[]} results - The original result set
     * @param {number} maxResults - The maximum amount of results
     * @returns {string[]} The filtered results
     */
    filterResults(results, maxResults) {
        console.debug(`filterResults([${results}], ${maxResults})`);

        if (results.length <= maxResults)
            return results;

        return results.slice(0, maxResults);
    }
}
