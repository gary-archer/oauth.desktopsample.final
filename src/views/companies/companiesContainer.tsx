import React from 'react';
import {ErrorCodes} from '../../plumbing/errors/errorCodes';
import {ErrorHandler} from '../../plumbing/errors/errorHandler';
import {ApplicationEventNames} from '../../plumbing/events/applicationEventNames';
import {ApplicationEvents} from '../../plumbing/events/applicationEvents';
import {ErrorSummaryView} from '../errors/errorSummaryView';
import {ApiViewNames} from '../utilities/apiViewNames';
import {CompaniesContainerProps} from './companiesContainerProps';
import {CompaniesContainerState} from './companiesContainerState';
import {CompaniesMainView} from './companiesMainView';

/*
 * Render the companies view to replace the existing view
 */
export class CompaniesContainer extends React.Component<CompaniesContainerProps, CompaniesContainerState> {

    public constructor(props: CompaniesContainerProps) {

        super(props);
        props.onLoading();

        this.state = {
            companies: [],
            error: null,
        };

        this._setupCallbacks();
    }

    /*
     * Render according to the current state and the type of device
     */
    public render(): React.ReactNode {

        // Render an error on failure
        if (this.state.error) {
            return this._renderError();
        }

        // Display nothing until there is data
        if (this.state.companies.length === 0) {
            return (
                <>
                </>
            );
        }

        // Display the desktop or mobile view otherwise
        const props = {
            companies: this.state.companies,
        };

        return  (
            <CompaniesMainView {...props}/>
        );
    }

    /*
     * Load data then listen for the reload event
     */
    public async componentDidMount(): Promise<void> {

        ApplicationEvents.subscribe(ApplicationEventNames.ON_RELOAD_MAIN, this._loadData);
        await this._loadData(false);
    }

    /*
     * Unsubscribe when we unload
     */
    public async componentWillUnmount(): Promise<void> {

        ApplicationEvents.unsubscribe(ApplicationEventNames.ON_RELOAD_MAIN, this._loadData);
    }

    /*
     * Get data from the API and update state
     */
    private async _loadData(causeError: boolean): Promise<void> {

        try {
            this.setState({error: null});

            // Do the load
            this.props.events.onViewLoading(ApiViewNames.Main);
            const companies = await this.props.apiClient.getCompanyList({causeError});
            this.props.events.onViewLoaded(ApiViewNames.Main);

            this.setState({companies});

        } catch (e) {

            // Update error state
            const error = ErrorHandler.getFromException(e);
            this.setState({companies: [], error});
            this.props.events.onViewLoadFailed(ApiViewNames.Main, error);
        }
    }

    /*
     * Output error details if required
     */
    private _renderError(): React.ReactNode {

        if (this.state.error!.errorCode === ErrorCodes.loginRequired) {
            return (
                <>
                </>
            );
        }

        const errorProps = {
            hyperlinkMessage: 'Problem Encountered in Companies View',
            dialogTitle: 'Companies View Error',
            error: this.state.error,
            centred: true,
        };

        return (
            <ErrorSummaryView {...errorProps}/>
        );
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this._loadData = this._loadData.bind(this);
    }
}
