import EventBus from 'js-event-bus';

/*
 * Input to the header buttons view
 */
export interface HeaderButtonsViewProps {

    // Enables the view to receive events
    eventBus: EventBus;

    // Callbacks when they are clicked
    handleHomeClick: () => void;
    handleReloadDataClick: (longPressed: boolean) => void;
    handleExpireAccessTokenClick: () => void;
    handleExpireRefreshTokenClick: () => void;
    handleLogoutClick: () => void;
}
