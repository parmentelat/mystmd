import { z } from 'zod';

import { defined } from './utils.js';
const TOCTreeOptions = z
  .object({
    caption: z.string(),
    hidden: z.boolean(),
    maxdepth: z.number(),
    numberted: z.boolean(),
    reversed: z.boolean(),
    titlesonly: z.boolean(),
  })
  .partial();

const FileEntry = z.object({
  file: z.string(),
  title: z.string().optional(),
});

const URLEntry = z.object({
  url: z.string(),
  title: z.string().optional(),
});

const GlobEntry = z.object({
  glob: z.string(),
});

/** Basic TOC Trees **/
type NoFormatSubtreeType = z.infer<typeof TOCTreeOptions> & {
  entries: z.infer<typeof NoFormatEntry>[];
};
const NoFormatSubtree: z.ZodType<NoFormatSubtreeType> = TOCTreeOptions.extend({
  entries: z.lazy(() => NoFormatEntry.array()),
});

type NoFormatShorthandSubtreeType = {
  entries: z.infer<typeof NoFormatEntry>[];
  options?: z.infer<typeof TOCTreeOptions>;
};
const NoFormatShorthandSubtree: z.ZodType<NoFormatShorthandSubtreeType> = z.object({
  entries: z.lazy(() => NoFormatEntry.array()),
  options: TOCTreeOptions.optional(),
});

const NoFormatHasSubtrees = z.object({
  subtrees: NoFormatSubtree.array(),
});

const NoFormatEntry = z.union([
  FileEntry.and(NoFormatShorthandSubtree),
  FileEntry.merge(NoFormatHasSubtrees),
  FileEntry,
  URLEntry,
  GlobEntry,
]);

const NoFormatTOCBase = z.object({
  root: z.string(),
  defaults: TOCTreeOptions.optional(),
});

const NoFormatTOC = z.union([
  NoFormatTOCBase.and(NoFormatShorthandSubtree),
  NoFormatTOCBase.merge(NoFormatHasSubtrees).strict(),
  NoFormatTOCBase.strict(),
]);

/** Article format **/
type ArticleSubtreeType = z.infer<typeof TOCTreeOptions> & {
  sections: z.infer<typeof ArticleEntry>[];
};
const ArticleSubtree: z.ZodType<ArticleSubtreeType> = TOCTreeOptions.extend({
  sections: z.lazy(() => ArticleEntry.array()),
});

type ArticleShorthandSubtreeType = {
  sections: z.infer<typeof ArticleEntry>[];
  options?: z.infer<typeof TOCTreeOptions>;
};
const ArticleShorthandSubtree: z.ZodType<ArticleShorthandSubtreeType> = z.object({
  sections: z.lazy(() => ArticleEntry.array()),
  options: TOCTreeOptions.optional(),
});

const ArticleHasSubtrees = z.object({
  subtrees: ArticleSubtree.array(),
});

const ArticleEntry = z.union([
  FileEntry.and(ArticleShorthandSubtree),
  FileEntry.merge(ArticleHasSubtrees),
  FileEntry,
  URLEntry,
  GlobEntry,
]);

const ArticleTOCBase = z.object({
  root: z.string(),
  format: z.literal('jb-article'),
  defaults: TOCTreeOptions.optional(),
});

const ArticleTOC = z.union([
  ArticleTOCBase.and(ArticleShorthandSubtree),
  ArticleTOCBase.merge(ArticleHasSubtrees).strict(),
  ArticleTOCBase.strict(),
]);

/** Book format **/
type BookOuterSubtreeType = z.infer<typeof TOCTreeOptions> & {
  chapters: z.infer<typeof BookEntry>[];
};
const BookOuterSubtree: z.ZodType<BookOuterSubtreeType> = TOCTreeOptions.extend({
  chapters: z.lazy(() => BookEntry.array()),
});

type BookInnerSubtreeType = z.infer<typeof TOCTreeOptions> & {
  sections: z.infer<typeof BookEntry>[];
};
const BookInnerSubtree: z.ZodType<BookInnerSubtreeType> = TOCTreeOptions.extend({
  sections: z.lazy(() => BookEntry.array()),
});

type BookShorthandOuterSubtreeType = {
  chapters: z.infer<typeof BookEntry>[];
  options?: z.infer<typeof TOCTreeOptions>;
};
const BookShorthandOuterSubtree: z.ZodType<BookShorthandOuterSubtreeType> = z.object({
  chapters: z.lazy(() => BookEntry.array()),
  options: TOCTreeOptions.optional(),
});

type BookShorthandInnerSubtreeType = {
  sections: z.infer<typeof BookEntry>[];
  options?: z.infer<typeof TOCTreeOptions>;
};
const BookShorthandInnerSubtree: z.ZodType<BookShorthandInnerSubtreeType> = z.object({
  sections: z.lazy(() => BookEntry.array()),
  options: TOCTreeOptions.optional(),
});

const BookHasOuterSubtrees = z.object({
  parts: BookOuterSubtree.array(),
});

const BookHasInnerSubtrees = z.object({
  subtrees: BookInnerSubtree.array(),
});

const BookEntry = z.union([
  FileEntry.and(BookShorthandInnerSubtree),
  FileEntry.merge(BookHasInnerSubtrees),
  FileEntry,
  URLEntry,
  GlobEntry,
]);

const BookTOCBase = z.object({
  root: z.string(),
  format: z.literal('jb-book'),
  defaults: TOCTreeOptions.optional(),
});

const BookTOC = z.union([
  BookTOCBase.and(BookShorthandOuterSubtree),
  BookTOCBase.merge(BookHasOuterSubtrees).strict(),
  ArticleTOCBase.strict(),
]);

/** TOC **/
const SphinxExternalTOC = z.union([ArticleTOC, BookTOC, NoFormatTOC]);

export type SphinxExternalTOC = z.infer<typeof SphinxExternalTOC>;
export function validateSphinxExternalTOC(toc: unknown): SphinxExternalTOC | undefined {
  const result = SphinxExternalTOC.safeParse(toc);
  if (!result.success) {
    console.error(result.error);
    return undefined;
  } else {
    return result.data;
  }
}

export function upgradeTOC(data: SphinxExternalTOC) {}
