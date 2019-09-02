import {IEmulator} from "../activities/emulator";

export const CLOCK_TICK_ACTION = "CLOCK_TICK_ACTION";

interface IClockTickAction {
    type: typeof CLOCK_TICK_ACTION;
    payload: IEmulator
}

export function clockTick(emulator:IEmulator): IClockTickAction {
    return {
        type: CLOCK_TICK_ACTION,
        payload: emulator
    };
}

export type IDEActionTypes = IClockTickAction;