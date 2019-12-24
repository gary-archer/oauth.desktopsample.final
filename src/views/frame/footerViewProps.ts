import {ApiClient} from '../../api/client/apiClient';

/*
 * Input to the footer view
 */
export interface FooterViewProps {

    // Visibility
    isVisible: boolean;

    // The API client provides the footer session id
    apiClient: ApiClient;
}
