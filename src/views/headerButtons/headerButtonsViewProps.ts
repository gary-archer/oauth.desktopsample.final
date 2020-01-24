/*
 * Input to the header buttons view
 */
export interface HeaderButtonsViewProps {

    // Whether to enable session related operations
    sessionButtonsEnabled: boolean;

    // Callbacks
    handleHomeClick: () => void;
    handleRefreshDataClick: (causeApiError: boolean) => void;
    handleExpireAccessTokenClick: () => void;
    handleExpireRefreshTokenClick: () => void;
    handleLogoutClick: () => void;
}
