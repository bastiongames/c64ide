import {app} from "electron";
import { WindowManager } from "./WindowManager";
import * as path from "path";

app.on("ready", () => {
    WindowManager.create("main", "main.html");
});

app.on("window-all-closed", () => {
    if(process.platform !== "darwin") {
        app.quit();
    }
});
