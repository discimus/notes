import { beforeEach, describe, expect, it } from 'vitest';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { ImportTextFile } from '@application/use-cases/ImportTextFile.js';
import { ImportTextFolder } from '@application/use-cases/ImportTextFolder.js';
import { ImportTextNote } from '@application/use-cases/ImportTextNote.js';
import { ImportTextNotes } from '@application/use-cases/ImportTextNotes.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('Importacao com tipo de arquivo', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  async function createChain(): Promise<string> {
    const chain = await new CreateChainWithHeader(chainRepo, tagRepo).execute({
      content: 'Header',
    });
    return chain.id;
  }

  it('atribui markdown ao importar arquivo .md preservando o conteudo', async () => {
    const chainId = await createChain();
    const content = '# Titulo\n\n  - item\n';

    const result = await new ImportTextFile(chainRepo).execute({
      chainId,
      content,
      sourceFileName: 'README.md',
    });

    expect(result.duplicate).toBe(false);
    expect(result.note?.contentType).toBe('markdown');
    expect(result.note?.content).toBe(content);

    const stored = await chainRepo.findById(chainId);
    expect(
      stored?.notes.find((note) => note.sourceFileName === 'README.md')
        ?.contentType
    ).toBe('markdown');
  });

  it('mantem texto ao importar arquivo .txt', async () => {
    const chainId = await createChain();

    const result = await new ImportTextFile(chainRepo).execute({
      chainId,
      content: '  Documento de texto\n',
      sourceFileName: 'nota.txt',
    });

    expect(result.note?.contentType).toBe('text');
    expect(result.note?.content).toBe('Documento de texto');
  });

  it('identifica markdown em ImportTextNote sem diferenciar maiusculas', async () => {
    const chainId = await createChain();
    const content = '# Guia\n';

    const note = await new ImportTextNote(chainRepo).execute({
      chainId,
      content,
      sourceFileName: 'GUIA.MD',
    });

    expect(note.contentType).toBe('markdown');
    expect(note.content).toBe(content);
  });

  it('identifica o tipo de cada documento no lote do ImportTextNotes', async () => {
    const chainId = await createChain();

    const notes = await new ImportTextNotes(chainRepo).execute({
      chainId,
      documents: [
        { content: '# Markdown', sourceFileName: 'a.md' },
        { content: 'Texto', sourceFileName: 'b.txt' },
        { content: '## Outro', sourceFileName: 'c.markdown' },
      ],
    });

    expect(notes.map((note) => note.contentType)).toEqual([
      'markdown',
      'text',
      'markdown',
    ]);
  });

  it('identifica o tipo de cada arquivo ao criar colecao por pasta', async () => {
    const result = await new ImportTextFolder(chainRepo).execute({
      title: 'Documentos',
      documents: [
        { content: '# Markdown\n', sourceFileName: 'a.md' },
        { content: 'Texto', sourceFileName: 'b.txt' },
        { content: '## Outro\n', sourceFileName: 'c.markdown' },
      ],
    });

    expect(result.status).toBe('created');
    if (result.status !== 'created') return;

    expect(result.notes.map((note) => note.contentType)).toEqual([
      'markdown',
      'text',
      'markdown',
    ]);
  });
});
