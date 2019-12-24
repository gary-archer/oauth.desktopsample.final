/*
 * This class was copied from StupidUglyFool to implement PKCE support
 * When proper PKCE support is added to AppAuth-JS we will use that instead
 * https://github.com/openid/AppAuth-JS/issues/28
 * https://gist.github.com/stupiduglyfool/3a5bd9e121330013c78fbfe0697cf76d#file-codeverifier-ts
 */

import crypto from 'crypto';

/*
 * PKCE code verifier
 */
export class CodeVerifier {

    private readonly _verifier: string;
    private readonly _challenge: string;

    public constructor() {
        this._verifier = this.generateVerifier();
        this._challenge = this.base64URLEncode(this.sha256(this.verifier));
    }

    public get verifier(): string {
        return this._verifier;
    }

    public get challenge(): string {
        return this._challenge;
    }

    public get method(): string {
        return 'S256';
    }

    private sha256(value: string): Buffer {
        return crypto.createHash('sha256').update(value).digest();
    }

    private generateVerifier(): string {
        return this.base64URLEncode(crypto.randomBytes(32));
    }

    private base64URLEncode(value: Buffer): string {
        return value.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
}
