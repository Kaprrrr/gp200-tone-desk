import { readFileSync } from 'node:fs';
import { Assembly, unframe } from '../src/midi/protocol.ts';

const path = process.argv[2];
if (!path) throw new Error('Usage: node --experimental-transform-types scripts/decode-capture.mjs LOG.jsonl');
const names = ['PRE', 'WAH', 'DST', 'AMP', 'NR', 'CAB', 'EQ', 'MOD', 'DLY', 'RVB', 'VOL'];
let assembly;
for (const line of readFileSync(path, 'utf8').trim().split('\n')) {
  const row = JSON.parse(line);
  if (row.dir !== 'out') continue;
  const raw = Uint8Array.from(row.hex.split(' ').map((b) => parseInt(b, 16)));
  const part = unframe(raw);
  if (!part) { console.log(row.t, 'special', row.hex); continue; }
  if (part.offset === 0) assembly = new Assembly(part.total);
  // Assembly normally accepts responses; requests use identical framing.
  const response = raw.slice(); response[8] = 0x12;
  const data = assembly?.add(response);
  if (!data) { console.log(row.t, 'chunk', part.command.toString(16), part.offset, '/', part.total); continue; }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  console.log(row.t, part.command === 0x11 ? 'REQUEST' : 'SET', data.length, 'bytes');
  for (let at = 0; at + 4 <= data.length;) {
    const type = view.getUint16(at, true);
    const length = view.getUint16(at + 2, true);
    const body = data.slice(at + 4, at + 4 + length);
    const v = new DataView(body.buffer, body.byteOffset, body.byteLength);
    let detail = Buffer.from(body).toString('hex');
    if (type === 0 && length === 4) detail = `context flag=${v.getUint16(0, true)} slot=${v.getUint16(2, true)}`;
    if (type === 5 && length === 12) detail = `knob ${names[body[0]]} index=${body[1]} spare=${v.getUint16(2, true)} model=0x${v.getUint32(4, true).toString(16)} value=${v.getFloat32(8, true)}`;
    if (type === 0x15 && length === 4) detail = `toggle ${names[body[0]]} enabled=${body[1]} spare=${v.getUint16(2, true)}`;
    if (type === 0x16 && length === 8) detail = `model ${names[body[0]]} model=0x${v.getUint32(4, true).toString(16)}`;
    if (type === 0x2003 && length === 20) detail = `SAVE slot=${v.getUint16(0, true)} name=${new TextDecoder().decode(body.slice(4)).replace(/\0/g, '')}`;
    console.log(' ', at, `type=0x${type.toString(16)}`, `length=${length}`, detail);
    at += 4 + length;
  }
}
