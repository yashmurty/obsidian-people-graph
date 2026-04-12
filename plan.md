# Obsidian People Graph Plugin — Project Plan

## What We're Building

A custom Obsidian plugin that renders a **visual force-directed graph of people and friends** in your vault — with face photos on nodes, closeness-based positioning, and company-based clustering. Think of it as your personal network map, living inside Obsidian.

---

## Core Features (MVP)

- Scan vault for all notes tagged `type: person`
- Render a dedicated graph view using D3.js force simulation
- Show circular photo thumbnails as nodes (fallback to initials if no photo)
- Position nodes based on `closeness` score (1–10) — closer score = closer to center
- Cluster nodes that share the same `company`
- Draw edges between people listed in `knows`
- Click a node to open that person's note
- Freemium: free up to 20 people, paid unlimited

---

## Data Model

Every person is a standard Obsidian markdown note with this frontmatter:

```yaml
---
type: person
name: John Smith
photo: attachments/john.jpg
company: Acura Corp
role: Engineer
closeness: 8
tags: [colleague, mentor]
knows:
  - "[[Jane Doe]]"
  - "[[Mike Lee]]"
---
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | Must be `person` for plugin to index this note |
| `name` | string | Yes | Display name on graph node |
| `photo` | string | No | Vault-relative path to photo file |
| `company` | string | No | Used for clustering nodes |
| `role` | string | No | Shown on hover tooltip |
| `closeness` | number 1–10 | No | 10 = closest to center, 1 = furthest (defaults to 5) |
| `knows` | wikilink array | No | Edges drawn between these people |
| `tags` | string array | No | For filtering in future versions |

---

## Architecture

### 3 Core Modules

```
src/
├── main.ts              # Plugin entry point, registers view
├── indexer.ts           # Vault scanner — finds and parses person notes
├── graph/
│   ├── GraphView.ts     # Obsidian ItemView wrapper
│   ├── renderer.ts      # D3 force simulation and SVG rendering
│   └── forces.ts        # Custom force definitions (closeness, clustering)
├── settings.ts          # Plugin settings tab
└── types.ts             # Shared TypeScript interfaces
```

### Data Flow

```
Vault notes → Indexer → PersonNode[] → D3 Renderer → SVG Graph
                                    ↑
                              Settings (force strength, cluster toggle)
```

---

## Technical Stack

| Layer | Technology |
|---|---|
| Plugin framework | Obsidian Plugin API (TypeScript) |
| Graph rendering | D3.js v7 (force simulation) |
| Node images | HTML `<image>` in SVG with `clipPath` for circle crop |
| Build tool | esbuild (standard for Obsidian plugins) |
| Boilerplate | obsidian-sample-plugin |

---

## D3 Force Configuration

```typescript
const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.distance))
  .force("charge", d3.forceManyBody().strength(-300))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("closeness", closenessForce())   // pulls node toward center based on score
  .force("cluster", clusterForce())       // pulls same-company nodes together
  .force("collision", d3.forceCollide().radius(40))
```

### Closeness Force Logic
- Node with `closeness: 10` → target radius ~50px from center
- Node with `closeness: 1` → target radius ~400px from center
- Linear interpolation between min/max radius

### Cluster Force Logic
- Group nodes by `company`
- Each group has a virtual centroid
- Nodes are gently attracted toward their company centroid
- Strength is configurable in settings (default: 0.3)

---

## Node Rendering

Each node is an SVG `<g>` group containing:

```
<clipPath id="clip-{id}">
  <circle r="30" />
</clipPath>
<image href="{photoUrl}" clip-path="url(#clip-{id})" width="60" height="60" />
<circle r="30" stroke="{color}" fill="none" />       ← ring color by closeness
<image href="{defaultAvatarSvg}" />                  ← shown if no photo (default avatar)
```

Ring color scale:
- Closeness 8–10 → green
- Closeness 4–7 → yellow  
- Closeness 1–3 → gray

---

## Interaction

| Action | Behavior |
|---|---|
| Click node | Opens that person's note in Obsidian |
| Hover node | Shows tooltip: name, company, role, closeness |
| Drag node | Node follows cursor, simulation adjusts |
| Scroll | Zoom in/out (d3.zoom) |
| Double-click canvas | Reset zoom to fit |

---

## Settings Panel

```
People Graph Settings
─────────────────────
[x] Enable company clustering
    Cluster strength: [====|----] 0.3

[x] Show relationship edges
    Edge opacity: [===|-----] 0.4

[ ] Show closeness ring color

Center node label: [You        ]

Max people (free tier): 20
```

---

## Monetization

### Free Tier
- All person nodes visible on graph
- First 20 nodes fully interactive
- Nodes beyond 20 are dimmed (opacity 0.3) with a lock overlay
- Clicking a locked node shows upgrade prompt
- All core features available within 20 node limit

### Pro Tier (~$5/mo or $49/yr)
- Unlimited people
- Export graph as PNG/SVG
- Filter view by tag or company
- Relationship timeline (when did you last interact)
- Color themes

### Implementation
Use a license key system. On plugin load, check key against a simple validation API. No complex backend needed initially — can use Gumroad or LemonSqueezy for key generation.

---

## Build Phases

### Phase 0 — Project Scaffolding
- [x] Init repo with git
- [x] Create `manifest.json` for Obsidian plugin registration
- [x] Create `package.json` with dependencies (obsidian, esbuild, typescript)
- [x] Set up `tsconfig.json` and `esbuild.config.mjs`
- [x] Create `src/types.ts` with `PersonNode` interface and `PeopleGraphSettings`
- [x] Create `src/main.ts` — plugin entry point with ribbon icon + command
- [x] Create `src/graph/GraphView.ts` — basic `ItemView` with placeholder content
- [x] Verify TypeScript compiles and esbuild produces `main.js`
- [x] Plugin loads in Obsidian and shows up in Community Plugins

### Phase 1 — Foundation
- [ ] Build `indexer.ts` — scan vault, parse frontmatter, return `PersonNode[]`
- [ ] Render plain D3 circles (no photos yet) with force simulation

### Phase 2 — Core Graph
- [ ] Add photo rendering with circular clip
- [ ] Implement closeness force (distance from center)
- [ ] Implement cluster force (group by company)
- [ ] Draw edges from `knows` field
- [ ] Click to open note
- [ ] Hover tooltip

### Phase 3 — Polish
- [ ] Fallback default avatar silhouette when no photo
- [ ] Ring color by closeness score
- [ ] Zoom and pan
- [ ] Settings panel
- [ ] Free tier limit (20 nodes)
- [ ] Basic error handling (missing photos, broken links)

### Phase 4 — Monetization & Launch
- [ ] License key validation
- [ ] Export graph as PNG
- [ ] Write README with screenshots
- [ ] Submit to Obsidian community plugins
- [ ] Post on r/ObsidianMD, Obsidian Discord, forum

---

## Repo Structure

```
obsidian-people-graph/
├── src/
│   ├── main.ts
│   ├── indexer.ts
│   ├── settings.ts
│   ├── types.ts
│   └── graph/
│       ├── GraphView.ts
│       ├── renderer.ts
│       └── forces.ts
├── styles.css
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── PLAN.md              ← this file
```

---

## Key References

- Obsidian Plugin API: https://docs.obsidian.md
- Sample plugin boilerplate: https://github.com/obsidianmd/obsidian-sample-plugin
- D3 force simulation: https://d3js.org/d3-force
- D3 zoom: https://d3js.org/d3-zoom
- LemonSqueezy (licensing): https://www.lemonsqueezy.com

---

## Notes for Claude Code

- Always use the Obsidian API for file reading — do not use Node.js `fs` directly
- The plugin runs in Electron (desktop) and potentially mobile — avoid desktop-only APIs where possible
- D3 should be bundled (not loaded from CDN) — add as npm dependency
- Photos are vault-relative paths — use `app.vault.adapter.getResourcePath()` to convert to a URL that works in the plugin view
- The graph view should be registered as a new view type, not injected into the existing graph
- Re-index on vault change events (`app.vault.on('modify', ...)`) so graph updates live