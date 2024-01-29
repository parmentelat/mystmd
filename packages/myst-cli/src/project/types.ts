// Types for local Project
//
// Files are local paths relative to the current directory.
// These are autogenerated based on config file

export type PageSlugs = Record<string, number>;

/** Valid heading levels are 1-6 and default behavior only uses these.
 *
 * However -1 and 0 may also be set for part/chapter
 */
export type PageLevels = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type LocalProjectFolder = {
  title: string;
  level: PageLevels;
};

export type LocalProjectPage = {
  file: string;
  slug: string;
  level: PageLevels;
};

export type LocalProject = {
  path: string;
  /** The local path to the local index file. */
  file: string;
  /** The slug that the index get's renamed to for the JSON */
  index: string;
  bibliography: string[];
  pages: (LocalProjectPage | LocalProjectFolder)[];
};
