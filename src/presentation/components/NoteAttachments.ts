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

export interface NoteAttachmentRenderOptions {
  previewImageLimit?: number;
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
): HTMLElement {
  const item = el('div', 'chain-attachment chain-attachment--image');
  item.dataset['attachmentId'] = attachment.id;
  item.setAttribute('role', 'group');
  item.setAttribute('aria-roledescription', 'imagem');

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

  return item;
}

function carouselButton(label: string, iconName: string): HTMLButtonElement {
  const button = el('button', 'btn-icon chain-note__carousel-nav');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = icon(iconName);
  return button;
}

function mountImageCarousel(
  grid: HTMLElement,
  count: number,
  describeImage: (index: number) => string
): HTMLElement {
  const controls = el('div', 'chain-note__carousel-controls');
  const previous = carouselButton('Imagem anterior', 'chevron_left');
  const next = carouselButton('Próxima imagem', 'chevron_right');
  const dots = el('div', 'chain-note__carousel-dots');
  dots.setAttribute('role', 'group');
  dots.setAttribute('aria-label', 'Selecionar imagem');

  const dotButtons = Array.from({ length: count }, (_, index) => {
    const dot = el('button', 'chain-note__carousel-dot');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Ir para imagem ${index + 1} de ${count}`);
    dot.title = describeImage(index);
    dot.addEventListener('click', () => scrollToIndex(index));
    dots.appendChild(dot);
    return dot;
  });

  let activeIndex = 0;
  const setActive = (index: number): void => {
    const nextIndex = Math.max(0, Math.min(count - 1, index));
    if (nextIndex === activeIndex && dotButtons[activeIndex]?.hasAttribute('aria-current')) {
      return;
    }
    activeIndex = nextIndex;
    dotButtons.forEach((dot, dotIndex) => {
      if (dotIndex === activeIndex) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    previous.disabled = activeIndex === 0;
    next.disabled = activeIndex === count - 1;
  };

  const scrollToIndex = (index: number): void => {
    const target = Math.max(0, Math.min(count - 1, index));
    setActive(target);
    const behavior =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
    const left = grid.clientWidth * target;
    if (typeof grid.scrollTo === 'function') {
      grid.scrollTo({ left, behavior });
    } else {
      grid.scrollLeft = left;
    }
  };

  const currentIndex = (): number => {
    const width = grid.clientWidth;
    return width > 0 ? Math.round(grid.scrollLeft / width) : activeIndex;
  };

  const syncFromScroll = (): void => setActive(currentIndex());

  grid.setAttribute('tabindex', '0');
  grid.setAttribute('role', 'region');
  grid.setAttribute('aria-roledescription', 'carrossel');
  grid.setAttribute('aria-label', 'Imagens da nota');
  grid.addEventListener('scroll', syncFromScroll, { passive: true });
  grid.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollToIndex(currentIndex() - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollToIndex(currentIndex() + 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      scrollToIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      scrollToIndex(count - 1);
    }
  });

  previous.addEventListener('click', () => scrollToIndex(activeIndex - 1));
  next.addEventListener('click', () => scrollToIndex(activeIndex + 1));

  controls.append(previous, dots, next);
  setActive(0);
  return controls;
}

export function renderNoteAttachments(
  host: HTMLElement,
  attachments: AttachmentDTO[],
  handlers: NoteAttachmentHandlers,
  options: NoteAttachmentRenderOptions = {}
): void {
  if (attachments.length === 0) return;

  const previewImageLimit = Math.max(1, options.previewImageLimit ?? 3);
  const container = el('div', 'chain-note__attachments');
  container.addEventListener('click', (event) => event.stopPropagation());
  const images = el('div', 'chain-note__attachment-grid');
  const audios = el('div', 'chain-note__audio-list');
  const imageAttachments = attachments.filter(
    (attachment) => attachment.kind === 'image'
  );
  const audioAttachments = attachments.filter(
    (attachment) => attachment.kind === 'audio'
  );

  imageAttachments.forEach((attachment, index) => {
    const item = renderImage(images, attachment, handlers);
    item.setAttribute(
      'aria-label',
      `Imagem ${index + 1} de ${imageAttachments.length}`
    );
    if (index >= previewImageLimit) {
      item.classList.add('chain-attachment--preview-hidden');
    }
  });

  if (audioAttachments.length > 0) {
    renderAudioList(audios, audioAttachments, {
      onDelete: handlers.onDelete,
      onDownload: downloadAudioAttachment,
      onError: () => snackbar.error('Áudio indisponível. Grave novamente.'),
    });
  }

  if (imageAttachments.length > 0) {
    const imageGroup = el('div', 'chain-note__attachment-images');
    imageGroup.setAttribute('role', 'group');
    imageGroup.setAttribute('aria-label', 'Imagens da nota');
    imageGroup.appendChild(images);
    if (imageAttachments.length > 1) {
      imageGroup.appendChild(
        mountImageCarousel(images, imageAttachments.length, (index) => {
          const attachment = imageAttachments[index];
          return attachment?.altText || attachment?.fileName || `Imagem ${index + 1}`;
        })
      );
    }

    const hiddenCount = Math.max(0, imageAttachments.length - previewImageLimit);
    if (hiddenCount > 0) {
      const more = el('span', 'chain-note__attachment-more');
      const visual = el('span', 'chain-note__attachment-more-count');
      visual.setAttribute('aria-hidden', 'true');
      visual.textContent = `+${hiddenCount}`;
      const accessible = el('span', 'sr-only');
      accessible.textContent = `${hiddenCount} ${
        hiddenCount === 1 ? 'imagem adicional' : 'imagens adicionais'
      }`;
      more.append(visual, accessible);
      imageGroup.appendChild(more);
    }

    container.appendChild(imageGroup);
  }
  if (audios.childElementCount > 0) container.appendChild(audios);
  host.appendChild(container);
}
