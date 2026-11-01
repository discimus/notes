import { el } from '../../dom.js';
import type { SettingsSection, SettingsSectionId } from '../../settings/types.js';

export interface SettingsNavigationOptions {
  sections: readonly SettingsSection[];
  activeId: SettingsSectionId;
  onSelect: (sectionId: SettingsSectionId) => void;
}

export interface SettingsNavigationView {
  element: HTMLElement;
  destroy: () => void;
}

export function mountSettingsNavigation(
  options: SettingsNavigationOptions
): SettingsNavigationView {
  const element = el('div', 'settings-dialog__nav');
  element.setAttribute('role', 'tablist');
  element.setAttribute('aria-label', 'Seções de configurações');

  const buttons: HTMLButtonElement[] = [];
  let activeId = options.activeId;

  const mediaQuery =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 768px)')
      : null;

  const syncOrientation = (): void => {
    element.setAttribute(
      'aria-orientation',
      mediaQuery?.matches ? 'horizontal' : 'vertical'
    );
  };

  const syncActive = (): void => {
    buttons.forEach((button) => {
      const selected = button.dataset['settingsSection'] === activeId;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    });
  };

  const select = (sectionId: SettingsSectionId, focus = false): void => {
    activeId = sectionId;
    syncActive();
    options.onSelect(sectionId);
    if (focus) {
      const target = buttons.find(
        (button) => button.dataset['settingsSection'] === sectionId
      );
      target?.focus();
    }
  };

  options.sections.forEach((section) => {
    const button = el('button', 'settings-dialog__tab');
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.id = `settings-tab-${section.id}`;
    button.setAttribute('aria-controls', `settings-panel-${section.id}`);
    button.dataset['settingsSection'] = section.id;

    const icon = el('span', 'material-symbols-rounded settings-dialog__tab-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = section.icon;
    const label = el('span', 'settings-dialog__tab-label');
    label.textContent = section.label;
    button.append(icon, label);
    button.addEventListener('click', () => select(section.id));
    buttons.push(button);
    element.appendChild(button);
  });

  const onKeyDown = (event: KeyboardEvent): void => {
    if (buttons.length === 0) return;

    const currentIndex = buttons.findIndex(
      (button) => button.dataset['settingsSection'] === activeId
    );
    let nextIndex: number | null = null;

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % buttons.length;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = buttons.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const next = buttons[nextIndex];
    const sectionId = next?.dataset['settingsSection'];
    if (
      sectionId === 'appearance' ||
      sectionId === 'notes' ||
      sectionId === 'behavior'
    ) {
      select(sectionId, true);
    }
  };

  element.addEventListener('keydown', onKeyDown);
  mediaQuery?.addEventListener('change', syncOrientation);
  syncOrientation();
  syncActive();

  return {
    element,
    destroy: () => {
      mediaQuery?.removeEventListener('change', syncOrientation);
    },
  };
}
