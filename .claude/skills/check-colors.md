# /check-colors

Scan the entire `src/` directory for hardcoded brand colors that should be CSS variables instead.

## What to scan for

Run these greps and collect all matches:

```bash
grep -rn \
  "#EE4621\|#EE4723\|#ee4621\|#ee4723\|#F49079\|#f49079\|rgba(238" \
  src/ \
  --include="*.tsx" --include="*.ts" --include="*.css" \
  | grep -v "node_modules"
```

Also scan for the specific rgba patterns:
```bash
grep -rn "rgba(238, 71\|rgba(238,71\|rgba(238, 70\|rgba(238,70" \
  src/ \
  --include="*.tsx" --include="*.ts" --include="*.css"
```

## How to report

Group violations by file and show line numbers. For each violation, show:
- File path and line number
- The offending value
- What it should be replaced with (from the token table in CLAUDE.md)

## Fix all violations

After reporting, ask the user: "Fix all violations now?"

If yes, apply the following replacements:

### In `.css` / `.module.css` files
| Find | Replace |
|---|---|
| `#EE4621` | `var(--color-primary)` |
| `#EE4723` | `var(--color-primary)` |
| `#ee4621` | `var(--color-primary)` |
| `#ee4723` | `var(--color-primary)` |
| `rgba(238, 71, 35, 0.25)` | `var(--color-primary-light)` |
| `rgba(238, 71, 35, X)` | `rgba(from var(--color-primary) r g b / X)` |
| `rgba(238, 70, 33, X)` | `rgba(from var(--color-primary) r g b / X)` |

### In `.tsx` / `.ts` files — SVG attributes
| Find | Replace |
|---|---|
| `fill="#EE4621"` | `fill="var(--color-primary)"` |
| `fill="#EE4723"` | `fill="var(--color-primary)"` |
| `stroke="#EE4621"` | `stroke="var(--color-primary)"` |
| `stroke="#EE4723"` | `stroke="var(--color-primary)"` |
| `fill="#F49079"` | `fill="var(--color-primary-light)"` |

### In `.tsx` — Tailwind inline classes
| Find | Replace |
|---|---|
| `text-[#EE4621]` | `text-[var(--color-primary)]` |
| `bg-[#EE4621]` | `bg-[var(--color-primary)]` |
| `border-[#EE4621]` | `border-[var(--color-primary)]` |
| `focus:ring-[#EE4621]` | `focus:ring-[var(--color-primary)]` |

### In `.tsx` — inline `style={{}}` props
| Find | Replace |
|---|---|
| `color: '#EE4621'` | `color: 'var(--color-primary)'` |
| `color: "#EE4621"` | `color: 'var(--color-primary)'` |
| `borderColor: '#EE4621'` | `borderColor: 'var(--color-primary)'` |
| `background: '#EE4621'` | `background: 'var(--color-primary)'` |

## After fixing

Re-run the grep to confirm zero violations, then report: "✓ No hardcoded brand colors found."
