import {CompanyTransactions} from '../../../shared/api/companyTransactions';
import {UIError} from '../../../shared/errors/uiError';

/*
 * The snapshot of state exposed to the view
 */
export interface TransactionsViewState {
    data: CompanyTransactions | null;
    error: UIError | null;
}
