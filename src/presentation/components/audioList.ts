import type { AttachmentDTO } from '@application/dto/index.js';
import { el } from '../dom.js';
import { getAttachmentUrl } from './attachmentUrls.js';
import {
  getCachedAttachmentPlaybackUrl,
} from './attachmentPlaybackCache.js';
import { createAudioPlayer, type AudioPlayerControls } from './audioPlayer.js';
import {
  createAudioCascade,
  type AudioCascade,
  type CascadeEntry,
} from './audioCascade.js';
import { formatPlaybackRate, nextPlaybackRate } from './audioSpeed.js';

export interface AudioListOptions {
  onDelete: (attachment: AttachmentDTO) => void;
  onDownload: (attachment: AttachmentDTO) => void;
  onError: () => void;
}

const rates = new Map<string, number>();
const cascades = new Map<string, AudioCascade>();

function icon(name: string): string {
  return `<span class="material-symbols-rounded" aria-hidden="true">${name}</span>`;
}

function actionButton(label: string, iconName: string, className = ''): HTMLButtonElement {
  const button = el(
    'button',
    `btn-icon chain-attachment__action${className ? ` ${className}` : ''}`
  );
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = icon(iconName);
  return button;
}

export function renderAudioList(
  container: HTMLElement,
  audios: AttachmentDTO[],
  options: AudioListOptions
): AudioCascade {
  const noteId = audios[0]?.noteId ?? '';
  cascades.get(noteId)?.stop();

  let rate = rates.get(noteId) ?? 1;
  const controls: AudioPlayerControls[] = [];
  const entries: CascadeEntry[] = [];

  if (audios.length > 0) {
    const speed = el('button', 'chain-attachment__speed');
    speed.type = 'button';
    speed.textContent = formatPlaybackRate(rate);
    speed.title = 'Velocidade de reprodução';
    speed.setAttribute('aria-label', `Velocidade de reprodução: ${formatPlaybackRate(rate)}`);

    speed.addEventListener('click', () => {
      rate = nextPlaybackRate(rate);
      const label = formatPlaybackRate(rate);
      for (const control of controls) control.setPlaybackRate(rate);
      speed.textContent = label;
      speed.setAttribute(
        'aria-label',
        `Velocidade de reprodução: ${label}`
      );
      rates.set(noteId, rate);
    });
    container.appendChild(speed);
  }

  for (const attachment of audios) {
    const cached = getCachedAttachmentPlaybackUrl(attachment.id);
    const control = createAudioPlayer(
      cached ?? '',
      options.onError,
      attachment.duration,
      attachment.mimeType
    );
    control.setPlaybackRate(rate);
    controls.push(control);

    if (!cached) {
      void getAttachmentUrl(attachment.id, attachment.mimeType).then((url) => {
        if (url) control.setSource(url, attachment.mimeType);
      });
    }

    const { player, playBtn, progressBar, durationEl } = control;
    const name = el('span', 'chain-attachment__name');
    name.textContent = attachment.fileName;

    const download = actionButton('Baixar áudio', 'download');
    download.addEventListener('click', () => options.onDownload(attachment));

    const remove = actionButton(
      'Excluir áudio',
      'delete',
      'chain-attachment__action--delete'
    );
    remove.addEventListener('click', () => options.onDelete(attachment));

    const row = el('div', 'chain-attachment chain-attachment--audio');
    row.dataset['attachmentId'] = attachment.id;
    row.append(playBtn, name, durationEl, player, download, remove, progressBar);
    container.appendChild(row);
    entries.push({ player, playBtn, row });
  }

  const cascade = createAudioCascade(entries, { onError: options.onError });
  cascades.set(noteId, cascade);
  return cascade;
}

export function stopAllAudioCascades(): void {
  for (const cascade of cascades.values()) cascade.stop();
  cascades.clear();
}
