import { el } from '../../dom.js';
import type {
  RadioSettingDefinition,
  SettingDefinition,
  ToggleSettingDefinition,
} from '../../settings/types.js';

export interface SettingsControlOptions {
  autofocus?: boolean;
  onChange: (message: string) => void;
}

function controlId(setting: SettingDefinition): string {
  return setting.controlId ?? `setting-${setting.id}`;
}

function toggleMessage(setting: ToggleSettingDefinition, value: boolean): string {
  return `${setting.label} ${value ? 'ativado' : 'desativado'}.`;
}

function radioMessage(
  setting: RadioSettingDefinition,
  value: string
): string {
  const option = setting.options.find((item) => item.value === value);
  return `${setting.label}: ${option?.label ?? value}.`;
}

export function renderToggleSetting(
  setting: ToggleSettingDefinition,
  options: SettingsControlOptions
): HTMLElement {
  const inputId = controlId(setting);
  const descriptionId = `${inputId}-description`;
  const row = el('label', 'settings-item settings-item--toggle');
  row.htmlFor = inputId;

  const text = el('span', 'settings-item__text');
  const title = el('span', 'settings-item__title');
  title.textContent = setting.label;
  const description = el('span', 'settings-item__description');
  description.id = descriptionId;
  description.textContent = setting.description;
  text.append(title, description);

  const switchWrap = el('span', 'settings-switch');
  const input = el('input', 'settings-switch__input');
  input.type = 'checkbox';
  input.id = inputId;
  input.setAttribute('role', 'switch');
  input.setAttribute('aria-describedby', descriptionId);
  input.checked = setting.get();
  input.setAttribute('aria-checked', input.checked ? 'true' : 'false');
  if (options.autofocus) input.setAttribute('data-autofocus', '');

  const track = el('span', 'settings-switch__track');
  track.setAttribute('aria-hidden', 'true');
  const thumb = el('span', 'settings-switch__thumb');
  thumb.setAttribute('aria-hidden', 'true');

  input.addEventListener('change', () => {
    setting.set(input.checked);
    input.setAttribute('aria-checked', input.checked ? 'true' : 'false');
    options.onChange(toggleMessage(setting, input.checked));
  });

  switchWrap.append(input, track, thumb);
  row.append(text, switchWrap);
  return row;
}

export function renderRadioSetting(
  setting: RadioSettingDefinition,
  options: SettingsControlOptions
): HTMLElement {
  const group = el('fieldset', 'settings-item settings-item--radio');
  const groupId = controlId(setting);
  const descriptionId = `${groupId}-description`;

  const legend = el('legend', 'settings-item__title');
  legend.textContent = setting.label;
  const description = el('p', 'settings-item__description');
  description.id = descriptionId;
  description.textContent = setting.description;
  group.append(legend, description);

  const currentValue = setting.get();
  setting.options.forEach((option, index) => {
    const optionId = `${groupId}-${option.value}`;
    const row = el('label', 'settings-radio');
    row.htmlFor = optionId;

    const input = el('input', 'settings-radio__input');
    input.type = 'radio';
    input.id = optionId;
    input.name = groupId;
    input.value = option.value;
    input.checked = option.value === currentValue;
    input.setAttribute('aria-describedby', descriptionId);
    if (options.autofocus && (input.checked || index === 0)) {
      input.setAttribute('data-autofocus', '');
    }

    const text = el('span', 'settings-radio__text');
    const label = el('span', 'settings-radio__label');
    label.textContent = option.label;
    text.appendChild(label);
    if (option.description) {
      const support = el('span', 'settings-radio__description');
      support.textContent = option.description;
      text.appendChild(support);
    }

    input.addEventListener('change', () => {
      if (!input.checked) return;
      setting.set(option.value);
      options.onChange(radioMessage(setting, option.value));
    });

    row.append(input, text);
    group.appendChild(row);
  });

  return group;
}

export function renderSettingControl(
  setting: SettingDefinition,
  options: SettingsControlOptions
): HTMLElement {
  return setting.control === 'toggle'
    ? renderToggleSetting(setting, options)
    : renderRadioSetting(setting, options);
}
