/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'my-indicator-extension';

const { GObject, St } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const Clutter = imports.gi.Clutter;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const themes = [
  [{ red: 143 , green: 71  , blue: 0   , alpha: 255 }  ,
   { red: 143 , green: 135 , blue: 127 , alpha: 255 }] ,
  [{ red: 63  , green: 127 , blue: 0   , alpha: 255 }  ,
   { red: 127 , green: 127 , blue: 127 , alpha: 255 }] ,
  [{ red: 0   , green: 127 , blue: 143 , alpha: 255 }  ,
   { red: 127 , green: 127 , blue: 143 , alpha: 255 }] ,
  [{ red: 143 , green: 127 , blue: 95  , alpha: 255 }  ,
   { red: 143 , green: 127 , blue: 127 , alpha: 255 }] ,
  [{ red: 127 , green: 127 , blue: 127 , alpha: 255 }  ,
   { red: 127 , green: 127 , blue: 127 , alpha: 255 }] ,
]

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
  _init(fx) {
    super._init(0.0, _('My Shiny Indicator'));

    this.add_child(new St.Icon({
      icon_name: 'applications-graphics-symbolic',
      style_class: 'system-status-icon',
    }));

    this.fx = fx;
    this.setting = 0;
    this.connect('scroll-event', 
      function(actor, event)
      {
        if (event.get_scroll_direction() == Clutter.ScrollDirection.UP)
          fx.fx_change_level(0.05);
        if (event.get_scroll_direction() == Clutter.ScrollDirection.DOWN)
          fx.fx_change_level(-0.05);
        if (event.get_scroll_direction() == Clutter.ScrollDirection.LEFT)
          fx.fx_change_brightness(0.05);
        if (event.get_scroll_direction() == Clutter.ScrollDirection.RIGHT)
          fx.fx_change_brightness(-0.05);
      }
    ) 
  }

  vfunc_event(event) {
    if (this.menu &&
        (event.type() == Clutter.EventType.TOUCH_BEGIN ||
         event.type() == Clutter.EventType.BUTTON_PRESS))
    {
      if (this.fx.fx_set_setting(this.setting))
        this.setting += 1;
      else
        this.setting = 0;
    }

    return Clutter.EVENT_PROPAGATE;
  }
});

class Extension {
  constructor(uuid) {
    this._uuid = uuid;

    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
  }

  fx_enabled() {
    return this.enabled;
  }

  fx_set(state) {
    if (state == this.enabled) return;
    this.enabled = state;
    if (state)
    {
      Main.uiGroup.add_effect(this.bcfx);
      Main.uiGroup.add_effect(this.dfx);
    }
    else
    {
      Main.uiGroup.remove_effect(this.dfx);
      Main.uiGroup.remove_effect(this.bcfx);
    }
  }

  fx_toggle() {
    this.fx_set(!this.enabled);
    return this.enabled;
  }

  fx_set_color(color, spec)
  {
    color.red   = spec.red;
    color.green = spec.green;
    color.blue  = spec.blue;
    color.alpha = spec.alpha;
  }

  map_brightness(x)
  {
    return (((x - 127) / 127) + this.brightness - 1.0) * this.level;
  }

  map_contrast(x)
  {
    return ((x - 127) / 127) * this.level;
  }

  fx_update()
  {
    if (!this.theme) return;
    this.dfx.factor = this.level;
    this.bcfx.set_brightness_full(
      this.map_brightness(this.theme[0].red),
      this.map_brightness(this.theme[0].green),
      this.map_brightness(this.theme[0].blue)
    );
    this.bcfx.set_contrast_full(
      this.map_contrast(this.theme[1].red),
      this.map_contrast(this.theme[1].green),
      this.map_contrast(this.theme[1].blue)
    );
  }

  fx_set_setting(index)
  {
    let result = index < themes.length;
    if (result)
    {
      this.theme = themes[index];
      this.fx_update();
    }
    this.fx_set(result);
    return result;
  }

  clamp(x)
  {
    if (x < 0.0)
      return 0.0;
    else if (x > 1.0)
      return 1.0;
    else
      return x;
  }

  fx_change_brightness(delta)
  {
    this.brightness = this.clamp(this.brightness + delta);
    this.fx_update();
  }

  fx_change_level(delta)
  {
    this.level = this.clamp(this.level + delta);
    this.fx_update();
  }

  enable() {
    this.dfx = new Clutter.DesaturateEffect();
    this.bcfx = new Clutter.BrightnessContrastEffect();
    this.enabled = false;
    this.level = 1.0;
    this.brightness = 1.0;
    this.theme = null;

    this._indicator = new Indicator(this);
    Main.panel.addToStatusArea(this._uuid, this._indicator);
  }

  disable() {
    fx_set(false);
    this._indicator.destroy();
    this._indicator = null;
    this.dfx.destroy();
    this.dfx = null;
    this.bcfx.destroy();
    this.bcfx = null;
  }
}

function init(meta) {
  return new Extension(meta.uuid);
}
