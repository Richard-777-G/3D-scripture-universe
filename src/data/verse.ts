/**
 * Verse numbering.
 *
 * The app indexes every verse by its position in the Protestant canon
 * (Genesis 1:1 = 0 ... Revelation 22:21 = 31101). The database and pipeline use
 * the handover's stable key: book(1-66)*1,000,000 + chapter*1,000 + verse,
 * so John 3:16 = 43003016. These helpers convert between the two.
 */
export const TOTAL_VERSES = 31102;

export interface Book {
  /** English name */
  n: string;
  /** 0 = Old Testament, 1 = New Testament */
  t: 0 | 1;
  /** verse count per chapter */
  ch: number[];
}

export interface VerseRef {
  /** 1-66 */
  book: number;
  chapter: number;
  verse: number;
}

export class VerseIndex {
  private readonly bookOf: Uint8Array;
  private readonly chapterOf: Uint16Array;
  private readonly chapterStart: number[][];

  constructor(readonly books: Book[]) {
    let total = 0;
    for (const b of books) for (const n of b.ch) total += n;
    if (total !== TOTAL_VERSES) throw new Error(`books add up to ${total} verses, expected ${TOTAL_VERSES}`);
    this.bookOf = new Uint8Array(total);
    this.chapterOf = new Uint16Array(total);
    this.chapterStart = [];
    let v = 0;
    books.forEach((b, bi) => {
      const starts: number[] = [];
      b.ch.forEach((n, ci) => {
        starts.push(v);
        this.bookOf.fill(bi, v, v + n);
        this.chapterOf.fill(ci + 1, v, v + n);
        v += n;
      });
      this.chapterStart.push(starts);
    });
  }

  /** position (0..31101) -> book/chapter/verse, all 1-based */
  ref(index: number): VerseRef {
    if (!Number.isInteger(index) || index < 0 || index >= TOTAL_VERSES) throw new RangeError(`no verse at index ${index}`);
    const b = this.bookOf[index], c = this.chapterOf[index];
    return { book: b + 1, chapter: c, verse: index - this.chapterStart[b][c - 1] + 1 };
  }

  /** book/chapter/verse (1-based) -> position, or null if that verse does not exist */
  index(r: VerseRef): number | null {
    const b = this.books[r.book - 1];
    if (!b || r.chapter < 1 || r.chapter > b.ch.length || r.verse < 1 || r.verse > b.ch[r.chapter - 1]) return null;
    return this.chapterStart[r.book - 1][r.chapter - 1] + r.verse - 1;
  }

  /** position -> stable database key, e.g. John 3:16 -> 43003016 */
  key(index: number): number {
    return verseKey(this.ref(index));
  }

  /** stable database key -> position, or null if that verse does not exist */
  fromKey(key: number): number | null {
    return this.index(parseVerseKey(key));
  }

  label(index: number): string {
    const r = this.ref(index);
    return `${this.books[r.book - 1].n} ${r.chapter}:${r.verse}`;
  }
}

export function verseKey(r: VerseRef): number {
  return r.book * 1_000_000 + r.chapter * 1_000 + r.verse;
}

export function parseVerseKey(key: number): VerseRef {
  return { book: Math.floor(key / 1_000_000), chapter: Math.floor(key / 1_000) % 1_000, verse: key % 1_000 };
}
