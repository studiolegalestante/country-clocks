import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function readText(path) {
    try {
        const [, bytes] = GLib.file_get_contents(path);
        return new TextDecoder().decode(bytes);
    } catch (e) {
        return '';
    }
}

// Elenco fusi orari con Paese (nome italiano) e sigla a tre lettere.
function loadZones() {
    const countries = {};
    try {
        const data = JSON.parse(readText('/usr/share/iso-codes/json/iso_3166-1.json'))['3166-1'];
        for (const c of data) {
            countries[c.alpha_2] = {
                name: GLib.dgettext('iso_3166-1', c.name),
                abbr: c.alpha_3,
            };
        }
    } catch (e) {}
    const zones = [];
    for (const line of readText('/usr/share/zoneinfo/zone1970.tab').split('\n')) {
        if (!line || line.startsWith('#'))
            continue;
        const cols = line.split('\t');
        if (cols.length < 3)
            continue;
        const code = cols[0].split(',')[0];
        const country = countries[code] ?? {name: code, abbr: code};
        const city = cols[2].split('/').pop().replace(/_/g, ' ');
        zones.push({tz: cols[2], abbr: country.abbr, label: `${country.name} — ${city}`});
    }
    zones.sort((a, b) => a.label.localeCompare(b.label));
    return zones;
}

export default class CountryClocksPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;
        const zones = loadZones();

        const page = new Adw.PreferencesPage();
        window.add(page);

        // Orologio principale
        const gLocal = new Adw.PreferencesGroup({
            title: 'Orologio principale',
            description: 'Sigla mostrata prima dell\'orologio di sistema (vuota = nessuna)',
        });
        const localRow = new Adw.EntryRow({title: 'Sigla'});
        localRow.text = settings.get_string('local-label');
        localRow.connect('changed', () => settings.set_string('local-label', localRow.text));
        gLocal.add(localRow);
        page.add(gLocal);

        // Orologi configurati
        const gList = new Adw.PreferencesGroup({title: 'Altri orologi'});
        page.add(gList);
        let rows = [];

        const rebuild = () => {
            rows.forEach(r => gList.remove(r));
            rows = [];
            const list = settings.get_strv('clocks');
            list.forEach((entry, i) => {
                const [abbr, tz] = entry.split('|');
                const row = new Adw.ActionRow({title: abbr, subtitle: tz});
                const mk = (icon, tip, cb, sensitive = true) => {
                    const b = new Gtk.Button({
                        icon_name: icon, tooltip_text: tip,
                        valign: Gtk.Align.CENTER, sensitive,
                    });
                    b.add_css_class('flat');
                    b.connect('clicked', cb);
                    row.add_suffix(b);
                };
                const move = d => {
                    const l = settings.get_strv('clocks');
                    [l[i], l[i + d]] = [l[i + d], l[i]];
                    settings.set_strv('clocks', l);
                };
                mk('go-up-symbolic', 'Sposta a sinistra', () => move(-1), i > 0);
                mk('go-down-symbolic', 'Sposta a destra', () => move(1), i < list.length - 1);
                mk('user-trash-symbolic', 'Rimuovi', () => {
                    const l = settings.get_strv('clocks');
                    l.splice(i, 1);
                    settings.set_strv('clocks', l);
                });
                gList.add(row);
                rows.push(row);
            });
        };
        rebuild();
        const sigId = settings.connect('changed::clocks', rebuild);
        window.connect('close-request', () => {
            settings.disconnect(sigId);
            return false;
        });

        // Aggiunta di un nuovo orologio
        const gAdd = new Adw.PreferencesGroup({
            title: 'Aggiungi orologio',
            description: 'Scegli il Paese: la sigla si compila da sola ed è modificabile',
        });
        const model = Gtk.StringList.new(zones.map(z => z.label));
        const combo = new Adw.ComboRow({title: 'Paese e città', model, enable_search: true});
        combo.expression = new Gtk.PropertyExpression(Gtk.StringObject, null, 'string');
        const abbrRow = new Adw.EntryRow({title: 'Sigla'});
        const sync = () => {
            const z = zones[combo.selected];
            if (z)
                abbrRow.text = z.abbr;
        };
        combo.connect('notify::selected', sync);
        const it = zones.findIndex(z => z.tz === 'Asia/Bangkok');
        if (it >= 0)
            combo.selected = it;
        sync();

        const addBtn = new Gtk.Button({label: 'Aggiungi', halign: Gtk.Align.END, margin_top: 12});
        addBtn.add_css_class('suggested-action');
        addBtn.connect('clicked', () => {
            const z = zones[combo.selected];
            if (!z)
                return;
            const abbr = abbrRow.text.trim() || z.abbr;
            settings.set_strv('clocks', [...settings.get_strv('clocks'), `${abbr}|${z.tz}`]);
        });
        gAdd.add(combo);
        gAdd.add(abbrRow);
        gAdd.add(addBtn);
        page.add(gAdd);
    }
}
