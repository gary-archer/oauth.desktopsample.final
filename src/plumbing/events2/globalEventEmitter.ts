import EventEmitter from 'events';

/*
 * Events used by our application, which are accessed globally
 */
export class GlobalEventEmitter {

    // The global instance
    public static instance = new EventEmitter();

    /*
     * Publish an event
     */
    public static publish(eventName: string, data: any): void {
        this.instance.emit(eventName, data);
    }

    /*
     * Subscribe to an event
     */
    public static subscribe(eventName: string, callback: (data: any) => void): void {
        this.instance.on(eventName, callback);
    }

    /*
     * Unsubscribe from an event
     */
    public static unsubscribe(eventName: string, callback: (data: any) => void): void {
        this.instance.removeListener(eventName, callback);
    }
}
