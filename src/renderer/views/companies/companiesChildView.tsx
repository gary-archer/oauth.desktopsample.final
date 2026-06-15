import {JSX} from 'react';
import {Link} from 'react-router-dom';
import {Company} from '../../../shared/api/company';
import {CompaniesChildViewProps} from './companiesChildViewProps';

/*
 * Render the companies data
 */
export function CompaniesChildView(props: CompaniesChildViewProps): JSX.Element {

    /*
     * Render a single company
     */
    function renderItem(company: Company) {

        return (
            <div className='grid grid-cols-12 px-3 py-3 mt-5' key={company.id}>
                <div className='col-span-2 text-center'>
                    {company.name}
                </div>
                <div className='col-span-2 text-center'>
                    {company.region}
                </div>
                <div className='col-span-2 text-center'>
                    <Link to={`/companies/${company.id}`} className='text-blue-600 underline'>
                        View Transactions
                    </Link>
                </div>
                <div className='col-span-2 text-green-700 font-bold text-right'>
                    {Number(company.targetUsd).toLocaleString()}
                </div>
                <div className='col-span-2 text-green-700 font-bold text-right'>
                    {Number(company.investmentUsd).toLocaleString()}
                </div>
                <div className='col-span-2 font-bold text-right'>
                    {company.noInvestors}
                </div>
            </div>
        );
    }

    /*
     * Render the collection of items
     */
    return  (
        <div className='mt-3'>
            <div className='grid grid-cols-12 bg-gray-100 px-3 py-3'>
                <div className='col-span-2 font-bold text-center'>Account</div>
                <div className='col-span-2 font-bold text-center'>Region</div>
                <div className='col-span-2' />
                <div className='col-span-2 font-bold text-right'>Target USD</div>
                <div className='col-span-2 font-bold text-right'>Investment USD</div>
                <div className='col-span-2 font-bold text-right'># Investors</div>
            </div>
            <div>
                {props.companies.map((company) => renderItem(company))}
            </div>
        </div>
    );
}
