import {IBus, RamBus} from "./Bus";
import CPU,{ICPU} from "./CPU";

interface IEmulator {
    cpu: ICPU;
    bus: IBus;
}

export {
    IBus, RamBus, ICPU, CPU,
    IEmulator
}