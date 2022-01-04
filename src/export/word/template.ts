import * as fs from 'fs';
import { DocxSerializerState, writeDocx } from 'prosemirror-docx';
import pkgpath from '../../pkgpath';
import { Block, User, Version } from '../../models';
import { Session } from '../../session';
import { getNodesAndMarks } from './schema';
import { ArticleState } from '../utils';
import { createArticleTitle } from './titles';
import { createSingleDocument } from './utils';

export interface WordOptions {
  filename: string;
  [key: string]: any;
}

export interface LoadedArticle {
  session: Session;
  user: User;
  buffers: Record<string, Buffer>;
  block: Block;
  version: Version;
  article: ArticleState;
  opts: WordOptions;
}

// TODO: maybe move writing out?
export async function writeDefaultTemplate(data: LoadedArticle) {
  const { session, user, buffers, block, version, article, opts } = data;

  const { nodes, marks } = getNodesAndMarks();

  const docxState = new DocxSerializerState(nodes, marks, {
    getImageBuffer(key: string) {
      if (!buffers[key]) throw new Error('Could not decode image from oxa link');
      return buffers[key];
    },
  });

  // Add the title
  docxState.renderContent(await createArticleTitle(session, block.data));
  // Then render each block
  article.children.forEach(({ state }) => {
    if (!state) return;
    docxState.renderContent(state.doc);
  });

  // TODO: this could come from an existing word doc
  const styles = fs.readFileSync(pkgpath('styles/simple.xml'), 'utf-8');

  const doc = createSingleDocument(docxState, {
    title: block.data.title,
    description: block.data.description,
    revision: version.id.version ?? 1,
    creator: `${user.data.display_name} on https://curvenote.com`,
    lastModifiedBy: `${user.data.display_name} (@${user.data.username})`,
    keywords: block.data.tags.join(', '),
    externalStyles: styles,
  });

  await writeDocx(doc, (buffer) => {
    fs.writeFileSync(opts.filename, buffer);
  });
}
