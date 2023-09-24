import {HeaderButtonsViewModel} from './headerButtonsViewModel';

/*
 * Input to the header buttons view
 */
export interface HeaderButtonsViewProps {

    // Permanent model data
    model: HeaderButtonsViewModel;

    // Callbacks when they are clicked
    handleHomeClick: () => void;
    handleReloadDataClick: (longPressed: boolean) => void;
    handleExpireAccessTokenClick: () => void;
    handleExpireRefreshTokenClick: () => void;
    handleLogoutClick: () => void;
}
