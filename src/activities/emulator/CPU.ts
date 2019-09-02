import {bit, byte, word, toWord, IInstruction, ADDRESSING_MODE} from "../../types";
import { IBus } from "./Bus";

export interface ICPU {
    a: byte;
    x: byte;
    y: byte;
    pc: word;
    sp: byte;
    status: byte;

    reset(): void;
    irq(): void;
    nmi(): void;
    clock(): void;

    completeInstruction(): void;
}

export enum STATUS_FLAGS {
    CARRY = (1 << 0),
    ZERO = (1 << 1),
    INTERRUPT = (1 << 2),
    DECIMAL = (1 << 3),
    BREAK = (1 << 4),
    UNUSED = (1 << 5),
    OVERFLOW = (1 << 6),
    NEGATIVE = (1 << 7)
}

export default class CPU {
    public a: byte = 0x00;
    public x: byte = 0x00;
    public y: byte = 0x00;
    public sp: byte = 0x00;
    public pc: word = 0x0000;
    public status: byte = 0x00;

    private remainingCycles: number;

    private bus: IBus;
    private instructionSet:Map<byte, IInstruction>;
    private op: IInstruction;

    private fetched: byte;
    private absoluteAddress: word;
    private relativeAddress: word;

    constructor(bus:IBus) {
        this.bus = bus;
        this.instructionSet = new Map<byte, IInstruction>([
            [0x00, {name: "BRK", operate: this.BRK.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 7}],	[0x01, {name: "ORA", operate: this.ORA.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 6}],	[0x02, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0x03, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 8}],	[0x04, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x05, {name: "ORA", operate: this.ORA.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x06, {name: "ASL", operate: this.ASL.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0x07, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0x08, {name: "PHP", operate: this.PHP.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 3}],	[0x09, {name: "ORA", operate: this.ORA.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x0A, {name: "ASL", operate: this.ASL.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x0B, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x0C, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0x0D, {name: "ORA", operate: this.ORA.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0x0E, {name: "ASL", operate: this.ASL.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],	[0x0F, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],
            [0x10, {name: "BPL", operate: this.BPL.bind(this), addressing: ADDRESSING_MODE.RELATIVE, cycles: 2}],	[0x11, {name: "ORA", operate: this.ORA.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 5}],	[0x12, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0x13, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 8}],	[0x14, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0x15, {name: "ORA", operate: this.ORA.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0x16, {name: "ASL", operate: this.ASL.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0x17, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0x18, {name: "CLC", operate: this.CLC.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x19, {name: "ORA", operate: this.ORA.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 4}],	[0x1A, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x1B, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 7}],	[0x1C, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0x1D, {name: "ORA", operate: this.ORA.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0x1E, {name: "ASL", operate: this.ASL.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],	[0x1F, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],
            [0x20, {name: "JSR", operate: this.JSR.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],	[0x21, {name: "AND", operate: this.AND.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 6}],	[0x22, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0x23, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 8}],	[0x24, {name: "BIT", operate: this.BIT.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x25, {name: "AND", operate: this.AND.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x26, {name: "ROL", operate: this.ROL.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0x27, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0x28, {name: "PLP", operate: this.PLP.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 4}],	[0x29, {name: "AND", operate: this.AND.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x2A, {name: "ROL", operate: this.ROL.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x2B, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x2C, {name: "BIT", operate: this.BIT.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0x2D, {name: "AND", operate: this.AND.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0x2E, {name: "ROL", operate: this.ROL.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],	[0x2F, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],
            [0x30, {name: "BMI", operate: this.BMI.bind(this), addressing: ADDRESSING_MODE.RELATIVE, cycles: 2}],	[0x31, {name: "AND", operate: this.AND.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 5}],	[0x32, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0x33, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 8}],	[0x34, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0x35, {name: "AND", operate: this.AND.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0x36, {name: "ROL", operate: this.ROL.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0x37, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0x38, {name: "SEC", operate: this.SEC.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x39, {name: "AND", operate: this.AND.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 4}],	[0x3A, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x3B, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 7}],	[0x3C, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0x3D, {name: "AND", operate: this.AND.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0x3E, {name: "ROL", operate: this.ROL.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],	[0x3F, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],
            [0x40, {name: "RTI", operate: this.RTI.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 6}],	[0x41, {name: "EOR", operate: this.EOR.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 6}],	[0x42, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0x43, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 8}],	[0x44, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x45, {name: "EOR", operate: this.EOR.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x46, {name: "LSR", operate: this.LSR.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0x47, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0x48, {name: "PHA", operate: this.PHA.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 3}],	[0x49, {name: "EOR", operate: this.EOR.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x4A, {name: "LSR", operate: this.LSR.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x4B, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x4C, {name: "JMP", operate: this.JMP.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 3}],	[0x4D, {name: "EOR", operate: this.EOR.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0x4E, {name: "LSR", operate: this.LSR.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],	[0x4F, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],
            [0x50, {name: "BVC", operate: this.BVC.bind(this), addressing: ADDRESSING_MODE.RELATIVE, cycles: 2}],	[0x51, {name: "EOR", operate: this.EOR.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 5}],	[0x52, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0x53, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 8}],	[0x54, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0x55, {name: "EOR", operate: this.EOR.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0x56, {name: "LSR", operate: this.LSR.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0x57, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0x58, {name: "CLI", operate: this.CLI.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x59, {name: "EOR", operate: this.EOR.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 4}],	[0x5A, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x5B, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 7}],	[0x5C, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0x5D, {name: "EOR", operate: this.EOR.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0x5E, {name: "LSR", operate: this.LSR.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],	[0x5F, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],
            [0x60, {name: "RTS", operate: this.RTS.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 6}],	[0x61, {name: "ADC", operate: this.ADC.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 6}],	[0x62, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0x63, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 8}],	[0x64, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x65, {name: "ADC", operate: this.ADC.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x66, {name: "ROR", operate: this.ROR.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0x67, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0x68, {name: "PLA", operate: this.PLA.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 4}],	[0x69, {name: "ADC", operate: this.ADC.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x6A, {name: "ROR", operate: this.ROR.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x6B, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x6C, {name: "JMP", operate: this.JMP.bind(this), addressing: ADDRESSING_MODE.INDIRECT, cycles: 5}],	[0x6D, {name: "ADC", operate: this.ADC.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0x6E, {name: "ROR", operate: this.ROR.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],	[0x6F, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],
            [0x70, {name: "BVS", operate: this.BVS.bind(this), addressing: ADDRESSING_MODE.RELATIVE, cycles: 2}],	[0x71, {name: "ADC", operate: this.ADC.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 5}],	[0x72, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0x73, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 8}],	[0x74, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0x75, {name: "ADC", operate: this.ADC.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0x76, {name: "ROR", operate: this.ROR.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0x77, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0x78, {name: "SEI", operate: this.SEI.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x79, {name: "ADC", operate: this.ADC.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 4}],	[0x7A, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x7B, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 7}],	[0x7C, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0x7D, {name: "ADC", operate: this.ADC.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0x7E, {name: "ROR", operate: this.ROR.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],	[0x7F, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],
            [0x80, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x81, {name: "STA", operate: this.STA.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 6}],	[0x82, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x83, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 6}],	[0x84, {name: "STY", operate: this.STY.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x85, {name: "STA", operate: this.STA.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x86, {name: "STX", operate: this.STX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x87, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0x88, {name: "DEY", operate: this.DEY.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x89, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x8A, {name: "TXA", operate: this.TXA.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x8B, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0x8C, {name: "STY", operate: this.STY.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0x8D, {name: "STA", operate: this.STA.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0x8E, {name: "STX", operate: this.STX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0x8F, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],
            [0x90, {name: "BCC", operate: this.BCC.bind(this), addressing: ADDRESSING_MODE.RELATIVE, cycles: 2}],	[0x91, {name: "STA", operate: this.STA.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 6}],	[0x92, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0x93, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 6}],	[0x94, {name: "STY", operate: this.STY.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0x95, {name: "STA", operate: this.STA.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0x96, {name: "STX", operate: this.STX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_Y, cycles: 4}],	[0x97, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_Y, cycles: 4}],	[0x98, {name: "TYA", operate: this.TYA.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x99, {name: "STA", operate: this.STA.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 5}],	[0x9A, {name: "TXS", operate: this.TXS.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0x9B, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 5}],	[0x9C, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 5}],	[0x9D, {name: "STA", operate: this.STA.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 5}],	[0x9E, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 5}],	[0x9F, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 5}],
            [0xA0, {name: "LDY", operate: this.LDY.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xA1, {name: "LDA", operate: this.LDA.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 6}],	[0xA2, {name: "LDX", operate: this.LDX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xA3, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 6}],	[0xA4, {name: "LDY", operate: this.LDY.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0xA5, {name: "LDA", operate: this.LDA.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0xA6, {name: "LDX", operate: this.LDX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0xA7, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0xA8, {name: "TAY", operate: this.TAY.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xA9, {name: "LDA", operate: this.LDA.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xAA, {name: "TAX", operate: this.TAX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xAB, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xAC, {name: "LDY", operate: this.LDY.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0xAD, {name: "LDA", operate: this.LDA.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0xAE, {name: "LDX", operate: this.LDX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0xAF, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],
            [0xB0, {name: "BCS", operate: this.BCS.bind(this), addressing: ADDRESSING_MODE.RELATIVE, cycles: 2}],	[0xB1, {name: "LDA", operate: this.LDA.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 5}],	[0xB2, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0xB3, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 5}],	[0xB4, {name: "LDY", operate: this.LDY.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0xB5, {name: "LDA", operate: this.LDA.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0xB6, {name: "LDX", operate: this.LDX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_Y, cycles: 4}],	[0xB7, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_Y, cycles: 4}],	[0xB8, {name: "CLV", operate: this.CLV.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xB9, {name: "LDA", operate: this.LDA.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 4}],	[0xBA, {name: "TSX", operate: this.TSX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xBB, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 4}],	[0xBC, {name: "LDY", operate: this.LDY.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0xBD, {name: "LDA", operate: this.LDA.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0xBE, {name: "LDX", operate: this.LDX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 4}],	[0xBF, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 4}],
            [0xC0, {name: "CPY", operate: this.CPY.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xC1, {name: "CMP", operate: this.CMP.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 6}],	[0xC2, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xC3, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 8}],	[0xC4, {name: "CPY", operate: this.CPY.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0xC5, {name: "CMP", operate: this.CMP.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0xC6, {name: "DEC", operate: this.DEC.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0xC7, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0xC8, {name: "INY", operate: this.INY.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xC9, {name: "CMP", operate: this.CMP.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xCA, {name: "DEX", operate: this.DEX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xCB, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xCC, {name: "CPY", operate: this.CPY.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0xCD, {name: "CMP", operate: this.CMP.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0xCE, {name: "DEC", operate: this.DEC.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],	[0xCF, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],
            [0xD0, {name: "BNE", operate: this.BNE.bind(this), addressing: ADDRESSING_MODE.RELATIVE, cycles: 2}],	[0xD1, {name: "CMP", operate: this.CMP.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 5}],	[0xD2, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0xD3, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 8}],	[0xD4, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0xD5, {name: "CMP", operate: this.CMP.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0xD6, {name: "DEC", operate: this.DEC.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0xD7, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0xD8, {name: "CLD", operate: this.CLD.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xD9, {name: "CMP", operate: this.CMP.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 4}],	[0xDA, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xDB, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 7}],	[0xDC, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0xDD, {name: "CMP", operate: this.CMP.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0xDE, {name: "DEC", operate: this.DEC.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],	[0xDF, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],
            [0xE0, {name: "CPX", operate: this.CPX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xE1, {name: "SBC", operate: this.SBC.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 6}],	[0xE2, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xE3, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_X, cycles: 8}],	[0xE4, {name: "CPX", operate: this.CPX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0xE5, {name: "SBC", operate: this.SBC.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 3}],	[0xE6, {name: "INC", operate: this.INC.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0xE7, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE, cycles: 5}],	[0xE8, {name: "INX", operate: this.INX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xE9, {name: "SBC", operate: this.SBC.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xEA, {name: "NOP", operate: this.NOP.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xEB, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMMEDIATE, cycles: 2}],	[0xEC, {name: "CPX", operate: this.CPX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0xED, {name: "SBC", operate: this.SBC.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 4}],	[0xEE, {name: "INC", operate: this.INC.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],	[0xEF, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE, cycles: 6}],
            [0xF0, {name: "BEQ", operate: this.BEQ.bind(this), addressing: ADDRESSING_MODE.RELATIVE, cycles: 2}],	[0xF1, {name: "SBC", operate: this.SBC.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 5}],	[0xF2, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 0}],	[0xF3, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.INDIRECT_Y, cycles: 8}],	[0xF4, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0xF5, {name: "SBC", operate: this.SBC.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 4}],	[0xF6, {name: "INC", operate: this.INC.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0xF7, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ZERO_PAGE_X, cycles: 6}],	[0xF8, {name: "SED", operate: this.SED.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xF9, {name: "SBC", operate: this.SBC.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 4}],	[0xFA, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.IMPLIED, cycles: 2}],	[0xFB, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_Y, cycles: 7}],	[0xFC, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0xFD, {name: "SBC", operate: this.SBC.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 4}],	[0xFE, {name: "INC", operate: this.INC.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],	[0xFF, {name: "???", operate: this.XXX.bind(this), addressing: ADDRESSING_MODE.ABSOLUTE_X, cycles: 7}],
        ]);
        this.reset();
        this.remainingCycles = 0;
    }

    reset(): void {
        this.pc = this.readWord(0xFFFC)[0];

        this.a = 0x00;
        this.x = 0x00;
        this.y = 0x00;
        this.sp = 0xFD;
        this.status = 0x20;

        this.remainingCycles = 8;
    }

    irq(): void {
        if(this.getFlag(STATUS_FLAGS.INTERRUPT) === 1) {
            this.saveStateToStack();

            this.pc = this.readWord(0xFFFE)[0];
            
            this.remainingCycles = 7;
        }
    }

    nmi(): void {
        this.saveStateToStack();
        this.pc = this.readWord(0xFFFA)[0];
        this.remainingCycles = 8;
    }

    clock(): void {
        if(this.remainingCycles <= 0) {
            let opcode: byte = this.read(this.pc);
            this.setFlag(STATUS_FLAGS.UNUSED, 1);
            ++this.pc;

            this.op = this.instructionSet.get(opcode);
            this.remainingCycles = this.op.cycles;

            const addressingCycles = this.addressing(this.op.addressing);
            const operatingCycles = this.op.operate();
            this.remainingCycles += (addressingCycles & operatingCycles);

            this.setFlag(STATUS_FLAGS.UNUSED, 1);
        }
        --this.remainingCycles;
    }

    completeInstruction(): void {
        this.remainingCycles = 0;
    }

    private read(addr: word): byte {
        return this.bus.read(addr);
    }

    private readWord(addr: word): [word, byte, byte] {
        let lo = this.read((addr + 0) as word);
        let hi = this.read((addr + 1) as word);
        return [toWord(lo, hi), lo, hi];
    }

    private write(addr: word, val: byte): void {
        this.bus.write(addr, val);
    }

    private setFlag(flag:STATUS_FLAGS, val:bit): void {
        if(val == 1) {
            this.status |= flag;
        } else {
            this.status &= ~flag;
        }
    }

    private getFlag(flag:STATUS_FLAGS): bit {
        return (this.status & flag) > 0 ? 1 : 0;
    }

    private saveStateToStack(): void {
        this.write((0x0100 + this.sp) as word, ((this.pc >> 8) & 0xFF) as byte);
        --this.sp;
        this.write((0x0100 + this.sp) as word, ((this.pc) & 0xFF) as byte);
        --this.sp;
        this.setFlag(STATUS_FLAGS.BREAK, 0);
        this.setFlag(STATUS_FLAGS.UNUSED, 1);
        this.setFlag(STATUS_FLAGS.INTERRUPT, 1);

        this.write((0x011 + this.sp) as word, this.status);
        --this.sp;
    }

    private addressing(mode: ADDRESSING_MODE): number {
        let additionalCycles: number = 0;
        switch(mode) {
            case ADDRESSING_MODE.ABSOLUTE:
                additionalCycles = this.addressingAbsolute();
                break;
            case ADDRESSING_MODE.ABSOLUTE_X:
                additionalCycles = this.addressingAbsoluteXOffset();
                break;
            case ADDRESSING_MODE.ABSOLUTE_Y:
                additionalCycles = this.addressingAbsoluteYOffset();
                break;
            case ADDRESSING_MODE.IMMEDIATE:
                additionalCycles = this.addressingImmediate();
                break;
            case ADDRESSING_MODE.IMPLIED:
                additionalCycles = this.addressingImplied();
                break;
            case ADDRESSING_MODE.INDIRECT:
                additionalCycles = this.addressingIndirect();
                break;
            case ADDRESSING_MODE.INDIRECT_X:
                additionalCycles = this.addressingIndirectX();
                break;
            case ADDRESSING_MODE.INDIRECT_Y:
                additionalCycles = this.addressingIndirectY();
                break;
            case ADDRESSING_MODE.RELATIVE:
                additionalCycles = this.addressingRelative();
                break;
            case ADDRESSING_MODE.ZERO_PAGE:
                additionalCycles = this.addressingZeroPage();
                break;
            case ADDRESSING_MODE.ZERO_PAGE_X:
                additionalCycles = this.addressingZeroPageX();
                break;
            case ADDRESSING_MODE.ZERO_PAGE_Y:
                additionalCycles = this.addressingZeroPageY();
            break;
        }

        return additionalCycles;
    }

    private addressingImplied(): number {
        this.fetched = this.a;
        return 0;
    }

    private addressingImmediate(): number {
        this.absoluteAddress = (this.pc++ as word);
        return 0;
    }

    private addressingZeroPage(): number {
        this.absoluteAddress = this.read(this.pc);
        ++this.pc;
        this.absoluteAddress &= 0x00FF;
        return 0;
    }

    private addressingZeroPageX(): number {
        this.absoluteAddress = (this.read(this.pc) + this.x) as word;
        ++this.pc;
        this.absoluteAddress &= 0x00FF;
        return 0;
    }

    private addressingZeroPageY(): number {
        this.absoluteAddress = (this.read(this.pc) + this.y) as word;
        ++this.pc;
        this.absoluteAddress &= 0x00FF;
        return 0;
    }

    private addressingRelative(): number {
        this.relativeAddress = this.read(this.pc);
        ++this.pc;
        return 0;
    }

    private addressingAbsolute(): number {
        this.absoluteAddress = this.readWord(this.pc)[0];
        this.pc += 2;
        return 0;
    }

    private addressingAbsoluteXOffset(): number {
        const addr:[word,byte,byte] = this.readWord(this.pc);
        this.absoluteAddress = addr[0];
        this.pc += 2;
        this.absoluteAddress += this.x;

        return ((this.absoluteAddress & 0xFF00) !== (addr[2] << 8)) ? 1 : 0;
    }
    
    private addressingAbsoluteYOffset(): number {
        const addr: [word,byte,byte] = this.readWord(this.pc);
        this.absoluteAddress = addr[0];
        this.pc += 2;
        this.absoluteAddress += this.y;

        return ((this.absoluteAddress & 0xFF00) !== (addr[2] << 8)) ? 1 : 0;
    }

    private addressingIndirect(): number {
        const ptr: [word,byte,byte] = this.readWord(this.pc);
        this.pc += 2;
        if(ptr[1] === 0xFF) {
            let hi: byte = this.read((ptr[0] & 0xFF00) as word);
            let lo: byte = this.read(ptr[0]);
            this.absoluteAddress = toWord(lo, hi);
        } else {
            this.absoluteAddress = this.readWord(ptr[0])[0];
        }
        return 0;
    }

    private addressingIndirectX(): number {
        const baseAddress: byte = this.read(this.pc);
        ++this.pc;
        this.absoluteAddress = this.readWord((baseAddress + this.x) as word)[0];
        return 0;
    }

    private addressingIndirectY(): number {
        const baseAddress: byte = this.read(this.pc);
        ++this.pc;

        const addr = this.readWord(baseAddress as word);
        this.absoluteAddress = (addr[0] + this.y) as word;

        return (this.absoluteAddress&0xFF00) != (addr[2]<<8) ? 1 : 0;
    }

    private fetch(): byte {
        if(this.op.addressing != ADDRESSING_MODE.IMPLIED)
            this.fetched = this.read(this.absoluteAddress);
        return this.fetched;
    }

    private ADC(): number {
        this.fetch();
        let t: word = (this.a + this.fetched + this.getFlag(STATUS_FLAGS.CARRY)) as word;
        this.setFlag(STATUS_FLAGS.CARRY, t > 255 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.ZERO, (t & 0xFF) == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.OVERFLOW, (~(this.a ^ this.fetched) & (this.a ^ t) & 0x0080) > 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, (t & 0x80) > 0 ? 1 : 0);
        this.a = (t & 0xFF) as byte;
        return 1;
    }

    private SBC(): number {
        this.fetch();
        let value: word = (this.fetched ^ 0x00FF) as word;
        let t: word = (this.a + value + this.getFlag(STATUS_FLAGS.CARRY)) as word;
        this.setFlag(STATUS_FLAGS.CARRY, (t & 0xFF00) > 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.ZERO, ((t & 0xFF) == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.OVERFLOW, ((t ^ this.a) & (t ^ value) & 0x0080) > 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, (t & 0x0080) > 0 ? 1 : 0);
        this.a = (t & 0xFF) as byte;
        return 1;
    }

    private AND(): number {
        this.fetch();
        this.a = ((this.a & this.fetched) & 0xFF) as byte;
        this.setFlag(STATUS_FLAGS.ZERO, this.a == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.a & 0x80) > 0) ? 1 : 0);
        return 1;
    }

    private ASL(): number {
        this.fetch();
        let t: word = (this.fetched << 1) as word;
        this.setFlag(STATUS_FLAGS.CARRY, ((t & 0xFF00) > 0) ? 1 : 0)
        this.setFlag(STATUS_FLAGS.ZERO, (t & 0x00FF) == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, (t & 0x80) > 0 ? 1 : 0);
        if(this.op.addressing == ADDRESSING_MODE.IMPLIED) {
            this.a = (t & 0xFF) as byte;
        } else {
            this.write(this.absoluteAddress, (t & 0xFF) as byte);
        }
        return 0;
    }

    private BCC(): number {
        if(this.getFlag(STATUS_FLAGS.CARRY) == 0) {
            this.remainingCycles++;
            this.absoluteAddress = this.moveRelative() as word;
            if((this.absoluteAddress & 0xFF00) != (this.pc && 0xFF00)) {
                ++this.remainingCycles;
            }
            this.pc = this.absoluteAddress;
        }
        return 0;
    }

    private BCS(): number {
        if(this.getFlag(STATUS_FLAGS.CARRY) == 1) {
            ++this.remainingCycles;
            this.absoluteAddress = this.moveRelative() as word;
            if((this.absoluteAddress & 0xFF00) != (this.pc && 0xFF00)) {
                ++this.remainingCycles;
            }
            this.pc = this.absoluteAddress;
        }
        return 0;
    }

    private BEQ(): number {
        if(this.getFlag(STATUS_FLAGS.ZERO) == 1) {
            ++this.remainingCycles;
            this.absoluteAddress = this.moveRelative() as word;
            if((this.absoluteAddress & 0xFF00) != (this.pc && 0xFF00)) {
                ++this.remainingCycles;
            }
            this.pc = this.absoluteAddress;
        }
        return 0;
    }

    private BIT(): number {
        this.fetch();
        let t: byte = (this.a & this.fetched) as byte;
        this.setFlag(STATUS_FLAGS.ZERO, (t & 0xFF) == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.fetched & (1<<7)) > 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.OVERFLOW, ((this.fetched & (1 << 6)) > 0) ? 1 : 0);
        return 0;
    }

    private BMI(): number {
        if(this.getFlag(STATUS_FLAGS.NEGATIVE) == 1) {
            this.remainingCycles++;
            this.absoluteAddress = this.moveRelative() as word;
            if((this.absoluteAddress & 0xFF00) != (this.pc & 0xFF00)) {
                this.remainingCycles++;
            }
            this.pc = this.absoluteAddress;
        }
        return 0;
    }

    private BNE(): number {
        if(this.getFlag(STATUS_FLAGS.ZERO) == 0) {
            this.remainingCycles++;
            this.absoluteAddress = this.moveRelative() as word;
            if((this.absoluteAddress & 0xFF00) != (this.pc & 0xFF00)) {
                this.remainingCycles++;
            }
            this.pc = this.absoluteAddress;
        }
        return 0;
    }

    private BPL(): number {
        if(this.getFlag(STATUS_FLAGS.NEGATIVE) == 0) {
            ++this.remainingCycles;
            this.absoluteAddress = this.moveRelative() as word;
            if((this.absoluteAddress & 0xFF00) != (this.pc & 0xFF00)) {
                ++this.remainingCycles;
            }
            this.pc = this.absoluteAddress;
        }
        return 0;
    }

    private BRK(): number {
        this.pc++;
        this.setFlag(STATUS_FLAGS.INTERRUPT, 1);
        this.write((0x100 + this.sp) as word, ((this.pc >> 8) & 0xFF) as byte);
        --this.sp;
        this.write((0x100 + this.sp) as word, (this.pc & 0xFF) as byte);
        --this.sp;

        this.setFlag(STATUS_FLAGS.BREAK, 1);
        this.write((0x100 + this.sp) as word, this.status);
        --this.sp;
        this.setFlag(STATUS_FLAGS.BREAK, 0);
        this.pc = this.readWord(0xFFFE)[0];
        return 0;
    }

    private BVC(): number {
        if(this.getFlag(STATUS_FLAGS.OVERFLOW) == 0) {
            ++this.remainingCycles;
            this.absoluteAddress = this.moveRelative() as word;
            if((this.absoluteAddress & 0xFF00) != (this.pc & 0xFF00)) {
                ++this.remainingCycles;
            }
            this.pc = this.absoluteAddress;
        }
        return 0;
    }

    private BVS(): number {
        if(this.getFlag(STATUS_FLAGS.OVERFLOW) == 1) {
            ++this.remainingCycles;
            this.absoluteAddress = this.moveRelative() as word;
            if((this.absoluteAddress & 0xFF00) != (this.pc & 0xFF00)) {
                ++this.remainingCycles;
            }
            this.pc = this.absoluteAddress;
        }
        return 0;
    }

    private CLC(): number {
        this.setFlag(STATUS_FLAGS.CARRY, 0);
        return 0;
    }

    private CLD(): number {
        this.setFlag(STATUS_FLAGS.DECIMAL, 0);
        return 0;
    }

    private CLI(): number {
        this.setFlag(STATUS_FLAGS.INTERRUPT, 0);
        return 0;
    }

    private CLV(): number {
        this.setFlag(STATUS_FLAGS.OVERFLOW, 0);
        return 0;
    }

    private CMP(): number {
        this.fetch();
        let t: word = (this.a - this.fetched) as word;
        this.setFlag(STATUS_FLAGS.CARRY, (this.a > this.fetched) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.ZERO, ((t & 0xFF) == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((t & 0x80) > 0)? 1 : 0);
        return 1;
    }

    private CPX(): number {
        this.fetch();
        let t: word = (this.x - this.fetched) as word;
        this.setFlag(STATUS_FLAGS.CARRY, (this.x > this.fetched)? 1 : 0);
        this.setFlag(STATUS_FLAGS.ZERO, ((t & 0xFF) == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((t & 0x80) > 0) ? 1 : 0);
        return 1;
    }

    private CPY(): number {
        this.fetch();
        let t: word = (this.y - this.fetched) as word;
        this.setFlag(STATUS_FLAGS.CARRY, (this.y > this.fetched)? 1 : 0);
        this.setFlag(STATUS_FLAGS.ZERO, ((t & 0xFF) == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((t & 0x80) > 0) ? 1 : 0);
        return 1;
    }

    private DEC(): number {
        this.fetch();
        let t: word = (this.fetched - 1) as word;
        this.write(this.absoluteAddress, (t & 0xFF) as byte);
        this.setFlag(STATUS_FLAGS.ZERO, (t & 0xFF) == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, (t & 0x80) > 0 ? 1 : 0);
        return 0;
    }

    private DEX(): number {
        --this.x;
        this.setFlag(STATUS_FLAGS.ZERO, this.x == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.x & 0x80) > 0) ? 1 : 0);
        return 0;
    }

    private DEY(): number {
        --this.y;
        this.setFlag(STATUS_FLAGS.ZERO, this.y == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.y & 0x80) > 0) ? 1 : 0);
        return 0;
    }

    private EOR(): number {
        this.fetch();
        this.a = (this.a ^ this.fetched) as byte;
        this.setFlag(STATUS_FLAGS.ZERO, this.a == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.a & 0x80) > 0) ? 1 : 0);
        return 0;
    }

    private INC(): number {
        this.fetch();
        let t: word = (this.fetched + 1) as word;
        this.write(this.absoluteAddress, (t & 0xFF) as byte);
        this.setFlag(STATUS_FLAGS.ZERO, (t & 0xFF) == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, (t & 0x80) > 0 ? 1 : 0);
        return 0;
    }

    private INX(): number {
        ++this.x;
        this.setFlag(STATUS_FLAGS.ZERO, this.x == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.x & 0x80) > 0) ? 1 : 0);
        return 0;
    }

    private INY(): number {
        ++this.y;
        this.setFlag(STATUS_FLAGS.ZERO, this.y == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.y & 0x80) > 0) ? 1 : 0);
        return 0;
    }

    private JMP(): number {
        this.pc = this.absoluteAddress;
        return 0;
    }

    private JSR(): number {
        --this.pc;
        this.write((0x100 + this.sp) as word, ((this.pc>>8) & 0xFF) as byte);
        --this.sp;
        this.write((0x100 + this.sp) as word, ((this.pc) & 0xFF) as byte);
        --this.sp;

        this.pc = this.absoluteAddress;
        return 0;
    }

    private LDA(): number {
        this.fetch();
        this.a = this.fetched;
        this.setFlag(STATUS_FLAGS.ZERO, this.a == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.a & 0x80) > 0) ? 1 : 0);
        return 1;
    }

    private LDX(): number {
        this.fetch();
        this.x = this.fetched;
        this.setFlag(STATUS_FLAGS.ZERO, this.x == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.x & 0x80) > 0) ? 1 : 0);
        return 1;
    }

    private LDY(): number {
        this.fetch();
        this.y = this.fetched;
        this.setFlag(STATUS_FLAGS.ZERO, this.y == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.y & 0x80) > 0) ? 1 : 0);
        return 1;
    }

    private LSR(): number {
        this.fetch();
        this.setFlag(STATUS_FLAGS.CARRY, (this.fetched & 0x0001)? 1 : 0);
        let t: word = (this.fetched >> 1) as word;
        this.setFlag(STATUS_FLAGS.ZERO, ((t & 0xFF) == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, (t & 0x80) > 0 ? 1 : 0);
        if(this.op.addressing == ADDRESSING_MODE.IMPLIED) {
            this.a = (t & 0xFF) as byte;
        } else {
            this.write(this.absoluteAddress, (t & 0xFF) as byte);
        }
        return 0;
    }

    private NOP(): number {
        return 0;// technically, NOPs are different cycle counts.
    }

    private ORA(): number {
        this.fetch();
        this.a = ((this.a | this.fetched) & 0xFF) as byte;
        this.setFlag(STATUS_FLAGS.ZERO, this.a == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.a & 0x80) > 0) ? 1 : 0);
        return 0;
    }

    private PHA(): number {
        this.write((0x100 + this.sp) as word, this.a);
        --this.sp;
        return 0;
    }

    private PHP(): number {
        this.write((0x100 + this.sp) as word, (this.status | STATUS_FLAGS.UNUSED | STATUS_FLAGS.BREAK) as byte);
        this.setFlag(STATUS_FLAGS.BREAK, 0);
        this.setFlag(STATUS_FLAGS.UNUSED, 0);
        --this.sp;
        return 0;
    }

    private PLA(): number {
        ++this.sp;
        this.a = this.read((0x100 + this.sp) as byte);
        this.setFlag(STATUS_FLAGS.ZERO, this.a == 0 ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.a & 0x80) > 0) ? 1 : 0);
        return 0;
    }

    private PLP(): number {
        ++this.sp;
        this.status = this.read((0x100 + this.sp) as byte);
        this.setFlag(STATUS_FLAGS.UNUSED, 1);
        return 0;
    }

    private ROL(): number {
        this.fetch();
        let t: word = ((this.fetched << 1) | this.getFlag(STATUS_FLAGS.CARRY) & 0xFFFF) as word;
        this.setFlag(STATUS_FLAGS.CARRY, ((t & 0xFF00) > 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.ZERO, ((t & 0x00FF) == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((t & 0x80) > 0)? 1 : 0);
        if(this.op.addressing == ADDRESSING_MODE.IMPLIED) {
            this.a = (t & 0xFF) as byte;
        } else {
            this.write(this.absoluteAddress, (t & 0xFF) as byte);
        }
        return 0;
    }

    private ROR(): number {
        this.fetch();
        let t: word = ((this.getFlag(STATUS_FLAGS.CARRY) << 7) | (this.fetched >> 1)) as word;
        this.setFlag(STATUS_FLAGS.CARRY, ((this.fetched & 0x01) > 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.ZERO, ((t & 0xFF) == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((t & 0x80) > 0) ? 1 : 0);
        if(this.op.addressing == ADDRESSING_MODE.IMPLIED) {
            this.a = ( t & 0xFF) as byte;
        } else {
            this.write(this.absoluteAddress, (t & 0xFF) as byte);
        }
        return 0;
    }

    private RTI(): number {
        ++this.sp;
        this.status = this.read((0x100 + this.sp) as word);
        this.setFlag(STATUS_FLAGS.BREAK, 0);
        this.setFlag(STATUS_FLAGS.UNUSED, 0);

        ++this.sp;
        this.pc = this.readWord((0x100 + this.sp) as word)[0];
        ++this.sp;
        ++this.pc;
        return 0;
    }

    private RTS(): number {
        ++this.sp;
        this.pc = this.readWord((0x100 + this.sp) as word)[0];
        ++this.pc;
        return 0;
    }

    private SEC(): number {
        this.setFlag(STATUS_FLAGS.CARRY, 1);
        return 0;
    }

    private SED(): number {
        this.setFlag(STATUS_FLAGS.DECIMAL, 1);
        return 0;
    }

    private SEI(): number {
        this.setFlag(STATUS_FLAGS.INTERRUPT, 1);
        return 0;
    }

    private STA(): number {
        this.write(this.absoluteAddress, this.a);
        return 0;
    }

    private STX(): number {
        this.write(this.absoluteAddress, this.x);
        return 0;
    }

    private STY(): number {
        this.write(this.absoluteAddress, this.y);
        return 0;
    }

    private TAX(): number {
        this.x = this.a;
        this.setFlag(STATUS_FLAGS.ZERO, (this.x == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.x & 0x80) > 0) ? 1 : 0);
        return 0;
    }

    private TAY(): number {
        this.y = this.a;
        this.setFlag(STATUS_FLAGS.ZERO, (this.y == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.y & 0x80) > 0) ? 1 : 0);
        return 0;
    }

    private TSX(): number {
        this.x = this.sp;
        this.setFlag(STATUS_FLAGS.ZERO, (this.x == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.x & 0x80) > 0) ? 1 : 0);
        return 0;
    }

    private TXA(): number {
        this.a = this.x;
        this.setFlag(STATUS_FLAGS.ZERO, (this.a == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.a & 0x80) > 0) ? 1 : 0);
        return 0;
    }
    
    private TXS(): number {
        this.sp = this.a;
        return 0;
    }

    private TYA(): number {
        this.a = this.y;
        this.setFlag(STATUS_FLAGS.ZERO, (this.a == 0) ? 1 : 0);
        this.setFlag(STATUS_FLAGS.NEGATIVE, ((this.a & 0x80) > 0) ? 1 : 0);
        return 0;
    }
    // Illegal opcodes
    private XXX(): number {
        return 0;
    }

    private moveRelative(): word {
        let offset:number = this.relativeAddress;
        if((offset & 0x80) > 0) {
            offset = (offset - 1)-255;
        }
        return (this.pc + offset) as word;
    }
}