import { describe, it, expect } from 'vitest';
import { Chain } from '../../../src/domain/entities/Chain.js';
import { Note } from '../../../src/domain/entities/Note.js';
import { InvariantViolationError, ValidationError } from '../../../src/shared/types/index.js';

describe('Chain', () => {
  describe('createWithHeader', () => {
    it('deve criar cadeia com header válido', () => {
      const { chain, header } = Chain.createWithHeader({ content: 'Minha ideia inicial' });
      expect(chain.id).toBeTruthy();
      expect(chain.headerNoteId).toBe(header.id);
      expect(header.role).toBe('header');
      expect(header.position.value).toBe(0);
      expect(chain.notes).toHaveLength(1);
    });

    it('deve criar cadeia com título', () => {
      const { chain } = Chain.createWithHeader({ content: 'Conteúdo', title: 'Meu Projeto' });
      expect(chain.title).toBe('Meu Projeto');
      expect(chain.displayTitle).toBe('Meu Projeto');
    });

    it('deve lançar erro para conteúdo vazio', () => {
      expect(() => Chain.createWithHeader({ content: '' })).toThrow(ValidationError);
    });

    it('deve exibir prévia do conteúdo quando não há título', () => {
      const { chain } = Chain.createWithHeader({ content: 'Conteúdo da nota inicial' });
      expect(chain.displayTitle).toContain('Conteúdo da nota inicial');
    });
  });

  describe('appendNote (invariantes)', () => {
    it('deve anexar tail ao final com posição correta', () => {
      const { chain } = Chain.createWithHeader({ content: 'Header' });
      const tail1 = chain.appendNote('Tail 1');
      const tail2 = chain.appendNote('Tail 2');
      expect(tail1.role).toBe('tail');
      expect(tail1.position.value).toBe(1);
      expect(tail2.position.value).toBe(2);
      expect(chain.notes).toHaveLength(3);
    });

    it('deve manter ordem determinística', () => {
      const { chain } = Chain.createWithHeader({ content: 'Header' });
      chain.appendNote('Tail A');
      chain.appendNote('Tail B');
      chain.appendNote('Tail C');
      const positions = chain.notes.map((n) => n.position.value);
      expect(positions).toEqual([0, 1, 2, 3]);
    });

    it('deve lançar erro ao anexar em cadeia arquivada', () => {
      const { chain } = Chain.createWithHeader({ content: 'Header' });
      chain.archive();
      expect(() => chain.appendNote('Nova tail')).toThrow(InvariantViolationError);
    });

    it('deve lançar erro ao anexar em cadeia excluída', () => {
      const { chain } = Chain.createWithHeader({ content: 'Header' });
      chain.softDelete();
      expect(() => chain.appendNote('Nova tail')).toThrow(InvariantViolationError);
    });
  });

  describe('invariante: exatamente um header', () => {
    it('deve lançar erro ao reconstituir com dois headers', () => {
      const { chain, header } = Chain.createWithHeader({ content: 'H1' });
      const secondHeader = Note.createHeader({ content: 'H2', chainId: chain.id });
      expect(() =>
        Chain.reconstitute(chain.toData(), [header, secondHeader])
      ).toThrow(InvariantViolationError);
    });

    it('deve lançar erro ao reconstituir sem headers (mas com notas)', () => {
      const { chain } = Chain.createWithHeader({ content: 'H1' });
      const tail = Note.createTail({ content: 'Tail', chainId: chain.id, position: 1 });
      expect(() =>
        Chain.reconstitute(chain.toData(), [tail])
      ).toThrow(InvariantViolationError);
    });
  });

  describe('archive / restore / delete', () => {
    it('deve arquivar e restaurar', () => {
      const { chain } = Chain.createWithHeader({ content: 'Header' });
      expect(chain.isArchived()).toBe(false);
      chain.archive();
      expect(chain.isArchived()).toBe(true);
      expect(chain.archivedAt).toBeTruthy();
      chain.restore();
      expect(chain.isArchived()).toBe(false);
    });

    it('deve soft delete', () => {
      const { chain } = Chain.createWithHeader({ content: 'Header' });
      chain.softDelete();
      expect(chain.isDeleted()).toBe(true);
    });

    it('deve lançar erro ao arquivar cadeia excluída', () => {
      const { chain } = Chain.createWithHeader({ content: 'Header' });
      chain.softDelete();
      expect(() => chain.archive()).toThrow(InvariantViolationError);
    });
  });

  describe('serialização', () => {
    it('deve serializar e reconstituir corretamente', () => {
      const { chain, header } = Chain.createWithHeader({ content: 'Teste', title: 'Título' });
      const tail = chain.appendNote('Tail 1');
      const data = chain.toData();
      const notesData = [header, tail].map((n) => Note.reconstitute(n.toData()));
      const restored = Chain.reconstitute(data, notesData);
      expect(restored.id).toBe(chain.id);
      expect(restored.title).toBe('Título');
      expect(restored.notes).toHaveLength(2);
      expect(restored.notes[0]!.role).toBe('header');
      expect(restored.notes[1]!.role).toBe('tail');
    });
  });
});
