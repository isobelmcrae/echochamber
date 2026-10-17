---
version: 1
slug: "src-routes-app-page-svelte"
primary_target: "src/routes/(app)/+page.svelte"
related_targets: ["src/routes/layout.css", "src/routes/(app)/+layout.svelte"]
---

# App shell restyle: Riso Club Zine

Scope: the whole signed-in app (home queue, room feed, link viewer, settings, sidebar) and public auth pages. Visitor mode: Operate. Layouts, flows and copy stay; this replaces type, palette, density and adds one signature move. Light and dark both ship, following the system.

Audience and job: friends catching up on links from their rooms, mostly on a phone, one-handed. Constraints: not childish or cartoony, not gamified, scannable, never louder than the embedded content.

## Direction contract

THESIS: Every room is a zine printed in its own two riso inks; the queue is the newest issue. Refuses the neutral grey card list with one accent colour.

OWN-WORLD: Cool bright paper (#fbfbf8; dark: near-black stock) and riso-black ink. Six fixed ink pairs (pink/blue, sunflower/teal, green/federal blue, yellow/burgundy, orange/medium blue, bright red/teal) assigned per room, always at full strength. Bricolage Grotesque throughout, heavy lowercase for headings. 4px corners, hairline rules, no hard shadows, no thick black boxes.

STORY: The visitor sees which room each unseen link came from by its ink before reading a word, scans titles, opens one, and the queue clears.

FIRST VIEWPORT: Phone: app bar with menu button and misregistered lowercase wordmark; room heading as a solid band in the room's first ink with a rule in its second; link rows with an 80px two-ink halftone thumbnail, site in the second ink, heavy title with a solid ink spot for unread, the note in an ink highlighter, author and comment button below.

FORM: Riso Club Zine, candidate 3 of 7 on the ordered list; seed:d12ae2d14a7b9245. Signature move: link previews are printed as two-ink duotone halftones in their room's pair and register to full colour on hover and in the viewer. Raises: two type sizes in cards (rank by weight and ink); state as a printed mark (solid spot unread, hollow ring seen); room ink at full strength everywhere the room appears; live arrivals print in once with a two-pass registration, then sit still.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
