import React from 'react';
import {LoginRequiredViewProps} from './loginRequiredViewProps';

/*
 * Render the simple login required view
 */
export class LoginRequiredView extends React.Component<LoginRequiredViewProps> {

    public constructor(props: any) {
        super(props);
    }

    /*
     * Inform the parent when we are loaded
     */
    public async componentDidMount(): Promise<void> {
        this.props.onViewLoading('LoginRequiredView');
        this.props.onViewLoaded();
    }

    /*
     * Render the simple logout view
     */
    public render(): React.ReactNode {

        return  (
                <div className='card border-0'>
                    <h5>
                        You are logged out - click <a href='#'>here</a> to log back in ...
                    </h5>
                </div>
        );
    }
}
