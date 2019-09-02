import {combineReducers} from "redux";
import {emulatorReducer} from "./emulator";


const rootReducer = combineReducers({
    emulator: emulatorReducer
});

export default rootReducer;