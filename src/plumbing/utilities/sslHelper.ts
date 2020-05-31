// import fs from 'fs-extra';

/*
 * A helper class used at application startup to configure SSL trust
 */
export class SslHelper {

    /*
     * Force Electron to honour the standard NodeJS environment variable NODE_EXTRA_CA_CERTS
     */
    public static async configureTrust(): Promise<void> {

        /* GJA
        // Typically this environment variable is only used in development environments
        if (process.env.NODE_EXTRA_CA_CERTS) {

            // This can be used as a hack to bypass certificate trust on a developer PC
            // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

            // Read the certificates
            const extraRootCerts = await fs.readFile(process.env.NODE_EXTRA_CA_CERTS);

            // Use the approach from the below link to add root certificates
            // https://github.com/electron/electron/issues/10257
            const nativeSecureContext = (process as any).binding('crypto').SecureContext;
            const oldPrototypeMethod = nativeSecureContext.prototype.addRootCerts;
            nativeSecureContext.prototype.addRootCerts = function() {

                const newPrototypeMethod = oldPrototypeMethod.apply(this, arguments);
                this.addCACert(extraRootCerts);
                return newPrototypeMethod;
            };
        }*/
    }
}
