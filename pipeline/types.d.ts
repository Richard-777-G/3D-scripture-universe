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
