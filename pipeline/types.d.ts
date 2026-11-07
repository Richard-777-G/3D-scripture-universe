declare module "*/pipeline/validate.mjs" {
  export const TOTAL_VERSES: number;
  export function verseTable(books: unknown[]): { total: number; bookOf: Uint8Array; chapterStart: number[][] };
  export function validateAll(input: unknown): { errors: string[]; warnings: string[] };
}
declare module "*/pipeline/inputs.mjs" {
  export function loadInputs(): any;
}
declare module "*/pipeline/evidence-centre.mjs" {
  export const PILLARS: string[];
  export function loadEvidenceCentre(): any;
  export function parseRef(ref: string, books: unknown[]): [number, number] | null;
  export function validateEvidenceCentre(ec: unknown, ctx: { books: unknown[]; evidence: unknown[] }): { errors: string[]; warnings: string[] };
}
declare module "*/pipeline/connections.mjs" {
  export const TIER: { sourced: number; quotation: number; wording: number };
  export function judge(ot: [number, number], nt: [number, number], texts: string[][], df: Map<string, number>): { tier: number; words: string[] };
  export function documentFrequency(verses: string[]): Map<string, number>;
}
declare module "*/pipeline/geo.mjs" {
  export function routeTitle(file: string): { num: number; title: string };
  export function clipRing(ring: [number, number][]): [number, number][];
  export function band(score: number): "known" | "likely" | "debated";
}
