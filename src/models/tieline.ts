import { Observable, Subject } from 'rxjs';

export interface TieLine {
    litDepth: number,
    geoDepth: number
}

export class TieLineModel {
    tieLines: TieLine[] = [];
    new?: Partial<TieLine>;
    active?: TieLine;

    addNew(depth: number, type: keyof TieLine) {
        this.new = { [type]: depth };
    }

    commitNew(depth: number, type: keyof TieLine) {
        const commit = { ...this.new, ...{ [type]: depth } } as TieLine;
        this.tieLines = [...this.tieLines, commit];
    }

}

