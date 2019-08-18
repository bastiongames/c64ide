import { IWindow, IWindowSettings, Window } from "./Window";
import * as path from "path";
import { string } from "prop-types";

export abstract class WindowManager {
    private static windows:Map<string, IWindow> = new Map<string, IWindow>();

    public static create(name: string, layout:string, settings?: IWindowSettings): IWindow {
        if(this.windows.has(name)) return this.windows.get(name);

        let window = new Window(
            path.join(__dirname, "layouts", layout),
            settings
        );
        
        this.windows.set(name, window);
        return window;
    }
}
