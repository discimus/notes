import { describe, it, expect } from 'vitest';
import { Note } from '../../../src/domain/entities/Note.js';
import { ValidationError } from '../../../src/shared/types/index.js';

describe('Note', () => {
  const chainId = 'chain-001';

  describe('createHeader', () => {
    it('deve criar um header na posição 0', () => {
      const note = Note.createHeader({ content: 'Minha primeira nota', chainId });
      expect(note.role).toBe('header');
      expect(note.position.value).toBe(0);
      expect(note.position.isHeader()).toBe(true);
      expect(note.chainId).toBe(chainId);
      expect(note.content).toBe('Minha primeira nota');
    });

    it('deve criar header com título', () => {
      const note = Note.createHeader({ content: 'Conteúdo', chainId, title: 'Título explícito' });
      expect(note.title).toBe('Título explícito');
    });

    it('deve lançar erro para conteúdo vazio', () => {
      expect(() => Note.createHeader({ content: '', chainId })).toThrow(ValidationError);
      expect(() => Note.createHeader({ content: '  ', chainId })).toThrow(ValidationError);
    });

    it('deve fazer trim do conteúdo', () => {
      const note = Note.createHeader({ content: '  Conteúdo  ', chainId });
      expect(note.content).toBe('Conteúdo');
    });
  });

  describe('createTail', () => {
    it('deve criar uma tail na posição informada', () => {
      const note = Note.createTail({ content: 'Tail 1', chainId, position: 1 });
      expect(note.role).toBe('tail');
      expect(note.position.value).toBe(1);
    });

    it('deve lançar erro se posição for 0 (header)', () => {
      expect(() => Note.createTail({ content: 'Tail', chainId, position: 0 })).toThrow(ValidationError);
    });

    it('deve lançar erro para conteúdo vazio', () => {
      expect(() => Note.createTail({ content: '', chainId, position: 1 })).toThrow(ValidationError);
    });
  });

  describe('updateContent', () => {
    it('deve atualizar o conteúdo', () => {
      const note = Note.createHeader({ content: 'Original', chainId });
      // Pequena pausa para garantir timestamp diferente
      note.updateContent('Novo conteúdo');
      expect(note.content).toBe('Novo conteúdo');
    });

    it('deve lançar erro para conteúdo vazio ao atualizar', () => {
      const note = Note.createHeader({ content: 'Original', chainId });
      expect(() => note.updateContent('')).toThrow(ValidationError);
    });
  });

  describe('serialização', () => {
    it('deve serializar e reconstituir corretamente', () => {
      const original = Note.createHeader({ content: 'Teste', chainId, title: 'Título' });
      const data = original.toData();
      const restored = Note.reconstitute(data);
      expect(restored.id).toBe(original.id);
      expect(restored.content).toBe(original.content);
      expect(restored.role).toBe('header');
      expect(restored.title).toBe('Título');
    });
  });
});
