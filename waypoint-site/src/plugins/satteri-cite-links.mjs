/**
 * Link every citation chip to the sources[] entry that backs it (STYLE-GUIDE
 * §3: "The chip renders as a link to that URL").
 *
 * Done in the Markdown pipeline rather than in Cite.astro because a third of
 * the site's chips are authored as raw <span class="cite"> rather than <Cite>,
 * and both spellings have to behave the same for a reader. MDX parses both as
 * JSX elements, so one visitor pair catches every chip on the page.
 *
 * A chip whose page lists no matching source is LEFT ALONE — plain text, no
 * href. That mirrors the app's Citation component, which degrades to inert
 * text on a citation the provenance registry doesn't cover. A dead anchor, or
 * a link to a neighbouring statute, is worse than no link at all: this page
 * tells parents what the law entitles their child to.
 */
import { parse as parseYaml } from 'yaml';
import { findSource, sourceAnchorId } from '../lib/citations.ts';

/** sources[] for the document being compiled, read from its own frontmatter. */
function sourcesFor(ctx) {
  const fromData = ctx?.data?.astro?.frontmatter?.sources ?? ctx?.data?.frontmatter?.sources;
  if (Array.isArray(fromData)) return fromData;

  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(ctx?.source ?? '');
  if (!m) return [];
  try {
    const fm = parseYaml(m[1]);
    return Array.isArray(fm?.sources) ? fm.sources : [];
  } catch {
    // Malformed frontmatter is the schema's problem to report, not ours to
    // guess around; no sources simply means no chip gets linked here.
    return [];
  }
}

const attr = (node, name) => {
  const a = node.attributes?.find((x) => x.type === 'mdxJsxAttribute' && x.name === name);
  return typeof a?.value === 'string' ? a.value : null;
};

function isCiteChip(node) {
  if (node.name === 'Cite') return true;
  if (node.name !== 'span') return false;
  const cls = attr(node, 'class') ?? attr(node, 'className');
  return !!cls && cls.split(/\s+/).includes('cite');
}

/** The chip's visible text, when it is a single plain string. */
function chipText(node) {
  if (node.children?.length !== 1) return null;
  const only = node.children[0];
  return only?.type === 'text' ? only.value.trim() : null;
}

export default function citeLinks(ctx) {
  const sources = sourcesFor(ctx);
  if (sources.length === 0) return null; // nothing to link to on this page

  const link = (node, ctx) => {
    if (!isCiteChip(node)) return;
    const text = chipText(node);
    if (!text) return;
    if (!findSource(text, sources)) return; // unmatched: stays plain text

    const href = `#${sourceAnchorId(text)}`;
    const attrOf = (name, value) => ({ type: 'mdxJsxAttribute', name, value });

    // Sätteri hands the visitor a readonly view — mutating node.attributes in
    // place compiles silently and changes nothing. Every edit goes through
    // ctx.replaceNode.
    if (node.name === 'Cite') {
      // Cite.astro renders an <a> once it is handed an href.
      ctx.replaceNode(node, {
        ...node,
        attributes: [...(node.attributes ?? []), attrOf('href', href)],
      });
      return;
    }

    // Raw <span class="cite"> becomes the anchor itself, keeping .cite so the
    // chip looks identical however it was authored.
    ctx.replaceNode(node, {
      ...node,
      name: 'a',
      attributes: [
        ...(node.attributes ?? []).filter(
          (a) => !(a.type === 'mdxJsxAttribute' && (a.name === 'class' || a.name === 'className'))
        ),
        attrOf('class', 'cite cite-link'),
        attrOf('href', href),
      ],
    });
  };

  return {
    name: 'waypoint-cite-links',
    mdxJsxTextElement: link,
    mdxJsxFlowElement: link,
  };
}
