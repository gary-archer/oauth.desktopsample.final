import https from 'https';
import tls from 'tls';
import fs from 'fs';

/*
 * Work around a problem on Ubuntu Linux
 * https://stackoverflow.com/questions/68896243/how-to-properly-configure-node-js-to-use-self-signed-root-certificates
 */
export class ExtraCaCerts {

    public static initialize(): void {

        if (process.env.NODE_EXTRA_CA_CERTS) {

            const list = (process.env.NODE_EXTRA_CA_CERTS || '').split(',');
            const additionalCerts = list.map(extraCert => fs.readFileSync(extraCert, 'utf8'));

            https.globalAgent.options.ca = [
                ...tls.rootCertificates,
                ...additionalCerts
            ];
        }
    }
}
