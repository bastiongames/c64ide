import * as React from "react";
import * as ReactDom from "react-dom";

import Root from '../Root';

window.onload = () => {
    ReactDom.render(<Root />, document.getElementById("app"));
}