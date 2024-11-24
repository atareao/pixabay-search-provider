import Glib from "gi://GLib";
import Soup from "gi://Soup";

export const uniqueId = () =>
    [...Array(8)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");

export const readFile = (path: string): string | undefined => {
    const [ok, data] = Glib.file_get_contents(path);
    if (!ok) {
        return;
    }

    return new TextDecoder().decode(data);
};

export const fileExists = (path: string): boolean =>
    Glib.file_test(path, Glib.FileTest.EXISTS);


export const getImages = (): string | undefined => {
    try {
        const session = new Soup.Session();

        const message = Soup.Message.new_from_encoded_form(
            'GET',
            this.baseUrl,
            Soup.form_encode_hash(this.params)
        );
        const bytes = session.send_and_read(message, Gio.Cancellable.new());
        if (bytes !== null) {
            const response = (new TextDecoder())
                .decode(bytes.get_data()?.buffer);
            console.log("Response: ", response);
            this.data = JSON.parse(response);
        }

    } catch (e) {
        console.error("Error: ", e)
    }
    return;
}
