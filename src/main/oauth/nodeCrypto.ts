import {Crypto} from '@openid/appauth';
import {createHash, randomBytes} from 'node:crypto';

/*
 * A simple Node.js implementation of the AppAuth-JS Crypto interface
 */
export class NodeCrypto implements Crypto {

    public generateRandom(size: number): string {
        const sizeToUse = size > 64 ? 64 : size;
        return randomBytes(sizeToUse).toString('base64url');
    }

    public async deriveChallenge(code: string): Promise<string> {
        const hash = createHash('sha256').update(code).digest();
        return hash.toString('base64url');
    }
}
