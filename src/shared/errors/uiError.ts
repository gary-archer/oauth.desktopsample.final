/*
 * An error class focused on UI scenarios
 */
export class UIError extends Error {

    // Technical fields to display
    private _area: string;
    private _errorCode: string;
    private _userAction: string;
    private _utcTime: string;
    private _statusCode: number;
    private _instanceId: number;
    private _details: string;

    // Additional details that can be shown during development
    private _url: string;

    /*
     * All types of error supply at least these fields
     */
    public constructor(area: string, errorCode: string, userMessage: string, stack?: string | undefined) {

        super(userMessage);

        this._area = area;
        this._errorCode = errorCode;
        this._userAction = 'Please retry the operation';
        this._utcTime = new Date().toISOString();
        this._statusCode = 0;
        this._instanceId = 0;
        this._details = '';
        this._url = '';

        // Ensure that instanceof works
        Object.setPrototypeOf(this, new.target.prototype);

        // Store the stack of the original exception if provided
        if (stack) {
            this.stack = stack;
        }
    }

    public get area(): string {
        return this._area;
    }

    public get errorCode(): string {
        return this._errorCode;
    }

    public set errorCode(value: string) {
        this._errorCode = value;
    }

    public get userAction(): string {
        return this._userAction;
    }

    public set userAction(value: string) {
        this._userAction = value;
    }

    public get utcTime(): string {
        return this._utcTime;
    }

    public get statusCode(): number {
        return this._statusCode;
    }

    public set statusCode(value: number) {
        this._statusCode = value;
    }

    public get instanceId(): number {
        return this._instanceId;
    }

    public get details(): string {
        return this._details;
    }

    public set details(value: string)  {
        this._details = value;
    }

    public get url(): string {
        return this._url;
    }

    public set url(value: string) {
        this._url = value;
    }

    /*
     * Override details when an API 500 error is handled
     */
    public setApiErrorDetails(area: string, id: number, utcTime: string): void {
        this._area = area;
        this._instanceId = id;
        this._utcTime = utcTime;
    }

    /*
     * Serialize the error to JSON when the main side of the app returns an error to the renderer
     */
    public toJson(pretty = false): string {

        const error: any = {
            area: this._area,
            code: this._errorCode,
            message: this.message,
            userAction: this._userAction,
            utcTime: this._utcTime,
        };

        if (this._statusCode) {
            error.statusCode = this._statusCode;
        }
        if (this._instanceId) {
            error.instanceId = this._instanceId;
        }
        if (this._url) {
            error.url = this._url;
        }
        if (this._details) {
            error.details = this._details;
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

        error._utcTime = data.utcTime || '';
        error._statusCode = data.statusCode || 0;
        error._instanceId = data.instanceId || 0;
        error._details = data.details || '';
        error._url = data.url || '';
        error.stack = (data.stack || []).join('\n');
        return error;
    }
}
