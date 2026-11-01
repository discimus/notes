import type { AttachmentDTO } from '@application/dto/index.js';
import { el } from '../dom.js';
import { AppController } from '../pages/AppController.js';
import { snackbar } from './Snackbar.js';
import { mountDialog } from './Dialog.js';
import { getAttachmentUrl } from './attachmentUrls.js';
import { getCachedAttachmentPlaybackUrl } from './attachmentPlaybackCache.js';
import { renderAudioList } from './audioList.js';

export { stopAttachmentAudio } from './audioPlayer.js';

export interface NoteAttachmentHandlers {
  onDelete: (attachment: AttachmentDTO) => void;
}

function icon(name: string): string {
  return `<span class="material-symbols-rounded" aria-hidden="true">${name}</span>`;
}

function actionButton(label: string, iconName: string, className = ''): HTMLButtonElement {
  const button = el('button', `btn-icon chain-attachment__action${className ? ` ${className}` : ''}`);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = icon(iconName);
  return button;
}

async function copyImage(attachment: AttachmentDTO): Promise<void> {
  try {
    const blob = await AppController.getAttachmentBlob(attachment.id);
    if (!blob || typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      throw new Error('Clipboard indisponível');
    }
    await navigator.clipboard.write([new ClipboardItem({ [attachment.mimeType]: blob })]);
    snackbar.success('Imagem copiada.');
  } catch {
    snackbar.error('Não foi possível copiar a imagem.');
  }
}

function downloadAttachment(attachment: AttachmentDTO, url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = attachment.fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadAudioAttachment(attachment: AttachmentDTO): void {
  const cached = getCachedAttachmentPlaybackUrl(attachment.id);
  if (cached) {
    downloadAttachment(attachment, cached);
    return;
  }
  void getAttachmentUrl(attachment.id, attachment.mimeType).then((url) => {
    if (!url) {
      snackbar.error('Áudio indisponível. Grave novamente.');
      return;
    }
    downloadAttachment(attachment, url);
  });
}

function showImage(attachment: AttachmentDTO, url: string): void {
  const backdrop = el('div', 'dialog-backdrop');
  backdrop.setAttribute('role', 'presentation');
  const dialog = el('div', 'dialog attachment-image-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'attachment-image-title');

  const header = el('div', 'dialog__header');
  const title = el('h2', 'dialog__title attachment-image-dialog__title');
  title.id = 'attachment-image-title';
  title.textContent = attachment.fileName;
  const close = el('button', 'btn-icon');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fechar imagem');
  close.title = 'Fechar';
  close.innerHTML = icon('close');
  header.append(title, close);

  const figure = el('figure', 'attachment-image-dialog__figure');
  const image = el('img', 'attachment-image-dialog__image') as HTMLImageElement;
  image.src = url;
  image.alt = attachment.altText || attachment.fileName;
  const caption = el('figcaption', 'attachment-image-dialog__caption');
  caption.textContent = attachment.altText || attachment.fileName;
  figure.append(image, caption);

  dialog.append(header, figure);
  backdrop.appendChild(dialog);
  const destroy = mountDialog(backdrop, dialog, () => undefined);
  close.addEventListener('click', destroy);
}

function renderImage(
  container: HTMLElement,
  attachment: AttachmentDTO,
  handlers: NoteAttachmentHandlers
): void {
  const item = el('div', 'chain-attachment chain-attachment--image');
  item.dataset['attachmentId'] = attachment.id;

  const preview = el('button', 'chain-attachment__preview');
  preview.type = 'button';
  preview.setAttribute('aria-label', `Abrir imagem ${attachment.fileName}`);
  preview.title = attachment.altText || attachment.fileName;
  const image = el('img', 'chain-attachment__image') as HTMLImageElement;
  image.alt = attachment.altText || attachment.fileName;
  image.loading = 'lazy';
  if (attachment.width && attachment.height) {
    image.style.aspectRatio = `${attachment.width} / ${attachment.height}`;
  }
  preview.appendChild(image);

  const actions = el('div', 'chain-attachment__actions');
  const copy = actionButton('Copiar imagem', 'content_copy');
  const download = actionButton('Baixar imagem', 'download');
  download.disabled = true;
  const remove = actionButton('Excluir imagem', 'delete', 'chain-attachment__action--delete');
  actions.append(copy, download, remove);
  item.append(preview, actions);
  container.appendChild(item);

  void getAttachmentUrl(attachment.id, attachment.mimeType).then((url) => {
    if (!url || !item.isConnected) return;
    image.src = url;
    item.classList.add('chain-attachment--ready');
    preview.addEventListener('click', () => showImage(attachment, url));
    download.disabled = false;
    download.addEventListener('click', () => downloadAttachment(attachment, url));
  });
  copy.addEventListener('click', () => void copyImage(attachment));
  remove.addEventListener('click', () => handlers.onDelete(attachment));
}

export function renderNoteAttachments(
  host: HTMLElement,
  attachments: AttachmentDTO[],
  handlers: NoteAttachmentHandlers
): void {
  if (attachments.length === 0) return;

  const container = el('div', 'chain-note__attachments');
  container.addEventListener('click', (event) => event.stopPropagation());
  const images = el('div', 'chain-note__attachment-grid');
  const audios = el('div', 'chain-note__audio-list');
  const audioAttachments = attachments.filter(
    (attachment) => attachment.kind === 'audio'
  );

  for (const attachment of attachments) {
    if (attachment.kind === 'image') renderImage(images, attachment, handlers);
  }

  if (audioAttachments.length > 0) {
    renderAudioList(audios, audioAttachments, {
      onDelete: handlers.onDelete,
      onDownload: downloadAudioAttachment,
      onError: () => snackbar.error('Áudio indisponível. Grave novamente.'),
    });
  }

  if (images.childElementCount > 0) container.appendChild(images);
  if (audios.childElementCount > 0) container.appendChild(audios);
  host.appendChild(container);
}
