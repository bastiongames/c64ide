import {ICPU, CPU, IBus, RamBus, IEmulator} from "../activities/emulator";
import { byte, word } from "src/types";
import {IDEActionTypes, CLOCK_TICK_ACTION} from "../actions";

const bus: IBus = new RamBus();
const prog:Array<byte> = [
    0xA2, 0x0A, 0x8E, 0x00, 0x00, 0xA2, 0x03, 0x8E, 0x01, 0x00, 0xAC, 0x00, 0x00, 0xA9, 0x00, 0x18, 0x6D, 0x01,0x00, 0x88, 0xD0, 0xFA, 0x8D, 0x02, 0x00, 0xEA, 0xEA, 0xEA, 0x00
];
const offset: word = 0x8000;
for(var i: number = 0; i < prog.length; ++i) {
    bus.write((offset + i) as word, prog[i] as byte);
}
bus.write(0xFFFC, 0x00);
bus.write(0xFFFD, 0x80);

const cpu: ICPU = new CPU(bus);

const initialEmulatorState: IEmulator = {
    bus,
    cpu,
};

export function emulatorReducer(
    state = initialEmulatorState,
    action: IDEActionTypes
): IEmulator {
    switch(action.type) {
        case CLOCK_TICK_ACTION:
            return {
                ...state,
                cpu: action.payload.cpu//Object.assign( Object.create( Object.getPrototypeOf(action.payload.cpu)), action.payload.cpu)
            }
        default:
            return state;
    }
}