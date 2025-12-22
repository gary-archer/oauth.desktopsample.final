/*
 * A base64url utility
 */
export class Base64Url {

    /*
     * Decode to readable text
     */
    public static decode(input: string): string {

        const base64 = input
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        return Buffer.from(base64, 'base64').toString();
    }
}
