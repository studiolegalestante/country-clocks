import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GnomeDesktop from 'gi://GnomeDesktop?version=4.0';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

export default class CountryClocks extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._iface = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._wallClock = new GnomeDesktop.WallClock();
        this._buttons = [];
        this._clocks = [];
        this._serial = 0;
        this._build();
        this._settingsId = this._settings.connect('changed', () => this._build());
        this._clockId = this._wallClock.connect('notify::clock', () => this._update());
    }

    // Blocco unico "SIGLA  orario": sigla e orario vicini come nell'orologio di sistema.
    _addClock(abbr, index) {
        const button = new PanelMenu.Button(0.0, 'country-clocks', true);
        const box = new St.BoxLayout();
        box.add_child(this._abbrLabel(abbr));
        const clock = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        box.add_child(clock);
        button.add_child(box);
        Main.panel.addToStatusArea(`${this.uuid}-${this._serial++}`, button, index, 'center');
        this._buttons.push(button);
        return clock;
    }

    _abbrLabel(text, style = 'margin-right: 0.5em; padding-right: 5px;') {
        return new St.Label({text, y_align: Clutter.ActorAlign.CENTER, style});
    }

    _clear() {
        this._buttons.forEach(b => b.destroy());
        this._buttons = [];
        this._clocks = [];
        if (this._localLabel) {
            Main.panel.statusArea.dateMenu._clockDisplay.set_style(this._clockStyle ?? null);
            this._localLabel.destroy();
            this._localLabel = null;
        }
    }

    _build() {
        this._clear();
        // Sigla dentro il pulsante dell'orologio di sistema, subito prima dell'ora.
        const local = this._settings.get_string('local-label').trim();
        if (local) {
            const clock = Main.panel.statusArea.dateMenu._clockDisplay;
            // L'orologio di sistema ha un margine interno a sinistra: lo si azzera
            // perché lo spazio dopo la sigla sia uguale a quello degli altri orologi.
            this._localLabel = this._abbrLabel(local, 'margin-right: 0.5em; font-weight: bold;');
            clock.get_parent().insert_child_below(this._localLabel, clock);
            this._clockStyle = clock.get_style();
            clock.set_style('padding-left: 0;');
        }
        let index = 1; // dopo l'orologio di sistema
        for (const entry of this._settings.get_strv('clocks')) {
            const [abbr, tzId] = entry.split('|');
            if (!tzId)
                continue;
            const tz = GLib.TimeZone.new_identifier(tzId);
            if (!tz)
                continue;
            this._clocks.push({tz, label: this._addClock(abbr, index++)});
        }
        this._update();
    }

    // Stesso formato dell'orologio di sistema, ricalcolato su ogni fuso.
    _update() {
        const wc = this._wallClock;
        const fmt = this._iface.get_enum('clock-format');
        const secs = this._iface.get_boolean('clock-show-seconds');
        const now = GLib.DateTime.new_now_local();
        let opts = [true, true];
        for (const wd of [true, false]) {
            for (const fd of [true, false]) {
                if (wc.string_for_datetime(now, fmt, wd, fd, secs) === wc.clock)
                    opts = [wd, fd];
            }
        }
        for (const c of this._clocks)
            c.label.set_text(wc.string_for_datetime(GLib.DateTime.new_now(c.tz), fmt, opts[0], opts[1], secs));
    }

    disable() {
        if (this._settingsId)
            this._settings.disconnect(this._settingsId);
        if (this._clockId)
            this._wallClock.disconnect(this._clockId);
        this._clear();
        this._settings = null;
        this._iface = null;
        this._wallClock = null;
    }
}
