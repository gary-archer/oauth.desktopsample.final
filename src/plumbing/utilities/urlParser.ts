/*
 * A utility to parse private URI scheme URLs
 */
export class UrlParser {

    public static tryParse(url: string): URL | null {

        try {
            return new URL(url);

        } catch {
            return null;
        }
    }
}
