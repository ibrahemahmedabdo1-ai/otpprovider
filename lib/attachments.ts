const ALLOWED = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'];
export const MAX_ATTACH = 1024 * 1024;

function sniff(buf: Buffer, mime: string): boolean {
  if (mime === 'image/png') return buf.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  if (mime === 'application/pdf') return buf.slice(0, 4).toString() === '%PDF';
  return !buf.includes(0); // text/plain: no NUL bytes
}

export type Attach = { attachName: string; attachMime: string; attachData: string };

/** Returns undefined when no file, 'BAD' when rejected, otherwise the validated attachment (stored base64). */
export async function saveAttachment(f: FormDataEntryValue | null): Promise<Attach | undefined | 'BAD'> {
  if (!f || typeof f === 'string' || f.size === 0) return undefined;
  if (f.size > MAX_ATTACH || !ALLOWED.includes(f.type)) return 'BAD';
  const buf = Buffer.from(await f.arrayBuffer());
  if (!sniff(buf, f.type)) return 'BAD';
  return { attachName: f.name.replace(/[^\w.\- ]/g, '_').slice(0, 80), attachMime: f.type, attachData: buf.toString('base64') };
}
