import {Crypto} from '@openid/appauth';
import base64url from 'base64url';
import {createHash, randomBytes} from 'crypto';

/*
 * A simple Node.js implementation of the AppAuth-JS Crypto interface
 */
export class NodeCrypto implements Crypto {

    public generateRandom(size: number): string {
        const sizeToUse = size > 64 ? 64 : size;
        return base64url.encode(randomBytes(sizeToUse));
    }

    public async deriveChallenge(code: string): Promise<string> {
        const hash = createHash('sha256').update(code).digest();
        return base64url.encode(hash);
    }
}
