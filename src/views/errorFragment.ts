import {compile} from 'handlebars';
import * as $ from 'jquery';
import * as moment from 'moment';
import {ErrorHandler} from '../plumbing/errors/errorHandler';
import {UIError} from '../plumbing/errors/uiError';

/*
 * The error fragment shows within a view to render error details
 */
export class ErrorFragment {

    /*
     * Clear existing errors
     */
    public clear(): void {

        // Clear any content
        const errorList = $('.errorForm');
        errorList.html('');

        // Hide the clear button
        const clearButton = $('#btnClearError');
        if (!clearButton.hasClass('hide')) {
            clearButton.addClass('hide');
        }
    }

    /*
     * Do the error rendering given an exception
     */
    public execute(exception: any): void {

        // Get the error into an object
        const error = ErrorHandler.getFromException(exception) as UIError;

        if (error.errorCode === 'login_required') {

            // The login required case is an excepted error that we handle by moving to the login required view
            if (location.hash.length > 0) {
                const hash = `#loginrequired&return=${encodeURIComponent(location.hash)}`;
                location.hash = hash;
            } else {
                location.hash = `#loginrequired`;
            }

        } else {

            // Otherwise render the error
            this._renderData(error);
        }
    }

    /*
     * Render the error to the UI
     */
    private _renderData(error: UIError): void {

        // Clear any content
        const errorForm = $('.errorForm');
        $('.errorForm').html('');

        // Show the clear button
        const clearButton = $('#btnClearError');
        if (clearButton.hasClass('hide')) {
            clearButton.removeClass('hide');
        }

        // Show the friendly user message
        if (error.message.length > 0) {
            errorForm.append(this._getErrorUserMessageRow(error.message));
        }

        // Display technical details that are OK to show to users
        if (error.area.length > 0) {
            errorForm.append(this._getErrorSupportRow('Area', error.area));
        }

        if (error.errorCode.length > 0) {
            errorForm.append(this._getErrorSupportRow('Error Code', error.errorCode));
        }

        if (error.statusCode > 0) {
            errorForm.append(this._getErrorSupportRow('Status Code', error.statusCode));
        }

        if (error.instanceId > 0) {
            errorForm.append(this._getErrorSupportRow('Id', error.instanceId));
        }

        if (error.utcTime.length > 0) {
            const displayTime = moment(error.utcTime).format('DD MMM YYYY HH:mm:ss');
            errorForm.append(this._getErrorSupportRow('UTC Time', displayTime));
        }

        if (error.details.length > 0) {
            errorForm.append(this._getErrorSupportRow('Details', error.details));
        }

        if (error.url.length > 0) {
            errorForm.append(this._getErrorSupportRow('URL', error.url));
        }

        // Stack details that can be shown during development
        /*
        let stack: string = '';
        error.stackFrames.forEach((f) => {
            stack += `${f}<br/>`;
        });
        if (stack.length > 0) {
            errorForm.append(this._getErrorSupportRow('Stack', stack));
        }
        */
    }

    /*
     * Return the user message, which has a larger dark blue font
     */
    private _getErrorUserMessageRow(userMessage: string): string {

        // Create a view model
        const errorViewModel = {
            message: userMessage,
        };

        // Use Handlebars to compile the HTML and handle dangerous characters securely
        const htmlTemplate = `<div class='panel panel-default'>
                                  <div class='panel-body'>
                                      <div class='row errorUserInfo'>
                                          <div class='col-xs-12'>
                                              {{message}}
                                          </div>
                                      </div>
                                  </div>
                              </div>`;
        const renderer = compile(htmlTemplate);
        return renderer(errorViewModel);
    }

    /*
     * Return a field displayed to help with technical support, which uses a smaller light blue font
     */
    private _getErrorSupportRow(title: string, value: any): string {

        // Create a view model
        const errorViewModel = {
            title,
            value,
        };

        // Use Handlebars to compile the HTML and handle dangerous characters securely
        const htmlTemplate = `<div class='panel panel-default'>
                                  <div class='panel-body'>
                                      <div class='row errorSupportInfo'>
                                          <div class='col-xs-2'>
                                              {{title}}
                                          </div>
                                          <div class='col-xs-10'>
                                              <b>{{value}}</b>
                                          </div>
                                      </div>
                                  </div>
                              </div>`;
        const renderer = compile(htmlTemplate);
        return renderer(errorViewModel);
    }
}