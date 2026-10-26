"""Build deterministic, dependency-free CSS/native tokens and measured contrast evidence."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = json.loads((ROOT / 'billion-tokens.json').read_text(encoding='utf-8'))


def rgb(value):
    return [int(value[i:i + 2], 16) for i in (1, 3, 5)]


def mix(base, tint, weight):
    return '#' + ''.join(f'{round(a * (1 - weight) + b * weight):02X}'
                         for a, b in zip(rgb(base), rgb(tint)))


def contrast(a, b):
    def luminance(value):
        channels = [v / 255 for v in rgb(value)]
        channels = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
                    for v in channels]
        return sum(v * w for v, w in zip(channels, (.2126, .7152, .0722)))
    x, y = sorted((luminance(a), luminance(b)))
    return (y + .05) / (x + .05)


def palette(skin, mode):
    p = dict(skin[mode])
    dark = mode == 'dark'
    p.update(SOURCE['sharedStatus'][mode])
    p.update({
        'raised': mix(p['surface'], '#FFFFFF', .035) if dark else p['surface'],
        'subtle': mix(p['surface'], p['canvas'], .7),
        'hover': mix(p['surface'], p['primary'], .06),
        'selected': mix(p['surface'], p['primary'], .1),
        'border': mix(p['surface'], p['text'], .22),
        'primary-hover': mix(p['primary'], '#FFFFFF' if dark else '#000000', .09),
        'primary-active': mix(p['primary'], '#FFFFFF' if dark else '#000000', .17),
        'disabled-bg': mix(p['surface'], p['text'], .06),
        'focus': p['primary'],
        'shadow': '0 12px 36px #00000040' if dark else '0 8px 28px #173A5E14',
        'scheme': mode,
    })
    if skin is SOURCE['skins']['highcontrast']:
        p['border'] = p['control-border']
        p['shadow'] = 'none'
    for level in (3, 5, 7, 8, 9):
        p[f'primary-light-{level}'] = mix(p['primary'], p['surface'], level / 10)
    return p


resolved, rules, checks, hierarchy = {}, [], [], []


def rule(selector, values):
    return selector + ' {\n' + '\n'.join(f'  --bx-{k}: {v};' for k, v in values.items()) + '\n}'


for key, skin in SOURCE['skins'].items():
    resolved[key] = {}
    for mode in ('light', 'dark'):
        p = palette(skin, mode)
        resolved[key][mode] = p
        selector = f'.bx-root[data-bx-skin="{key}"]'
        if key == SOURCE['defaultSkin']:
            selector += ', .bx-root:not([data-bx-skin])'
        selectors = selector.split(', ')
        if mode == 'light':
            rules.append(rule(',\n'.join(selectors), p))
        else:
            rules.append(rule(',\n'.join(s + '[data-bx-mode="dark"]' for s in selectors), p))
            system = ',\n'.join(s + ':is([data-bx-mode="system"], :not([data-bx-mode]))'
                                 for s in selectors)
            rules.append('@media (prefers-color-scheme: dark) {\n' + rule(system, p) + '\n}')
        def check(name, fg, bg, threshold):
            ratio = contrast(p[fg], p[bg])
            checks.append(dict(skin=key, mode=mode, pair=name, foreground=p[fg],
                               background=p[bg], ratio=round(ratio, 3), minimum=threshold,
                               passed=ratio >= threshold))
        for background in ('canvas', 'surface', 'raised', 'subtle', 'hover', 'selected',
                           'feature', 'feature-end'):
            for foreground in ('text', 'muted', 'primary'):
                check(f'{foreground}/{background}', foreground, background, 4.5)
        for state in ('primary', 'primary-hover', 'primary-active'):
            check(f'button-label/{state}', 'on-primary', state, 4.5)
        for background in ('nav', 'nav-hover', 'nav-selected'):
            for foreground in ('nav-text', 'nav-muted'):
                check(f'{foreground}/{background}', foreground, background, 4.5)
            check(f'nav-focus/{background}', 'nav-text', background, 3)
            check(f'nav-selection-indicator/{background}', 'primary', background, 3)
        for status in ('success', 'warning', 'danger', 'info'):
            check(f'{status}/soft', status, status + '-soft', 4.5)
        for background in ('surface', 'canvas', 'raised', 'feature', 'feature-end'):
            check(f'control-border/{background}', 'control-border', background, 3)
            check(f'focus/{background}', 'focus', background, 3)
        check('disabled-text/background', 'muted', 'disabled-bg', 4.5)
        # Decorative feature fills and outlines do not carry meaning by themselves.
        # Record their separation rather than misapplying a control's 3:1 threshold.
        hierarchy.append(dict(skin=key, mode=mode,
                              featureDistinctFromCanvas=p['feature'] != p['canvas'],
                              featureDistinctFromSurface=p['feature'] != p['surface'],
                              selectedDistinctFromNav=p['nav-selected'] != p['nav'],
                              hoverDistinctFromSelected=p['nav-hover'] != p['nav-selected'],
                              featureCanvasRatio=round(contrast(p['feature'], p['canvas']), 3),
                              featureSurfaceRatio=round(contrast(p['feature'], p['surface']), 3)))
        if key == 'highcontrast':
            check('highcontrast-body', 'text', 'surface', 7)

header = f'/* BILLION UI {SOURCE["version"]} local design candidate; not a product release. Generated from billion-tokens.json. */\n'
token_css = header + '\n\n'.join(rules) + '\n'
(ROOT / 'billion-tokens.css').write_text(token_css, encoding='utf-8')
(ROOT / 'billion-ui.css').write_text(token_css + '\n' + (ROOT / 'billion-components.css').read_text(encoding='utf-8'), encoding='utf-8')
(ROOT / 'billion-resolved-tokens.json').write_text(json.dumps({
    'version': SOURCE['version'], 'status': SOURCE['status'], 'scope': SOURCE['scope'],
    'skins': resolved,
    'metrics': {'uiFontPx': 14, 'readingFontPx': 16, 'headerPx': 56, 'navPx': 224,
                'controlPx': {'compact': 32, 'standard': 36, 'comfortable': 44},
                'touchTargetPx': 44, 'radiusPx': [6, 8, 12], 'spacingPx': [4, 8, 12, 16, 24, 32]},
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
evidence = {'scope': 'Token-pair sRGB contrast only; not a complete WCAG or product acceptance audit.',
            'version': SOURCE['version'], 'variants': sum(len(modes) for modes in resolved.values()),
            'checks': len(checks),
            'failures': sum(not c['passed'] for c in checks),
            'minimumTextRatio': min(c['ratio'] for c in checks if c['minimum'] == 4.5),
            'minimumControlRatio': min(c['ratio'] for c in checks if c['minimum'] == 3),
            'decorativeHierarchyScope': 'Distinct color values and measured ratios only; not a readability or perception guarantee. Feature borders and accent lines are decorative, with no 3:1 requirement.',
            'hierarchy': hierarchy,
            'results': checks}
(ROOT / 'contrast-audit.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: v for k, v in evidence.items() if k not in ('results', 'hierarchy')}, ensure_ascii=False))
for failure in [c for c in checks if not c['passed']]:
    print(json.dumps(failure, ensure_ascii=False))
raise SystemExit(1 if evidence['failures'] else 0)
