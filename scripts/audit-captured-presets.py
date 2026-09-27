"""Compare existing read-only pedal captures with official parameter IDs."""

import collections
import json
from pathlib import Path
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
MODULES = ['PRE', 'WAH', 'DST', 'AMP', 'NR', 'CAB', 'EQ', 'MOD', 'DLY', 'RVB', 'VOL']


def main():
    """Report model coverage, hidden fields, and values needing interpretation."""
    definitions = {(a.get('Module'), int(a.get('Code'))): a
                   for a in ET.parse(ROOT / 'scripts/algorithm.xml').getroot().findall('.//Alg')}
    parts, presets = {}, {}
    source = ROOT / 'data/steady-power-check.jsonl'
    for line in source.read_text(encoding='utf-8').splitlines():
        row = json.loads(line)
        if row.get('dir') != 'in':
            continue
        try:
            message = bytes.fromhex(row.get('hex', ''))
        except ValueError:
            continue
        if len(message) < 14 or message[8] != 18 or message[9] + 128 * message[10] != 1176:
            continue
        offset = message[11] + 128 * message[12]
        if offset == 0:
            parts = {}
        parts[offset] = bytes(message[i] * 16 + message[i + 1] for i in range(13, len(message) - 1, 2))
        if sum(map(len, parts.values())) == 1176:
            data = b''.join(parts[k] for k in sorted(parts))
            presets.setdefault(data[6], data)

    coverage = collections.Counter()
    gaps = collections.defaultdict(set)
    exceptions = []
    for slot, data in presets.items():
        # These two slots contain earlier diagnostics rather than factory references.
        if slot in [0, 228]:
            continue
        for index, module in enumerate(MODULES):
            at = 120 + index * 72
            code = struct.unpack_from('<I', data, at + 8)[0]
            entry = definitions.get((module, code))
            if entry is None:
                continue
            coverage[(module, entry.get('Name'))] += 1
            ids = {int(float(p.get('ID'))) for p in entry}
            values = struct.unpack_from('<15f', data, at + 12)
            for position in set(range(max(ids) + 1)) - ids:
                gaps[(module, entry.get('Name'), position)].add(values[position])
            for parameter in entry:
                position = int(float(parameter.get('ID')))
                value = values[position]
                if parameter.tag in ['Knob', 'Slider']:
                    low, high = float(parameter.get('Dmin')), float(parameter.get('Dmax'))
                    binding = parameter.get('bind')
                    synced = parameter.get('valueType') == '1' and binding and values[int(binding)] == 1
                    # Older Slapback presets retain the sync bit hidden in current editor XML.
                    legacy_sync = module == 'DLY' and entry.get('Name') == 'Slapback' and position == 1 and values[3] == 1
                    if synced or legacy_sync:
                        continue
                    valid = low <= value <= high
                else:
                    valid = 0 <= value < len(parameter.findall('Menu')) and value == int(value)
                if not valid:
                    exceptions.append(dict(slot=slot, module=module, model=entry.get('Name'),
                                           parameter=parameter.get('Name'), id=position, value=value))
    report = dict(source=str(source.relative_to(ROOT)), captured_presets=len(presets),
                  excluded_diagnostic_slots=[0, 228],
                  coverage=[dict(module=m, model=n, presets=v) for (m, n), v in coverage.items()],
                  out_of_range=exceptions,
                  hidden=[dict(module=m, model=n, id=i, values=sorted(v)) for (m, n, i), v in gaps.items()])
    destination = ROOT / 'data/effect-audit/capture-report.json'
    destination.parent.mkdir(exist_ok=True)
    destination.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'{len(presets)} captured presets; {len(coverage)} model entries represented; {len(exceptions)} unexplained out-of-range controls.')
    print(f'Evidence: {destination}')
    assert not exceptions, 'Investigate out-of-range capture values before accepting this mapping.'


if __name__ == '__main__':
    main()
