import GLib from "gi://GLib";
import Soup from "gi://Soup?version=3.0";

interface PixabayResponse {
    total: number;
    totalHits: number;
    hits: PixabayImage[];
}
export interface PixabayImage {
    id: number;
    pageURL: string;
    type: string;
    tags: string;
    previewURL: string;
    previewWidth: number;
    previewHeight: number;
    webformatURL: string;
    webformatWidth: number;
    webformatHeight: number;
    largeImageURL: string;
    fullHDURL: string;
    imageURL: string;
    imageWidth: number;
    imageHeight: number;
    imageSize: number;
    views: number;
    downloads: number;
    likes: number;
    comments: number;
    user_id: string;
    user: string;
    userImageURL: string;

}

export class Pixabay {
    private baseUrl = "htps://pixabay.com/api/";
    private _key: string | null = null;
    private _lang: string | null = null;

    constructor(key: string, lang: string){
        this._key = key;
        this._lang = lang;
    }

    search(query: string, getResult: Function, callback: Function, timeoutId: number): void {
        try{
            const session = new Soup.Session();
            const message = Soup.Message.new_from_encoded_form(
                'GET',
                this.baseUrl,
                Soup.form_encode_hash({
                    key: this._key,
                    lang: this._lang,
                    q: query
                })
            );
            session.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                null,
                (session, result) => {
                    try{
                        if (session === null) {
                            throw new Error("Session is null");
                        }
                        const bytes = session.send_and_read_finish(result);
                        if(bytes !== null){
                            const response = (new TextDecoder())
                                .decode(bytes.get_data()?.buffer);
                            console.log("Response: ", response);
                            const pixabayResponse: PixabayResponse = JSON.parse(response);
                            getResult(null, pixabayResponse.hits, callback, timeoutId);
                            return;
                        }else{
                            getResult("Nothing found", null, callback, timeoutId);
                        }
                    }catch(e){
                        console.error("Error: ", e);
                        getResult(`Error: ${e}`, null, callback, timeoutId);
                    }
                }
            );
        }catch(e){
            console.error("Error: ", e);
            getResult(`Error: ${e}`, null, callback, timeoutId);
        }
    }
}
