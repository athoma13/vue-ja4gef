import { Subject } from 'rxjs';

interface Point {
    x: number;
    y: number;
}
interface LineOptions {
    color: string;
    width: number;
    dashes: number[];
    lineDashOffset?: number;
    
}

export function drawLine(
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    options: LineOptions
) {
    ctx.beginPath();
    ctx.lineWidth = options.width;
    ctx.strokeStyle = options.color;
    ctx.lineDashOffset = options.lineDashOffset ?? 0;
    ctx.setLineDash(options.dashes);
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
}


export function constrain(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export class Unsubscriber {
    private _actions: (() => any)[] = [];
    private _unsubscribed = new Subject<void>();
    readonly unsubscribed = this._unsubscribed.asObservable();

    add(action: () => any) {
        if (this._unsubscribed.closed) { throw new Error('Unsubscribe has already been called.') }
        this._actions.push(action);
    }
    unsubscribe() {
        if (this._unsubscribed.closed) { throw new Error('Unsubscribe has already been called.') }
        this._actions.forEach(action => action());
        this._unsubscribed.next();
        this._unsubscribed.complete();
    }
}