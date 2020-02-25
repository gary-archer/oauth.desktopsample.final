import EventEmitter from 'events';

/*
 * A singleton NodeJS event emitter class to manage events used by our application
 */
export class ApplicationEvents {

    // The global instance
    public static instance = new EventEmitter();

    /*
     * Publish an event
     */
    public static publish(eventName: string, data: any): void {
        ApplicationEvents.instance.emit(eventName, data);
    }

    /*
     * Subscribe to receive an event multiple times
     */
    public static subscribe(eventName: string, callback: (data: any) => void): void {
        ApplicationEvents.instance.on(eventName, callback);
    }

    /*
     * Unsubscribe from an event
     */
    public static unsubscribe(eventName: string, callback: (data: any) => void): void {
        ApplicationEvents.instance.removeListener(eventName, callback);
    }
}
