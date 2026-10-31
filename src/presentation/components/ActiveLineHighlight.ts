export interface ActiveLineHighlight {
  refresh: () => void;
  destroy: () => void;
}

function scheduleFrame(callback: () => void): number {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback);
  }
  return window.setTimeout(callback, 16);
}

function cancelFrame(id: number): void {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id);
    return;
  }
  window.clearTimeout(id);
}

function copyMirrorStyles(mirror: HTMLElement, textarea: HTMLTextAreaElement): void {
  const computed = window.getComputedStyle(textarea);
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
  const contentWidth = Math.max(0, textarea.clientWidth - paddingLeft - paddingRight);

  const properties: Array<[string, string]> = [
    ['box-sizing', 'content-box'],
    ['width', `${contentWidth}px`],
    ['font-family', computed.fontFamily],
    ['font-size', computed.fontSize],
    ['font-weight', computed.fontWeight],
    ['font-style', computed.fontStyle],
    ['letter-spacing', computed.letterSpacing],
    ['word-spacing', computed.wordSpacing],
    ['line-height', computed.lineHeight],
    ['text-align', computed.textAlign],
    ['text-indent', computed.textIndent],
    ['text-transform', computed.textTransform],
    ['white-space', computed.whiteSpace === 'normal' ? 'pre-wrap' : computed.whiteSpace],
    ['overflow-wrap', computed.overflowWrap || 'break-word'],
    ['word-break', computed.wordBreak],
    ['tab-size', computed.getPropertyValue('tab-size')],
    ['direction', computed.direction],
    ['padding-top', computed.paddingTop],
    ['padding-right', computed.paddingRight],
    ['padding-bottom', computed.paddingBottom],
    ['padding-left', computed.paddingLeft],
    ['border-top-width', computed.borderTopWidth],
    ['border-right-width', computed.borderRightWidth],
    ['border-bottom-width', computed.borderBottomWidth],
    ['border-left-width', computed.borderLeftWidth],
    ['border-style', computed.borderStyle],
  ];

  for (const [property, value] of properties) {
    mirror.style.setProperty(property, value);
  }
}

export function mountActiveLineHighlight(
  textarea: HTMLTextAreaElement,
  container: HTMLElement
): ActiveLineHighlight {
  const highlight = document.createElement('div');
  highlight.className = 'active-line-highlight';
  highlight.setAttribute('aria-hidden', 'true');
  highlight.hidden = true;

  const mirror = document.createElement('div');
  mirror.className = 'active-line-mirror';
  mirror.setAttribute('aria-hidden', 'true');

  container.appendChild(highlight);
  container.appendChild(mirror);

  let frameId: number | null = null;
  let destroyed = false;
  let resizeObserver: ResizeObserver | null = null;

  const hide = (): void => {
    highlight.hidden = true;
  };

  const refresh = (): void => {
    if (destroyed) return;

    if (
      document.activeElement !== textarea ||
      !textarea.isConnected ||
      textarea.hidden
    ) {
      hide();
      return;
    }

    const caret = textarea.selectionEnd ?? 0;
    mirror.textContent = '';
    mirror.appendChild(document.createTextNode(textarea.value.slice(0, caret)));

    const marker = document.createElement('span');
    marker.textContent = '\u200b';
    mirror.appendChild(marker);

    const computed = window.getComputedStyle(textarea);
    const parsedLineHeight = Number.parseFloat(computed.lineHeight);
    const lineHeight =
      Number.isFinite(parsedLineHeight) && parsedLineHeight > 0
        ? parsedLineHeight
        : (Number.parseFloat(computed.fontSize) || 16) * 1.5;

    if (textarea.clientWidth === 0 || textarea.clientHeight === 0) {
      highlight.style.top = '0px';
      highlight.style.height = `${lineHeight}px`;
      highlight.hidden = false;
      return;
    }

    const mirrorRect = mirror.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const lineTop = markerRect.top - mirrorRect.top - textarea.scrollTop;
    const bottom = lineTop + lineHeight;

    if (bottom <= 0 || lineTop >= textarea.clientHeight) {
      hide();
      return;
    }

    const clippedTop = Math.max(0, lineTop);
    const clippedBottom = Math.min(textarea.clientHeight, bottom);

    highlight.style.top = `${clippedTop}px`;
    highlight.style.height = `${Math.max(1, clippedBottom - clippedTop)}px`;
    highlight.hidden = false;
  };

  const refreshSoon = (): void => {
    if (frameId !== null) return;
    frameId = scheduleFrame(() => {
      frameId = null;
      refresh();
    });
  };

  const onFocus = (): void => {
    copyMirrorStyles(mirror, textarea);
    refreshSoon();
  };

  const onBlur = (): void => {
    hide();
  };

  const onSelectionChange = (): void => {
    if (document.activeElement === textarea) refreshSoon();
  };

  const onResize = (): void => {
    copyMirrorStyles(mirror, textarea);
    refreshSoon();
  };

  textarea.addEventListener('focus', onFocus);
  textarea.addEventListener('blur', onBlur);
  textarea.addEventListener('input', refreshSoon);
  textarea.addEventListener('keyup', refreshSoon);
  textarea.addEventListener('click', refreshSoon);
  textarea.addEventListener('select', refreshSoon);
  textarea.addEventListener('scroll', refreshSoon);
  textarea.addEventListener('compositionend', refreshSoon);
  document.addEventListener('selectionchange', onSelectionChange);
  window.addEventListener('resize', onResize);

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(textarea);
  }

  copyMirrorStyles(mirror, textarea);

  return {
    refresh,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      if (frameId !== null) cancelFrame(frameId);
      resizeObserver?.disconnect();
      textarea.removeEventListener('focus', onFocus);
      textarea.removeEventListener('blur', onBlur);
      textarea.removeEventListener('input', refreshSoon);
      textarea.removeEventListener('keyup', refreshSoon);
      textarea.removeEventListener('click', refreshSoon);
      textarea.removeEventListener('select', refreshSoon);
      textarea.removeEventListener('scroll', refreshSoon);
      textarea.removeEventListener('compositionend', refreshSoon);
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('resize', onResize);
      highlight.remove();
      mirror.remove();
    },
  };
}
