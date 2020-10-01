import {AxiosProxyConfig} from 'axios';

/*
 * Manage supplying the HTTP proxy on API calls and AppAuth-JS requests
 */
export class HttpProxy {

    /*
     * Set configuration
     */
    public static initialize(useProxy: boolean, proxyHost: string, proxyPort: number): void {

        if (useProxy) {
            HttpProxy._configuration = {
                host: proxyHost,
                port: proxyPort,
            }
        }
    }

    /*
     * Return the configured details
     */
    public static get(): AxiosProxyConfig | undefined {
        return HttpProxy._configuration ?? undefined;
    }

    /*
     * Return true if proxy debugging is active
     */
    public static isProxyActive(): any {
        return HttpProxy._configuration !== null;
    }

    // The global proxy configuration
    private static _configuration: AxiosProxyConfig | null = null;
}
