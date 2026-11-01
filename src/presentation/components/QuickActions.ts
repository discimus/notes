export interface QuickActionsOptions {
  documentId: string;
  groupId?: string;
  groupLabel?: string;
  badgeId?: string;
  controls?: string;
  expanded?: boolean;
  imageId?: string;
  audioId?: string;
  linkId?: string;
}

export function renderQuickActions(options: QuickActionsOptions): string {
  const {
    documentId,
    groupId,
    groupLabel = 'Adicionar conteúdo',
    badgeId,
    controls,
    expanded,
    imageId,
    audioId,
    linkId,
  } = options;

  const groupIdAttribute = groupId ? ` id="${groupId}"` : '';
  const imageIdAttribute = imageId ? ` id="${imageId}"` : '';
  const audioIdAttribute = audioId ? ` id="${audioId}"` : '';
  const linkIdAttribute = linkId ? ` id="${linkId}"` : '';
  const badge = badgeId
    ? `<span class="chain-quick-action__badge" id="${badgeId}" hidden aria-hidden="true"></span>`
    : '';
  const controlsAttribute = controls ? ` aria-controls="${controls}"` : '';
  const expandedAttribute =
    typeof expanded === 'boolean' ? ` aria-expanded="${expanded}"` : '';

  return `
    <div class="chain-quick-actions"${groupIdAttribute} role="group" aria-label="${groupLabel}">
      <button class="chain-quick-action chain-quick-action--primary" id="${documentId}" type="button"
        aria-label="Documento"${controlsAttribute}${expandedAttribute}>
        <span class="chain-quick-action__icon-wrap">
          <span class="material-symbols-rounded chain-quick-action__icon" aria-hidden="true">edit_note</span>
          ${badge}
        </span>
        <span class="chain-quick-action__label">Documento</span>
      </button>
      <button class="chain-quick-action"${imageIdAttribute} type="button" disabled title="Em breve" aria-label="Imagem, em breve">
        <span class="chain-quick-action__icon-wrap">
          <span class="material-symbols-rounded chain-quick-action__icon" aria-hidden="true">image</span>
        </span>
        <span class="chain-quick-action__label">Imagem</span>
      </button>
      <button class="chain-quick-action"${audioIdAttribute} type="button" disabled title="Em breve" aria-label="Áudio, em breve">
        <span class="chain-quick-action__icon-wrap">
          <span class="material-symbols-rounded chain-quick-action__icon" aria-hidden="true">audio_file</span>
        </span>
        <span class="chain-quick-action__label">Áudio</span>
      </button>
      <button class="chain-quick-action"${linkIdAttribute} type="button" disabled title="Em breve" aria-label="Link, em breve">
        <span class="chain-quick-action__icon-wrap">
          <span class="material-symbols-rounded chain-quick-action__icon" aria-hidden="true">link</span>
        </span>
        <span class="chain-quick-action__label">Link</span>
      </button>
    </div>
  `;
}
