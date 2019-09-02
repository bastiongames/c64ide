import {byte, word} from "../../types";

export interface IBus {
    read(addr: word): byte;
    write(addr: word, val: byte): void;
}

export class RamBus implements IBus {
    private ram:byte[];
    constructor() {
        this.ram = new Array<byte>(65536);
    }

    read(addr: word): byte {
        if(addr >= 0x0000 && addr <= 0xFFFF) {
            return this.ram[addr];
        }
        return 0x00;
    }

    write(addr: word, val: byte): void {
        if(addr >= 0x0000 && addr <= 0xFFFF) {
            this.ram[addr] = val;
        }
    }
}