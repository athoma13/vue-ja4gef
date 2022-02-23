import { BehaviorSubject, Subject } from 'rxjs';
import { constrain } from '../utils';


const MIN_LENGTH = 1 // Max zoom = 1m (Cannot zoom beyond 1 meter)

export type DataPoint = [number, number];
export interface Plot {
    project: string;
    site: string;
    points: { [key: string]: DataPoint[] };
}

export interface Lithology {
    site: string;
    lithology: [number, number, string][];
}

export interface MinMax {
    min: number,
    max: number
}

function min<T>(items: T[], value: (arg: T) => number): T {
    return items.reduce((acc, i) => value(i) < value(acc) ? i : acc, items[0]);
}
function max<T>(items: T[], value: (arg: T) => number): T {
    return items.reduce((acc, i) => value(i) > value(acc) ? i : acc, items[0]);
}

function getMinMax<T>(items: T[], value: (arg: T) => number): MinMax {
    if (!items.length) {
        return { min: NaN, max: NaN }
    }
    const result = { min: value(items[0]), max: value(items[0]) };
    items.forEach(i => {
        result.min = Math.min(result.min, value(i))
        result.max = Math.max(result.max, value(i))
    })
    return result;
}

export interface Area {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

export class ZoomSync {
    private _zoom;
    readonly zoom;
    private _dataRange;
    private _lastKnownArea?: Area;

    readonly areaChanges = new Subject<Area & MinMax>();

    updateChartArea(area: Area) {
        this._lastKnownArea = area;
        this.areaChanges.next({ ...area, ...this._zoom.value });
    }

    doZoom(factor: number): void {

        if (factor === 0) { return; }
        const range = this._zoom.value;
        const length = range.max - range.min;
        // New length - constrained between Min Zoom possible and Max Zoom out (Max Length)
        const newLength = constrain(length * factor, MIN_LENGTH, this._dataRange.max - this._dataRange.min);
        // Zoom in the middle
        // TODO: Should zoom with respect to where the mouse is...
        const lengthDelta = length - newLength;
        const newRange = {
            min: range.min + (lengthDelta / 2),
            max: range.max - (lengthDelta / 2),
        }

        if (newRange.min !== range.min || newRange.max !== range.max) {
            this._zoom.next(newRange);
            if (this._lastKnownArea) {
                this.areaChanges.next({ ...this._lastKnownArea, ...newRange })
            }
        }
    }

    scroll(factor: number): void {
        if (factor === 0) { return; }
        const range = this._zoom.value;
        const length = range.max - range.min;
        const lengthDelta = length * factor;
        const newRange = {
            min: range.min + lengthDelta,
            max: range.max + lengthDelta,
        }
        this._zoom.next(newRange);
        if (this._lastKnownArea) {
            this.areaChanges.next({ ...this._lastKnownArea, ...newRange })
        }
}


    constructor(readonly data: Plot, readonly lithology: Lithology) {
        // Find the min and max depth
        this._dataRange = getMinMax(Object.values(data.points).flat(), x => x[0]);
        this._zoom = new BehaviorSubject(this._dataRange);
        this.zoom = this._zoom.asObservable();
    }
}
