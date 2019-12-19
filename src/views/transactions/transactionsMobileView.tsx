import React from 'react';
import {Transaction} from '../../api/entities/transaction';
import {TransactionsViewProps} from './transactionsViewProps';

/*
 * Render the transactions view on a small mobile device
 */
export class TransactionsMobileView extends React.Component<TransactionsViewProps> {

    public constructor(props: TransactionsViewProps) {
        super(props);
    }

    /*
     * Render the data on a wide screen
     */
    public render(): React.ReactNode {

        return  this.props.data &&
                (
                    <div className='card border-0'>
                        <div className='card-header row font-weight-bold'>
                            <div className='col-12 text-center mx-auto font-weight-bold'>
                                Today's Transactions for {this.props.data.company.name}
                            </div>
                        </div>
                        <div>
                            {this.props.data.transactions.map((transaction) => this._renderTransaction(transaction))}
                        </div>
                    </div>
                );
    }

    /*
     * Render a single transaction item
     */
    private _renderTransaction(transaction: Transaction) {

        return (
            <div key={transaction.id} className='card'>
                <div className='card-body'>
                    <div className='row'>
                        <div className='col-6'>
                            Transaction Id
                        </div>
                        <div className='col-6 valuecolor font-weight-bold'>
                            {transaction.id}
                        </div>
                    </div>
                    <div className='row'>
                        <div className='col-6'>
                            Investor Id
                        </div>
                        <div className='col-6 valuecolor font-weight-bold'>
                            {transaction.investorId}
                        </div>
                    </div>
                    <div className='row'>
                        <div className='col-6'>
                            Amount USD
                        </div>
                        <div className='col-6 moneycolor font-weight-bold'>
                            {Number(transaction.amountUsd).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
