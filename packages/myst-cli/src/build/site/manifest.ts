import fs from 'fs';
import path from 'path';
import type { SiteAction, SiteManifest, SiteTemplateOptions } from 'myst-config';
import { ExportFormats, PROJECT_FRONTMATTER_KEYS, SITE_FRONTMATTER_KEYS } from 'myst-frontmatter';
import { TemplateOptionTypes } from 'myst-templates';
import { filterKeys } from 'simple-validators';
import type { ISession } from '../../session/types';
import type { RootState } from '../../store';
import { selectors } from '../../store';
import { hashAndCopyStaticFile } from '../../utils';
import type { ExportWithOutput } from '../types';
import { collectExportOptions } from '../utils';
import { getJtex } from './template';

async function resolvePageExports(session: ISession, file: string, projectPath: string) {
  const exports = (
    await collectExportOptions(
      session,
      [file],
      [ExportFormats.docx, ExportFormats.pdf, ExportFormats.tex],
      { projectPath },
    )
  )
    .filter((exp) => {
      return ['.docx', '.pdf', '.zip'].includes(path.extname(exp.output));
    })
    .filter((exp) => {
      return fs.existsSync(exp.output);
    }) as ExportWithOutput[];
  exports.forEach((exp) => {
    const fileHash = hashAndCopyStaticFile(session, exp.output, session.publicPath());
    exp.output = `/${fileHash}`;
    delete exp.$file;
  });
  return exports;
}

/**
 * Convert local project representation to site manifest project
 *
 * This does a couple things:
 * - Adds projectSlug (which locally comes from site config)
 * - Removes any local file references
 * - Adds validated frontmatter
 */
export async function localToManifestProject(
  session: ISession,
  projectPath: string,
  projectSlug: string,
) {
  const state = session.store.getState();
  const projConfig = selectors.selectLocalProjectConfig(state, projectPath);
  const proj = selectors.selectLocalProject(state, projectPath);
  if (!proj || !projConfig) return null;
  // Update all of the page title to the frontmatter title
  const { index, file } = proj;
  const indexExports = await resolvePageExports(session, file, projectPath);
  const projectTitle =
    projConfig?.title || selectors.selectFileInfo(state, proj.file).title || proj.index;
  const pages = await Promise.all(
    proj.pages.map(async (page) => {
      if ('file' in page) {
        const fileInfo = selectors.selectFileInfo(state, page.file);
        const title = fileInfo.title || page.slug;
        const description = fileInfo.description ?? '';
        const thumbnail = fileInfo.thumbnail ?? '';
        const thumbnailOptimized = fileInfo.thumbnailOptimized ?? '';
        const date = fileInfo.date ?? '';
        const tags = fileInfo.tags ?? [];
        const { slug, level } = page;
        const exports = await resolvePageExports(session, page.file, projectPath);
        const projectPage = {
          slug,
          title,
          description,
          date,
          thumbnail,
          thumbnailOptimized,
          tags,
          level,
          exports,
        };
        return projectPage;
      }
      return { ...page };
    }),
  );
  const projFrontmatter = filterKeys(projConfig, PROJECT_FRONTMATTER_KEYS);
  return {
    ...projFrontmatter,
    bibliography: projFrontmatter.bibliography || [],
    title: projectTitle || 'Untitled',
    slug: projectSlug,
    index,
    exports: indexExports,
    pages,
  };
}

async function resolveTemplateFileOptions(session: ISession, options: SiteTemplateOptions) {
  const jtex = await getJtex(session);
  const resolvedOptions = { ...options };
  jtex.getValidatedTemplateYml().options?.forEach((option) => {
    if (option.type === TemplateOptionTypes.file && options[option.id]) {
      const fileHash = hashAndCopyStaticFile(session, options[option.id], session.publicPath());
      resolvedOptions[option.id] = `/${fileHash}`;
    }
  });
  return resolvedOptions;
}

function resolveSiteManifestAction(session: ISession, action: SiteAction): SiteAction {
  if (!action.static || !action.url) return { ...action };
  if (!fs.existsSync(action.url))
    throw new Error(`Could not find static resource at "${action.url}". See 'config.site.actions'`);
  const fileHash = hashAndCopyStaticFile(session, action.url, session.publicPath());
  return {
    title: action.title,
    url: `/${fileHash}`,
    static: true,
  };
}

/**
 * Build site manifest from local curvenote state
 *
 * Site manifest acts as the configuration to build the website.
 * It combines local site config and project configs into a single structure.
 */
export async function getSiteManifest(session: ISession): Promise<SiteManifest> {
  const siteProjects: SiteManifest['projects'] = [];
  const state = session.store.getState() as RootState;
  const siteConfig = selectors.selectCurrentSiteConfig(state);
  if (!siteConfig) throw Error('no site config defined');
  await Promise.all(
    siteConfig.projects?.map(async (siteProj) => {
      if (!siteProj.path) return;
      const proj = await localToManifestProject(session, siteProj.path, siteProj.slug);
      if (!proj) return;
      siteProjects.push(proj);
    }) || [],
  );
  const { nav } = siteConfig;
  const actions = siteConfig.actions?.map((action) => resolveSiteManifestAction(session, action));
  const siteFrontmatter = filterKeys(siteConfig as Record<string, any>, SITE_FRONTMATTER_KEYS);
  const siteTemplateOptions = selectors.selectCurrentSiteTemplateOptions(state) || {};
  const jtex = await getJtex(session);
  const siteConfigFile = selectors.selectCurrentSiteFile(state);
  const validatedOptions = jtex.validateOptions(siteTemplateOptions, siteConfigFile);
  const validatedFrontmatter = jtex.validateDoc(
    siteFrontmatter,
    validatedOptions,
    undefined,
    siteConfigFile,
  );
  const resolvedOptions = await resolveTemplateFileOptions(session, validatedOptions);
  const manifest: SiteManifest = {
    ...validatedFrontmatter,
    ...resolvedOptions,
    myst: 'v1',
    nav: nav || [],
    actions: actions || [],
    projects: siteProjects,
  };
  return manifest;
}
