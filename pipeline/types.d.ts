declare module "*/pipeline/validate.mjs" {
  export const TOTAL_VERSES: number;
  export function verseTable(books: unknown[]): { total: number; bookOf: Uint8Array; chapterStart: number[][] };
  export function validateAll(input: unknown): { errors: string[]; warnings: string[] };
}
declare module "*/pipeline/inputs.mjs" {
  export function loadInputs(): any;
}
