/*
 * A holder for application settings
 */
export interface AppConfiguration {
    apiBaseUrl: string;
    trustedHosts: string[];
    useProxy: boolean;
    proxyUrl: string;
}
