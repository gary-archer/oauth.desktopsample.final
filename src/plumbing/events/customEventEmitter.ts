import EventEmitter from 'events';

/*
 * A singleton NodeJS event emitter class to manage events used by our application
 */
export class CustomEventEmitter {

    // The global instance
    public static instance = new EventEmitter();

    /*
     * Publish an event
     */
    public static publish(eventName: string, data: any): void {
        CustomEventEmitter.instance.emit(eventName, data);
    }

    /*
     * Subscribe to receive an event multiple times
     */
    public static subscribe(eventName: string, callback: (data: any) => void): void {
        CustomEventEmitter.instance.on(eventName, callback);
    }

    /*
     * Subscribe once to an event
     */
    public static subscribeOnce(eventName: string, callback: (data: any) => void): void {
        CustomEventEmitter.instance.once(eventName, callback);
    }

    /*
     * Unsubscribe from an event
     */
    public static unsubscribe(eventName: string, callback: (data: any) => void): void {
        CustomEventEmitter.instance.removeListener(eventName, callback);
    }
}
