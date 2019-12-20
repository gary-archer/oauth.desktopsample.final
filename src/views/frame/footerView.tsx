import React from 'react';
import {FooterViewProps} from './footerViewProps';

/*
 * The footer view renders the session id used for logging
 */
export class FooterView extends React.Component<FooterViewProps> {

    private readonly _sessionId: string;

    public constructor(props: FooterViewProps) {
        super(props);
        this._sessionId = 'xxx';
    }

    /*
     * Render the session id as a footer when data is loaded and API calls are in effect
     */
    public render(): React.ReactNode {

        if (!this.props.isVisible) {
            return (
                <>
                </>
            );
        }

        return  (
                    <div className='footer text-right mx-auto'>
                        <small>{`API Session Id: ${this._sessionId}`}</small>
                    </div>
                );
    }
}
