import {Dispatch, SetStateAction, useState} from 'react';

/*
 * The view model for the companies container view
 */
export class HeaderButtonsViewModel {

    private _hasData: boolean;
    private _setHasData: Dispatch<SetStateAction<boolean>> | null;

    public constructor() {
        this._hasData = false;
        this._setHasData = null;
    }

    /*
     * For the correct React behavior, the view initializes state every time it loads
     */
    public useState(): void {
        const [, setHasData] = useState(this._hasData);
        this._setHasData = setHasData;
    }

    /*
     * Property accessors
     */
    public get hasData(): boolean {
        return this._hasData;
    }

    /*
     * Update state and the binding system
     */
    public updateHasData(hasData: boolean): void {
        this._hasData = hasData;
        this._setHasData!(hasData);
    }
}
