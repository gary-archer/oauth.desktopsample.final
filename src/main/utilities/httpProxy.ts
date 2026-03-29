import {EnvHttpProxyAgent} from 'undici';

/*
 * Manage routing outbound calls from the API via an HTTP proxy
 */
export class HttpProxy {

    private readonly agent: EnvHttpProxyAgent | null;

    /*
     * Create an HTTP agent to route requests to
     */
    public constructor(useProxy: boolean, proxyUrl: string) {

        if (!useProxy) {

            this.agent = null;

        } else {

            this.agent = new EnvHttpProxyAgent({
                httpsProxy: proxyUrl,
            });
        }
    }

    /*
     * Return the agent to be assigned during HTTP requests
     */
    public getDispatcher(): EnvHttpProxyAgent | null {
        return this.agent;
    }
}
