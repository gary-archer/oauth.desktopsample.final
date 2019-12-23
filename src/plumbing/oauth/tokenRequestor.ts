import {Requestor} from '@openid/appauth';

/*
 * This replaces the default JQueryRequestor, since that class loses error responses
 */
export class TokenRequestor extends Requestor {

    /*
     * Run the Ajax request and return OAuth errors as objects
     */
    public async xhr<T>(settings: JQueryAjaxSettings): Promise<T> {

        try {
            // Get data
            console.log('IN REQUESTOR')
            return {} as T;

        } catch (xhr) {

            // If the response is an error object then throw that
            if (xhr.responseJSON) {
                throw xhr.responseJSON;
            }

            // Otherwise throw the technical error details
            throw xhr;
        }
    }
}
