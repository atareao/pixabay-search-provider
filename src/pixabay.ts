import Soup from "gi://Soup?version=3.0";
import Gio from 'gi://Gio';

interface PixabayResponse {
    total: number;
    totalHits: number;
    hits: Image[];
}
interface Image {
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

export default class Pixabay {
    private baseUrl = "htps://pixabay.com/api/";
    private _key: string | null = null;
    private _lang: string | null = null;

    constructor(key: string, lang: string){
        this._key = key;
        this._lang = lang;
    }

    search(query: string): Image[] {
        const images: Image[] = [];
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
            const bytes = session.send_and_read(message, Gio.Cancellable.new());
            if(bytes !== null){
                const response = (new TextDecoder())
                    .decode(bytes.get_data()?.buffer);
                console.log("Response: ", response);
                const pixabayResponse: PixabayResponse = JSON.parse(response);
                return pixabayResponse.hits;
            }
        }catch(e){
            console.error("Error: ", e);
        }
        return images;
    }
}
