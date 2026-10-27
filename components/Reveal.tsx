import { getReveal } from '@/lib/reveal';
import { RevealBox } from './Client';
import { clearRevealAction } from '@/app/actions/common';

export function Reveal() {
  const r = getReveal();
  if (!r) return null;
  return <RevealBox title={r.title} value={r.value} note={r.note} clear={clearRevealAction} />;
}
