/*
 * An error class focused on UI scenarios
 */
export class UIError extends Error {

    // Technical fields to display
    private area: string;
    private errorCode: string;
    private userAction: string;
    private utcTime: string;
    private statusCode: number;
    private instanceId: number;
    private details: string;

    // Additional details that can be shown during development
    private url: string;

    /*
     * All types of error supply at least these fields
     */
    public constructor(area: string, errorCode: string, userMessage: string, stack?: string | undefined) {

        super(userMessage);

        this.area = area;
        this.errorCode = errorCode;
        this.userAction = 'Please retry the operation';
        this.utcTime = new Date().toISOString();
        this.statusCode = 0;
        this.instanceId = 0;
        this.details = '';
        this.url = '';

        // Ensure that instanceof works
        Object.setPrototypeOf(this, new.target.prototype);

        // Store the stack of the original exception if provided
        if (stack) {
            this.stack = stack;
        }
    }

    public getArea(): string {
        return this.area;
    }

    public getErrorCode(): string {
        return this.errorCode;
    }

    public setErrorCode(value: string): void {
        this.errorCode = value;
    }

    public getUserAction(): string {
        return this.userAction;
    }

    public setUserAction(value: string): void {
        this.userAction = value;
    }

    public getUtcTime(): string {
        return this.utcTime;
    }

    public getStatusCode(): number {
        return this.statusCode;
    }

    public setStatusCode(value: number): void {
        this.statusCode = value;
    }

    public getInstanceId(): number {
        return this.instanceId;
    }

    public getDetails(): string {
        return this.details;
    }

    public setDetails(value: string): void {
        this.details = value;
    }

    public getUrl(): string {
        return this.url;
    }

    public setUrl(value: string): void {
        this.url = value;
    }

    /*
     * Override details when an API 500 error is handled
     */
    public setApiErrorDetails(area: string, id: number, utcTime: string): void {
        this.area = area;
        this.instanceId = id;
        this.utcTime = utcTime;
    }

    /*
     * Serialize the error to JSON when the main side of the app returns an error to the renderer
     */
    public toJson(pretty = false): string {

        const error: any = {
            area: this.area,
            code: this.errorCode,
            message: this.message,
            userAction: this.userAction,
            utcTime: this.utcTime,
        };

        if (this.statusCode) {
            error.statusCode = this.statusCode;
        }
        if (this.instanceId) {
            error.instanceId = this.instanceId;
        }
        if (this.url) {
            error.url = this.url;
        }
        if (this.details) {
            error.details = this.details;
        }

        if (this.stack) {

            const frames: string[] = [];
            const items = this.stack.split('\n').map((x: string) => x.trim());
            items.forEach((i) => {
                frames.push(i);
            });

            error.stack = frames;
        }

        if (pretty) {
            return JSON.stringify(error, null, 2);
        } else {
            return JSON.stringify(error);
        }
    }

    /*
     * Deserialize the error from JSON, when the renderer receives an error from the main side of the app
     */
    public static fromJson(json: string): UIError {

        const data = JSON.parse(json);
        const error = new UIError(
            data.area || '',
            data.code || '',
            data.message || '',
            data.userAction || '');

        error.utcTime = data.utcTime || '';
        error.statusCode = data.statusCode || 0;
        error.instanceId = data.instanceId || 0;
        error.details = data.details || '';
        error.url = data.url || '';
        error.stack = (data.stack || []).join('\n');
        return error;
    }
}
