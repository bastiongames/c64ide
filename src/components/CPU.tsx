import * as React from "react";
import {connect} from "react-redux";
import { IDEState } from "src/types";
import { ICPU, IEmulator } from "src/activities/emulator";
import {clockTick} from "../actions";

class CPU extends React.Component {
    constructor(props:any) {
        super(props);
        this.clockTick = this.clockTick.bind(this);
    }
    render(): JSX.Element {
        const cpu: ICPU = ((this.props as any).emulator as IEmulator).cpu;
        return <React.Fragment>
            <ul>
                <li><label>a:</label><span>{cpu.a}</span></li>
                <li><label>x:</label><span>{cpu.x}</span></li>
                <li><label>y:</label><span>{cpu.y}</span></li>
                <li><label>stack pointer:</label><span>{cpu.sp}</span></li>
                <li><label>program counter:</label><span>{cpu.pc}</span></li>
                <li><label>status flags</label><span>{cpu.status}</span></li>
            </ul>
            <button onClick={this.clockTick}>Tick</button>
        </React.Fragment>
    }

    clockTick(): void {
        (this.props as any).clockTick((this.props as any).emulator);
    }
}

var mapStateToProps = (state:IDEState): any => ({
    emulator: state.emulator
});

var mapDispatchToProps = (dispatch:any) => {
    return {
        clockTick: (emulator: IEmulator) => {
            emulator.cpu.clock();
            emulator.cpu.completeInstruction();// this assumes debug steps;
            return dispatch(clockTick(emulator));
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(CPU)