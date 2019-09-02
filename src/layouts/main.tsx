import * as React from "react";
import * as ReactDom from "react-dom";
import {Provider} from "react-redux";
import store from "../store";

import {CPU} from "../components"

window.onload = () => {
    ReactDom.render(
        <Provider store={store}>
            <CPU />
        </Provider>
    , document.getElementById("main"));
}