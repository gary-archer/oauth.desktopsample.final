import * as AppAuth from '@openid/appauth';
import * as $ from 'jquery';

/*
 * This replaces the default JQueryRequestor, since that class loses error responses
 */
export class TokenRequestor extends AppAuth.Requestor {

    /*
     * Run the Ajax request and return OAuth errors as objects
     */
    public async xhr<T>(settings: JQueryAjaxSettings): Promise<T> {

        try {
            // Get data
            const data = await $.ajax(settings);
            return data as T;

        } catch (xhr) {

            // If the response is an error object then throw that
            if (xhr.responseJSON) {
                throw (xhr.responseJSON);
            }

            // Otherwise throw the technical error details
            throw(xhr);
        }
    }
}
