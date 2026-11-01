import { el } from '../dom.js';
import {
  SETTINGS_SECTIONS,
  sectionById,
  settingsForSection,
} from '../settings/registry.js';
import type { SettingsSectionId } from '../settings/types.js';
import { mountDialog } from './Dialog.js';
import { renderSettingControl } from './settings/SettingsControls.js';
import { mountSettingsNavigation } from './settings/SettingsNavigation.js';

const DIALOG_ID = 'settings-dialog';

export function showSettingsDialog(): void {
  if (document.getElementById(DIALOG_ID)) return;

  const firstSection = SETTINGS_SECTIONS[0];
  if (!firstSection) return;

  let activeSectionId: SettingsSectionId = firstSection.id;

  const backdrop = el('div', 'dialog-backdrop dialog-backdrop--settings');
  backdrop.setAttribute('role', 'presentation');

  const dialog = el('div', 'dialog dialog--settings');
  dialog.id = DIALOG_ID;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'settings-title');
  dialog.setAttribute('aria-describedby', 'settings-description');

  dialog.innerHTML = `
    <header class="settings-dialog__header">
      <div class="settings-dialog__heading">
        <h2 id="settings-title" class="dialog__title dialog__title--left">Configurações</h2>
        <p id="settings-description" class="dialog__body dialog__body--left">Preferências deste dispositivo.</p>
      </div>
      <button class="btn-icon" id="settings-close" type="button" aria-label="Fechar configurações" title="Fechar">
        <span class="material-symbols-rounded" aria-hidden="true">close</span>
      </button>
    </header>
    <div class="settings-dialog__body">
      <div class="settings-dialog__navigation" id="settings-navigation"></div>
      <div class="settings-dialog__panels" id="settings-panels"></div>
    </div>
    <footer class="settings-dialog__footer">
      <p class="settings-status" id="settings-status" aria-live="polite"></p>
      <button class="btn btn-text" id="settings-done" type="button">Fechar</button>
    </footer>
  `;

  const navigationHost = dialog.querySelector<HTMLElement>('#settings-navigation')!;
  const panels = dialog.querySelector<HTMLElement>('#settings-panels')!;
  const status = dialog.querySelector<HTMLElement>('#settings-status')!;
  const panelsBySection = new Map<SettingsSectionId, HTMLElement>();

  SETTINGS_SECTIONS.forEach((section) => {
    const panel = el('section', 'settings-dialog__panel');
    panel.id = `settings-panel-${section.id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `settings-tab-${section.id}`);
    panel.hidden = true;
    panels.appendChild(panel);
    panelsBySection.set(section.id, panel);
  });

  const renderSection = (sectionId: SettingsSectionId): void => {
    const section = sectionById(sectionId);
    if (!section) return;

    activeSectionId = sectionId;
    status.textContent = '';

    const panel = panelsBySection.get(section.id);
    if (!panel) return;

    panel.replaceChildren();
    panelsBySection.forEach((item, id) => {
      const active = id === section.id;
      item.hidden = !active;
      if (!active) item.replaceChildren();
    });

    const heading = el('div', 'settings-dialog__section-heading');
    const title = el('h3', 'settings-dialog__section-title');
    title.id = `settings-${section.id}-title`;
    title.textContent = section.label;
    const description = el('p', 'settings-dialog__section-description');
    description.textContent = section.description;
    heading.append(title, description);
    panel.appendChild(heading);

    const definitions = settingsForSection(section.id);
    definitions.forEach((setting, index) => {
      panel.appendChild(
        renderSettingControl(setting, {
          autofocus: index === 0,
          onChange: (message) => {
            status.textContent = message;
          },
        })
      );
    });

  };

  const navigation = mountSettingsNavigation({
    sections: SETTINGS_SECTIONS,
    activeId: activeSectionId,
    onSelect: (sectionId) => renderSection(sectionId),
  });
  navigationHost.appendChild(navigation.element);

  renderSection(activeSectionId);
  backdrop.appendChild(dialog);

  let destroy = () => {};
  const finish = (): void => {
    navigation.destroy();
    destroy();
  };
  destroy = mountDialog(backdrop, dialog, () => navigation.destroy());

  dialog.querySelector('#settings-close')!.addEventListener('click', finish);
  dialog.querySelector('#settings-done')!.addEventListener('click', finish);
}
