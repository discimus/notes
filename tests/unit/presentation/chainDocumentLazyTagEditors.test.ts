import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  readonly elements = new Set<Element>();
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];

  constructor(
    private readonly callback: IntersectionObserverCallback
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.elements.add(element);
  }

  unobserve(element: Element): void {
    this.elements.delete(element);
  }

  disconnect(): void {
    this.elements.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(element: Element, isIntersecting: boolean): void {
    this.callback(
      [
        {
          target: element,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver
    );
  }
}

function makeTab(): ChainTab {
  const notes: NoteDTO[] = [0, 1].map((index) => ({
    id: `note-${index}`,
    content: `Nota ${index}`,
    chainId: 'chain-1',
    position: index + 1,
    role: 'tail',
    tags: [],
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  }));
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes,
    noteTabs: [],
    activeNoteTabId: null,
    composerCollapsed: true,
    status: 'loaded',
  };
}

describe('Editores de tags sob demanda', () => {
  const originalObserver = globalThis.IntersectionObserver;

  beforeEach(() => {
    document.body.innerHTML = '';
    MockIntersectionObserver.instances = [];
    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalObserver;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('monta apenas os editores de tags próximos da viewport', () => {
    const view = mountChainDocument(makeTab(), {
      initialEditorMode: 'none',
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onAddNoteTag: vi.fn().mockResolvedValue(true),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
    });
    document.body.appendChild(view.element);

    const observer = MockIntersectionObserver.instances.find(
      (instance) => instance.elements.size === 2
    );
    expect(observer).toBeDefined();
    const hosts = [...(observer?.elements ?? [])];
    expect(hosts).toHaveLength(2);
    expect(
      view.element.querySelectorAll('[data-note-tags-host] .tag-editor')
    ).toHaveLength(0);

    if (!observer || !hosts[0]) throw new Error('Observer não inicializado');
    observer.trigger(hosts[0], true);
    expect(
      view.element.querySelectorAll('[data-note-tags-host] .tag-editor')
    ).toHaveLength(1);

    observer.trigger(hosts[0], false);
    expect(
      view.element.querySelectorAll('[data-note-tags-host] .tag-editor')
    ).toHaveLength(0);

    view.destroy();
  });
});
