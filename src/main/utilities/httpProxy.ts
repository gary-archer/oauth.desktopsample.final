import {HttpsProxyAgent} from 'https-proxy-agent';

/*
 * Manage routing outbound calls from the API via an HTTP proxy
 */
export class HttpProxy {

    private readonly agent: any;

    /*
     * Create an HTTP agent to route requests to
     */
    public constructor(useProxy: boolean, proxyUrl: string) {

        if (useProxy) {
            this.agent = new HttpsProxyAgent(proxyUrl);
        }
    }

    /*
     * Return the agent to other parts of the app
     */
    public getAgent(): HttpsProxyAgent<string> {
        return this.agent;
    }
}
