interface SnackbarOptions {
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

/**
 * Serviço de Snackbar MD3.
 * Uso: snackbar.show({ message: 'Nota salva', action: { label: 'Desfazer', onClick: () => ... } })
 */
class SnackbarService {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'snackbar-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(this.container);
  }

  show(options: SnackbarOptions): void {
    const { message, duration = 4000, action } = options;

    if (!this.container.isConnected) {
      this.container.replaceChildren();
      document.body.appendChild(this.container);
    }

    const el = document.createElement('div');
    el.className = 'snackbar';
    el.setAttribute('role', 'status');

    const text = document.createElement('span');
    text.textContent = message;
    el.appendChild(text);

    if (action) {
      const btn = document.createElement('button');
      btn.className = 'snackbar__action';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        action.onClick();
        this.dismiss(el);
      });
      el.appendChild(btn);
    }

    this.container.appendChild(el);

    const timer = setTimeout(() => this.dismiss(el), duration);

    el.addEventListener('click', (e) => {
      if (e.target === el) {
        clearTimeout(timer);
        this.dismiss(el);
      }
    });
  }

  private dismiss(el: HTMLElement): void {
    el.classList.add('snackbar--exiting');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  error(message: string): void {
    this.show({ message, duration: 6000 });
  }

  success(message: string, action?: { label: string; onClick: () => void }): void {
    this.show({ message, duration: 3000, ...(action ? { action } : {}) });
  }
}

export const snackbar = new SnackbarService();
