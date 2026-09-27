"""Audit every encoder parameter against independently parsed official XML.

Build only local test files, without connecting to or changing the pedal.
"""

import base64
import collections
import hashlib
import html
import json
from pathlib import Path
import re
import struct
import subprocess
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent.parent
MODULES = ['PRE', 'WAH', 'DST', 'AMP', 'NR', 'CAB', 'EQ', 'MOD', 'DLY', 'RVB', 'VOL']


def main():
    """Generate boundary cases, invoke the real encoder, and independently decode bytes."""
    xml_path = ROOT / 'scripts/algorithm.xml'
    entries = ET.parse(xml_path).getroot().findall('.//Alg')
    catalog = json.loads((ROOT / 'shared/catalog.json').read_text(encoding='utf-8'))
    cases = []
    definitions = {}
    mismapped = []
    hidden = []
    parameter_count = 0
    for entry in entries:
        module, name, code = entry.get('Module'), entry.get('Name'), int(entry.get('Code'))
        key = f'{module}/{name}/{code}'
        fields = []
        for control in entry:
            attrs = control.attrib
            default = float(re.match(r'^[+-]?[\d.]+', attrs['default'])[0])
            options = control.findall('Menu')
            low = float(attrs['Dmin']) if not options else 0
            high = float(attrs['Dmax']) if not options else len(options) - 1
            field = dict(name=attrs['Name'], id=int(float(attrs['ID'])), default=default,
                         low=low, high=high, step=float(attrs.get('step', 1)),
                         sync=control.tag == 'Switch' and 'sync' in attrs['Name'].lower())
            if options:
                assert [int(o.get('ID')) for o in options] == list(range(len(options))), key
            fields.append(field)
        parameter_count += len(fields)
        model = next(e for e in catalog['modules'][module] if e['code'] == code)
        assert len(model['params']) == len(fields), key
        for expected in fields:
            actual = next(p for p in model['params'] if html.unescape(p['name']) == expected['name'])
            # Keep the historical escaped label compatible with already saved songs.
            expected['input_name'] = actual['name']
            assert actual['id'] == expected['id'], key
            assert actual['default'] == expected['default'], key
            assert actual['min'] == expected['low'] and actual['max'] == expected['high'], key
            assert actual.get('step', 1) == expected['step'], key
            assert actual.get('tempoSync', False) == expected['sync'], key
        ids = {f['id'] for f in fields}
        gaps = sorted(set(range(max(ids) + 1)) - ids)
        if gaps:
            hidden.append(dict(model=key, unexposed_ids=gaps))
        changes = [dict(name=p.get('Name'), old_id=int(float(p.get('idx'))), id=int(float(p.get('ID'))))
                   for p in entry if float(p.get('idx')) != float(p.get('ID'))]
        if changes:
            mismapped.append(dict(model=key, parameters=changes))
        block = dict(module=module, model=name, enabled=True, snaptoneSlot=model.get('snaptoneSlot', model.get('irSlot')),
                     note='', params=[])
        definitions[key] = dict(fields=fields, code=code, module=module)

        def add(label, values, enabled=True, reject=False):
            cases.append(dict(name=f'{key}/{label}', key=key, reject=reject,
                              block={**block, 'enabled': enabled, 'params': values}))

        add('defaults', [])
        add('bypassed', [], enabled=False)
        for field in fields:
            values = sorted({field['low'], field['high'], field['default'],
                             round(field['low'] + (field['high'] - field['low']) / 2 / field['step']) * field['step']})
            for value in values:
                if not field['low'] <= value <= field['high']:
                    continue
                add(f'{field["name"]}={value}', [dict(name=field['input_name'], value=value)],
                    reject=field['sync'] and value != 0)
            for value in [field['low'] - field['step'], field['high'] + field['step']]:
                add(f'{field["name"]}=invalid:{value}', [dict(name=field['input_name'], value=value)], reject=True)

    data = ROOT / 'data/effect-audit'
    data.mkdir(exist_ok=True)
    inputs, outputs = data / 'cases.json', data / 'encoded.json'
    inputs.write_text(json.dumps(cases), encoding='utf-8')
    subprocess.run(['node', '--experimental-transform-types', str(ROOT / 'scripts/encode-audit-cases.mjs'),
                    str(inputs), str(outputs)], cwd=ROOT, check=True)
    encoded = json.loads(outputs.read_text(encoding='utf-8'))
    template = base64.b64decode(encoded['template'])
    assert len(encoded['results']) == len(cases)
    checked = rejected = 0
    for case, result in zip(cases, encoded['results']):
        assert result['name'] == case['name']
        if case['reject']:
            assert 'error' in result, f'Accepted unsupported/invalid input: {case["name"]}'
            rejected += 1
            continue
        assert 'error' not in result, f'{case["name"]}: {result.get("error")}'
        raw = base64.b64decode(result['prst'])
        assert len(raw) == 1224 and raw[:4] == b'TSRP'
        assert sum(raw[:1222]) & 65535 == struct.unpack_from('>H', raw, 1222)[0]
        definition = definitions[case['key']]
        index = MODULES.index(definition['module'])
        at = 160 + index * 72
        assert raw[at + 4] == index and raw[at + 5] == case['block']['enabled'], case['name']
        assert struct.unpack_from('<I', raw, at + 8)[0] == definition['code'], case['name']
        values = {p['name']: p['value'] for p in case['block']['params']}
        for field in definition['fields']:
            value = values.get(field['input_name'], field['default'])
            actual = raw[at + 12 + field['id'] * 4:at + 16 + field['id'] * 4]
            assert actual == struct.pack('<f', value), f'{case["name"]}: wrong slot/value for {field["name"]}'
        if definition['module'] == 'CAB':
            for position in [0, 2, 3, 4]:
                offset = at + 12 + position * 4
                assert raw[offset:offset + 4] == template[offset:offset + 4], case['name']
        for other in range(11):
            if other == index:
                continue
            start = 160 + other * 72
            assert raw[start + 8:start + 72] == template[start + 8:start + 72], case['name']
            assert raw[start + 5] == (template[start + 5] if other == 10 else 0)
        checked += 1
    report = dict(models=len(entries), parameters=parameter_count, encoded_cases=checked, rejected_cases=rejected,
                  module_counts=dict(collections.Counter(a.get('Module') for a in entries)),
                  xml_sha256=hashlib.sha256(xml_path.read_bytes()).hexdigest(), corrected_models=mismapped,
                  hidden_parameter_gaps=hidden,
                  scope='Offline XML-to-encoded-byte audit, not hardware or audible certification.')
    (data / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k not in ['corrected_models', 'hidden_parameter_gaps']}))
    print(f'Display order differs from storage in {len(mismapped)} model entries. Report: {data / "report.json"}')


if __name__ == '__main__':
    main()
