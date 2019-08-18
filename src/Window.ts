import {BrowserWindow} from "electron";

export interface IWindowSettings {
    height?: number;
    show?: boolean;
    width?: number;
}

const defaultSettings: IWindowSettings = {
    height: 600,
    show: false,
    width: 800,
};

export interface IWindow {
    setVisibility( show: boolean ): void;
}

export class Window extends BrowserWindow implements IWindow {
    constructor(file: string, settings: IWindowSettings) {
        super({...defaultSettings, ...settings, webPreferences: {nodeIntegration: true}});
        console.log(`loading file ${file}`);
        this.loadFile(file);

        this.once("ready-to-show", () => {
            this.show();
        });
    }

    public setVisibility(show: boolean = true): void {
        if(show) {
            this.show();
        } else {
            this.hide();
        }
    }
}
