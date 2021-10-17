import React from 'react';
import {Company} from '../../api/entities/company';
import {CompaniesViewProps} from './companiesViewProps';

/*
 * Render the companies view for the browser case
 */
export class CompaniesMainView extends React.Component<CompaniesViewProps> {

    public constructor(props: CompaniesViewProps) {
        super(props);
    }

    /*
     * Render according to the current state
     */
    public render(): React.ReactNode {

        return  (
            <div className='card border-0'>
                <div className='card-header row'>
                    <div className='col-2 font-weight-bold text-center'>Account</div>
                    <div className='col-2 font-weight-bold text-center'>Region</div>
                    <div className='col-2' />
                    <div className='col-2 font-weight-bold text-right'>Target USD</div>
                    <div className='col-2 font-weight-bold text-right'>Investment USD</div>
                    <div className='col-2 font-weight-bold text-right'># Investors</div>
                </div>
                <div className='card-body'>
                    {this.props.companies.map((company) => this._renderItem(company))}
                </div>
            </div>
        );
    }

    /*
     * Render a single company on a large screen
     */
    private _renderItem(company: Company) {

        return (
            <div className='row listRow' key={company.id}>
                <div className='col-2 my-auto text-center'>
                    {company.name}
                </div>
                <div className='col-2 my-auto text-center'>
                    {company.region}
                </div>
                <div className='col-2 my-auto text-center'>
                    <a href={`#company=${company.id}`}>
                        View Transactions
                    </a>
                </div>
                <div className='col-2 my-auto highlightcolor font-weight-bold text-right'>
                    {Number(company.targetUsd).toLocaleString()}
                </div>
                <div className='col-2 my-auto highlightcolor font-weight-bold text-right'>
                    {Number(company.investmentUsd).toLocaleString()}
                </div>
                <div className='col-2 my-auto font-weight-bold text-right'>
                    {company.noInvestors}
                </div>
            </div>
        );
    }
}
