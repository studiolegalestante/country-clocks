# Country Clocks in Top Bar

GNOME Shell extension that shows the time of other countries in the top bar, next to the system clock.

```
ITA Wed 28 Oct 12:48    THA Wed 28 Oct 18:48    CUB Wed 28 Oct 07:48
```

- Each clock has a three-letter country code (ITA, THA, CUB…).
- Same date/time format as the system clock (12/24h, weekday, date, seconds follow your GNOME settings).
- The date is computed for each time zone, so it changes correctly when another country is already on the next day.
- Add, remove and reorder countries from the preferences (country list with search, localized names).

Supports GNOME Shell 50.

## Installation

From [extensions.gnome.org](https://extensions.gnome.org) or manually:

```
git clone https://github.com/studiolegalestante/country-clocks.git \
  ~/.local/share/gnome-shell/extensions/country-clocks@vincenzostante
glib-compile-schemas ~/.local/share/gnome-shell/extensions/country-clocks@vincenzostante/schemas
```

Log out and back in, then enable it with Extension Manager or `gnome-extensions enable country-clocks@vincenzostante`.

---

## Italiano

Estensione per GNOME Shell che mostra nella barra superiore l'ora di altri Paesi accanto all'orologio di sistema, con la sigla del Paese e lo stesso formato di data e ora. I Paesi si aggiungono, rimuovono e riordinano dalle impostazioni.

## License

GPL-2.0-or-later — © 2026 Vincenzo Stante
