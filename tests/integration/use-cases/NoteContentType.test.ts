import { beforeEach, describe, expect, it } from 'vitest';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { UpdateNoteContent } from '@application/use-cases/UpdateNoteContent.js';
import { GetChainDetails } from '@application/use-cases/GetChainDetails.js';
import { GetTimelinePage } from '@application/use-cases/GetTimelinePage.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('Note content type use cases', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('cria header de código preservando whitespace', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const content = '  const answer = 42;\n';

    const chain = await create.execute({ content, contentType: 'code' });

    expect(chain.notes[0]?.contentType).toBe('code');
    expect(chain.notes[0]?.content).toBe(content);
  });

  it('anexa tail de código e atualiza tipo e conteúdo', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const update = new UpdateNoteContent(chainRepo);
    const details = new GetChainDetails(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Header' });
    const code = 'if (ready) {\n  run();\n}';
    const tail = await append.execute({
      chainId: chain.id,
      content: code,
      contentType: 'code',
    });

    expect(tail.contentType).toBe('code');
    expect(tail.content).toBe(code);

    const updated = await update.execute({
      chainId: chain.id,
      noteId: tail.id,
      content: `${code}\n`,
      contentType: 'code',
    });

    expect(updated.contentType).toBe('code');
    expect(updated.content.endsWith('\n')).toBe(true);

    const loaded = await details.execute(chain.id);
    expect(loaded.notes.find((note) => note.id === tail.id)?.contentType).toBe('code');

    const timeline = await new GetTimelinePage(chainRepo, tagRepo).execute({
      chainIds: [chain.id],
      offset: 0,
      limit: 50,
    });
    expect(timeline.entries.find((entry) => entry.note.id === tail.id)?.note.contentType).toBe(
      'code'
    );
  });
});
