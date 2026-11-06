/**
 * Loads the versioned data packs written by pipeline/build-packs.mjs.
 *
 * data/manifest.json is always fetched fresh. It names each pack with a content
 * hash, so pack files can be cached for ever and a new download happens only
 * when the data really changes.
 */
import type { Book } from "./verse";

export interface PackFile {
  file: string;
  bytes: number;
}

export interface Manifest {
  version: string;
  schema: number;
  built: string;
  files: Record<string, PackFile>;
}

export interface Journeys {
  sources: { id: number; name: string; url: string }[];
  meta: { id: string; name: string; color: string; blurb: string }[];
  items: unknown[];
  jv: Record<string, string>;
}

export interface Core {
  books: Book[];
  th: number[];
  aud: unknown;
  xrefs: { fv: number[]; ts: number[]; te: number[]; vo: number[]; d: number[] };
  vn: number[];
}

/** Shape the v16 app code expects from its old embedded `D` constant. */
export interface LegacyCore {
  books: Book[];
  th: number[];
  aud: unknown;
  fv: number[];
  ts: number[];
  te: number[];
  vo: number[];
  d: number[];
  vn: number[];
  vt: string[];
  J: Journeys;
}

export interface Dataset {
  version: string;
  core: LegacyCore;
  /** KJV, one string per verse, indexed 0..31101 */
  kjv: string[];
  story: unknown[];
  evidence: unknown[];
  qa: unknown[];
  sources: unknown[];
  /** lazily loaded packs (other versions, words, lexicons): key -> URL */
  assets: Record<string, string>;
}

const STARTUP_PACKS = ["core", "kjv", "journeys", "story", "evidence", "qa", "sources"] as const;

export class DataLoadError extends Error {}

async function get(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new DataLoadError(`Could not reach ${url}`);
  }
  if (!res.ok) throw new DataLoadError(`${url} returned HTTP ${res.status}`);
  return res;
}

export async function loadDataset(base = import.meta.env.BASE_URL + "data/"): Promise<Dataset> {
  const manifest: Manifest = await (await get(base + "manifest.json", { cache: "no-cache" })).json();
  for (const k of STARTUP_PACKS) if (!manifest.files[k]) throw new DataLoadError(`manifest has no ${k} pack`);
  const url = (k: string) => base + manifest.files[k].file;

  const [core, kjvText, journeys, story, evidence, qa, sources] = await Promise.all([
    get(url("core")).then((r) => r.json() as Promise<Core>),
    get(url("kjv")).then((r) => r.text()),
    get(url("journeys")).then((r) => r.json() as Promise<Journeys>),
    get(url("story")).then((r) => r.json()),
    get(url("evidence")).then((r) => r.json()),
    get(url("qa")).then((r) => r.json()),
    get(url("sources")).then((r) => r.json()),
  ]);

  const kjv = kjvText.split("\n");
  const assets: Record<string, string> = {};
  for (const k of Object.keys(manifest.files)) if (!(STARTUP_PACKS as readonly string[]).includes(k)) assets[k] = url(k);

  return {
    version: manifest.version,
    core: { ...core, ...core.xrefs, vt: core.vn.map((v) => kjv[v]), J: journeys },
    kjv,
    story,
    evidence,
    qa,
    sources,
    assets,
  };
}
