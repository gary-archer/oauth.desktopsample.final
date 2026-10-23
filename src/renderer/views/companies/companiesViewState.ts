import {Company} from '../../../shared/api/company';
import {UIError} from '../../../shared/errors/uiError';

/*
 * The snapshot of state exposed to the view
 */
export interface CompaniesViewState {
    companies: Company[];
    error: UIError | null;
}
