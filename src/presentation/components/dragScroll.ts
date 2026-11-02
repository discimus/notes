type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  axis: 'x' | 'y' | null;
  moved: boolean;
};

export interface MagneticDragScrollOptions {
  draggingClass: string;
  snapSelector?: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function enableMagneticDragScroll(
  host: HTMLElement,
  options: MagneticDragScrollOptions
): () => void {
  const { draggingClass, snapSelector } = options;
  let drag: DragState | null = null;
  let frame: number | null = null;
  let suppressClick = false;

  const maxScroll = (): number =>
    Math.max(0, host.scrollWidth - host.clientWidth);

  const cancelAnimation = (): void => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };

  const snapPoints = (): number[] => {
    const max = maxScroll();
    const points = new Set<number>([0, max]);
    if (!snapSelector) return [...points];

    const hostRect = host.getBoundingClientRect();
    const style = window.getComputedStyle(host);
    const padding =
      Number.parseFloat(style.paddingInlineStart || style.paddingLeft) || 0;
    const useRects = hostRect.width > 0;

    host.querySelectorAll<HTMLElement>(snapSelector).forEach((child) => {
      let left: number;
      if (useRects) {
        const rect = child.getBoundingClientRect();
        left = host.scrollLeft + rect.left - hostRect.left - padding;
      } else {
        left = child.offsetLeft - padding;
      }
      if (Number.isFinite(left)) {
        points.add(clamp(left, 0, max));
      }
    });

    return [...points].sort((a, b) => a - b);
  };

  const nearestSnapPoint = (position: number): number => {
    const points = snapPoints();
    let nearest = points[0] ?? 0;
    for (const point of points) {
      if (Math.abs(point - position) < Math.abs(nearest - position)) {
        nearest = point;
      }
    }
    return nearest;
  };

  const magnetTo = (target: number, initialVelocity: number): void => {
    cancelAnimation();
    const max = maxScroll();
    const targetLeft = clamp(target, 0, max);
    const finish = (): void => {
      frame = null;
      host.scrollLeft = targetLeft;
      host.classList.remove(draggingClass);
    };

    if (prefersReducedMotion()) {
      finish();
      return;
    }

    host.classList.add(draggingClass);
    let position = host.scrollLeft;
    let velocity = clamp(-initialVelocity * 1000, -2500, 2500);
    let lastFrame: number | null = null;

    const step = (now: number): void => {
      if (!host.isConnected) {
        finish();
        return;
      }
      if (lastFrame === null) lastFrame = now;
      const elapsed = Math.min(32, Math.max(1, now - lastFrame)) / 1000;
      lastFrame = now;

      const acceleration = -170 * (position - targetLeft) - 22 * velocity;
      velocity += acceleration * elapsed;
      position = clamp(position + velocity * elapsed, 0, max);
      host.scrollLeft = position;

      if (Math.abs(position - targetLeft) < 0.4 && Math.abs(velocity) < 8) {
        finish();
        return;
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
  };

  const endDrag = (magnet: boolean): void => {
    if (!drag) return;
    const state = drag;
    drag = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    if (state.moved) {
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 0);

      if (magnet) {
        const projected = host.scrollLeft - state.velocity * 180;
        magnetTo(nearestSnapPoint(projected), state.velocity);
      } else {
        host.classList.remove(draggingClass);
      }
      return;
    }

    host.classList.remove(draggingClass);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const now = performance.now();

    if (drag.axis === null) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.axis = 'y';
        endDrag(false);
        return;
      }
      drag.axis = 'x';
      drag.lastX = event.clientX;
      drag.lastTime = now;
      drag.velocity = 0;
      host.classList.add(draggingClass);
    } else {
      const elapsed = Math.max(1, now - drag.lastTime);
      const instantVelocity = (event.clientX - drag.lastX) / elapsed;
      drag.velocity = drag.velocity * 0.55 + instantVelocity * 0.45;
      drag.lastX = event.clientX;
      drag.lastTime = now;
    }

    event.preventDefault();
    drag.moved = true;
    host.scrollLeft = clamp(
      drag.startScrollLeft - dx,
      0,
      maxScroll()
    );
  };

  const onPointerUp = (): void => {
    endDrag(true);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (
      drag ||
      event.button !== 0 ||
      event.pointerType === 'touch' ||
      host.scrollWidth <= host.clientWidth + 1
    ) {
      return;
    }

    cancelAnimation();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: host.scrollLeft,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      axis: null,
      moved: false,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const onDragStart = (event: DragEvent): void => {
    event.preventDefault();
  };

  const onClickCapture = (event: MouseEvent): void => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
  };

  host.addEventListener('pointerdown', onPointerDown);
  host.addEventListener('dragstart', onDragStart);
  host.addEventListener('click', onClickCapture, true);

  return () => {
    cancelAnimation();
    drag = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    host.removeEventListener('pointerdown', onPointerDown);
    host.removeEventListener('dragstart', onDragStart);
    host.removeEventListener('click', onClickCapture, true);
    host.classList.remove(draggingClass);
  };
}
