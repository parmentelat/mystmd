import type { Jupytext } from '../jupytext/types.js';
import type { KernelSpec } from '../kernelspec/types.js';
import type { ProjectAndPageFrontmatter } from '../project/types.js';
import { PROJECT_AND_PAGE_FRONTMATTER_KEYS } from '../project/types.js';

export const PAGE_KNOWN_PARTS = [
  'abstract',
  'summary',
  'keypoints',
  'dedication',
  'epigraph',
  'data_availability',
  'acknowledgments',
];

export const PAGE_FRONTMATTER_KEYS = [
  ...PROJECT_AND_PAGE_FRONTMATTER_KEYS,
  // These keys only exist on the page
  'kernelspec',
  'jupytext',
  'tags',
  'parts',
  'content_includes_title',
  ...PAGE_KNOWN_PARTS,
];

export type PageFrontmatter = ProjectAndPageFrontmatter & {
  kernelspec?: KernelSpec;
  jupytext?: Jupytext;
  tags?: string[];
  parts?: Record<string, string[]>;
  /** Flag if frontmatter title is duplicated in content
   *
   * Set during initial file/frontmatter load
   */
  content_includes_title?: boolean;
};
