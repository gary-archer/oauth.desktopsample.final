import EventEmitter from 'events';

/*
 * Events used during redirects
 */
export class RedirectEvents extends EventEmitter {

    public static ON_AUTHORIZATION_RESPONSE = 'authorization_response';
    public static ON_AUTHORIZATION_RESPONSE_COMPLETED = 'authorization_response_completed';
}
