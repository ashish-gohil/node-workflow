# FLOW typography classes

| Tailwind class   | Size / Use                                    |
|------------------|-----------------------------------------------|
| `text-display-xl` | 56px — hero headlines                        |
| `text-display-lg` | 44px — section headlines                     |
| `text-h1`        | 32px — page titles                            |
| `text-h2`        | 24px — section headings                       |
| `text-h3`        | 20px — card titles                            |
| `text-h4`        | 17px — widget headings                        |
| `text-h5`        | 14px — compact headings                       |
| `text-h6`        | 12px / +0.04em tracking — eyebrow labels, uppercase |
| `text-body-lg`   | 16px — lead paragraphs                        |
| `text-body-md`   | 14px — default body                           |
| `text-body-sm`   | 13px — secondary text, captions              |
| `text-caption`   | 12px — timestamps, meta, tiny labels         |
| `text-mono-md`   | 13px mono — IDs, env vars, code              |
| `text-mono-sm`   | 12px mono — inline code, hashes             |

## Typography rules
- `font-sans` (Inter) for all UI text
- `font-mono` (JetBrains Mono) for IDs, hashes, timestamps, code, env vars, numbers in tables
- Always add `tabular-nums` to numbers in aligned columns
- `text-h6 uppercase tracking-wider` for all section / field labels
