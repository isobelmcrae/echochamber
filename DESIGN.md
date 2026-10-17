---
name: echochamber
description: Private link-sharing rooms for friends, each printed as its own two-ink riso zine.
colors:
  paper: "#fbfbf8"
  riso-black: "#1d1d1b"
  fluorescent-pink: "#ff48b0"
  riso-blue: "#0078bf"
  sunflower: "#ffb511"
  teal: "#00838a"
  green: "#00a95c"
  federal-blue: "#3d5588"
  yellow: "#ffe800"
  burgundy: "#914e72"
  orange: "#ff6c2f"
  medium-blue: "#3255a4"
  bright-red: "#ff665e"
  pressed-paper: "#efefe9"
  worn-paper: "#ecece5"
  binding-paper: "#f3f3ee"
  binding-paper-hover: "#e7e7e0"
  graphite: "#63635c"
  sheet-white: "#ffffff"
  hairline: "rgb(29 29 27 / 14%)"
  field-rule: "rgb(29 29 27 / 24%)"
  misprint-red: "#d4252b"
  night-stock: "#151418"
  night-binding: "#0d0c0f"
  night-sheet: "#1e1d22"
  night-pressed: "#26252b"
  night-worn: "#2a2930"
  night-binding-hover: "#222126"
  night-type: "#f2f1ec"
  night-graphite: "#a6a59e"
  night-ring: "#5ec8e5"
  night-hairline: "rgb(255 255 255 / 12%)"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontVariation: '"opsz" 96'
  headline:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontVariation: '"opsz" 72'
  title:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  link-title:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.25
  body:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  sm: "2.4px"
  md: "3.2px"
  lg: "4px"
  xl: "5.6px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  card-gap: "14px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.fluorescent-pink}"
    textColor: "{colors.riso-black}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.riso-black}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  button-ghost-hover:
    backgroundColor: "{colors.pressed-paper}"
  room-band:
    backgroundColor: "{colors.fluorescent-pink}"
    textColor: "{colors.riso-black}"
    typography: "{typography.headline}"
    rounded: "{rounded.lg}"
    padding: "0.2em 0.45em 0.28em"
  ink-spot:
    backgroundColor: "{colors.fluorescent-pink}"
    rounded: "{rounded.full}"
    size: "10px"
  riso-thumbnail:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    size: "80px"
  avatar-fallback:
    backgroundColor: "{colors.riso-blue}"
    textColor: "{colors.sheet-white}"
    rounded: "{rounded.full}"
  sidebar-room-active:
    backgroundColor: "{colors.fluorescent-pink}"
    textColor: "{colors.riso-black}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.riso-black}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 10px"
---

# Design System: echochamber

## Overview

**Creative North Star: "The Riso Club Zine"**

Every room is a small zine printed in its own two risograph inks, and the home queue is the newest issue. The stock is cool, bright paper with riso-black type; colour enters only as ink, laid down flat and at full strength, never tinted, never as a gradient wash. A reader should know which room a link came from by its ink before reading a word.

The world is dense and quiet. Rows sit on hairline rules, not cards. Hierarchy comes from weight and ink rather than from many sizes: heavy lowercase-feeling Bricolage Grotesque for names and titles, a small regular size for everything else. The signature is the print itself: link previews are rendered as two-ink halftone duotones in the room's pair, a pixel off register, and they register to full colour on hover and in the viewer. Live arrivals print in once with a two-pass registration slide, then sit still.

It is never louder than the content friends share, and never childish: no thick black boxes, no hard offset box shadows, no sticker-like chrome. Light and dark both ship; dark mode is near-black stock where the light ink becomes the type colour.

**Key Characteristics:**

- Cool white paper and riso-black ink, with six fixed two-ink pairs assigned per room.
- Ink always at full strength; one pair per room, one room's pair per row.
- Weight and ink rank content, not size.
- Hairline rules and 4px corners; flat surfaces.
- Halftone duotone previews that register to full colour on hover.

## Colors

A paper-and-ink palette: two neutrals do almost all of the work, and the eleven riso inks are reserved for room identity and state.

### Primary

- **Fluorescent Pink** (`fluorescent-pink`): the app's own light ink. Primary buttons, the wordmark's misregistered overprint, text selection, and the default `--ink-a` wherever no room pair is in scope. Black type sits on it.

### Secondary

- **Riso Blue** (`riso-blue`): the app's own dark ink and the focus ring colour in light mode. Default `--ink-b`: rules, caret, avatar fallbacks outside a room.

### Tertiary: the room inks

Six fixed pairs, light ink `a` then dark ink `b`, handed to a viewer's rooms in the order they joined (so two rooms only share a pair past six rooms, and joining never repaints old rooms):

1. **Fluorescent Pink** + **Riso Blue**
2. **Sunflower** + **Teal**
3. **Green** + **Federal Blue**
4. **Yellow** + **Burgundy**
5. **Orange** + **Medium Blue**
6. **Bright Red** + **Teal**

The light ink fills bands, badges, highlights, unread spots and the halftone tone plate, always under riso-black type. The dark ink prints rules, the shadow plate, avatar fallbacks and type. Ink type (`--ink-text`) is the dark ink mixed 82% with black on paper, and the light ink itself on night stock.

### Neutral

- **Paper** (`paper`): page, card and halftone stock. The halftone always prints on paper, in dark mode too.
- **Riso Black** (`riso-black`): all body type, and the type on every ink fill in both modes.
- **Pressed Paper** (`pressed-paper`) / **Worn Paper** (`worn-paper`): muted, secondary and hover fills.
- **Binding Paper** (`binding-paper`) / hover (`binding-paper-hover`): the sidebar.
- **Graphite** (`graphite`): descriptions, timestamps, secondary meta.
- **Hairline** (`hairline`) / **Field Rule** (`field-rule`): row rules and borders; input outlines.
- **Sheet White** (`sheet-white`): popovers.
- **Misprint Red** (`misprint-red`): destructive actions and errors only.
- **Night stock** family (`night-stock`, `night-binding`, `night-sheet`, `night-pressed`, `night-worn`, `night-binding-hover`, `night-type`, `night-graphite`, `night-hairline`, `night-ring`): the dark-mode equivalents, with Bright Red as the dark destructive.

### Named Rules

**The Full Strength Rule.** Room inks are never tinted, faded or given alpha. Wherever a room appears (band, sidebar row, badge, spot, highlight, preview) its ink is solid.

**The One Pair Rule.** Anything inside a room's scope is printed in that room's pair only, set by `inkVars()` on the container. A row never carries two rooms' inks.

**The Black On Ink Rule.** Type on a light-ink fill is riso-black in both modes. Light type never sits on a light ink.

## Typography

**Display Font:** Bricolage Grotesque Variable (with ui-sans-serif, system-ui)
**Body Font:** Bricolage Grotesque Variable, optical sizing on
**Label/Mono Font:** none distinct

**Character:** one family throughout, pushed to extra-bold with high optical sizes for names and titles so they read like hand-set zine headers, and left regular and small for the reading text.

### Hierarchy

- **Display** (800, 26px app bar / 28px sidebar / 36px auth, line-height 1, -0.03em, opsz 96): the wordmark only, with a pink overprint offset (-0.06em, 0.04em).
- **Headline** (800, 26px on the home queue / 32px on a room page, line-height 1.05, -0.02em, opsz 72): room names, printed in a room band.
- **Title** (800, 20px, tight): card titles, empty-state titles. The viewer's link title runs 18px extra-bold.
- **Link title** (800, 16px, line-height 1.25): the link row title, clamped to two lines.
- **Body** (400, 16px): forms and comments.
- **Meta** (400 to 600, 13px): site name (semibold, in ink type), description (graphite, two lines), note, author line.
- **Label** (600, 14px): buttons.

### Named Rules

**The Two Sizes Rule.** A link row uses two type sizes, 16px and 13px. Rank inside it by weight (800 / 600 / 400) and ink, never by a third size.

## Layout

A single reading column (max 672px, 16px side padding, 24px top) on every signed-in page, with the sidebar beside it from 768px and a 56px app bar with menu button and wordmark below that. Auth pages centre the wordmark 40px from the top over a 384px card. Room groups on the home queue are 32px apart; link rows are 16px top and bottom, separated by hairline rules, with the 80px thumbnail 14px from the text. A room page pins its composer to the bottom of the viewport (16px inset). The link viewer is a container-query layout: media stacked over a comment panel, then side by side with a 352px panel from a 768px container width.

## Elevation & Depth

Flat. Depth comes from ink and rules: hairlines between rows, a 2px dark-ink rule under room bands and the viewer header, solid ink fills for emphasis. The only lift in the system is the sticky composer, which floats over the scrolling feed.

### Shadow Vocabulary

- **Composer float** (`box-shadow: 0 8px 24px -6px rgb(0 0 0 / 0.18)`): the sticky link composer on a room page, nothing else.

### Named Rules

**The Flat Stock Rule.** Surfaces are flat paper. No hard offset box shadows and no thick black outlines; the only offset in the world is ink misregistration (the wordmark overprint and the halftone's second plate).

## Shapes

Small, near-square corners: 4px base (`lg`), stepping to 3.2px for buttons and inputs and 2.4px for thumbnails. Circles are reserved for avatars and the ink spot. Rules are 1px hairlines for structure and 2px solid dark ink for room identity. Halftone previews clip to their corner.

## Components

### Buttons

Compact and quiet, letting ink carry emphasis.

- **Shape:** slightly softened corners (3.2px), 1px transparent border.
- **Primary:** fluorescent pink with riso-black semibold 14px label, 36px tall, 10px side padding. Hover darkens by mixing 14% riso-black into the pink. Primary actions use the app pink even inside a room.
- **Ghost:** transparent, pressed-paper on hover. The comment-count button takes the room's ink type and a border in that ink once a link has comments.
- **Hover / Focus:** 3px focus ring in riso blue at 50% (night ring in dark mode); pressing nudges down 1px.
- **Destructive:** misprint red text on a 10% red wash.

### Cards / Containers

- **Corner Style:** 4px.
- **Background:** paper.
- **Shadow Strategy:** none (see Elevation).
- **Border:** hairline.
- **Use:** auth and settings forms only. Feeds are ruled rows, not cards.

### Inputs / Fields

- **Style:** transparent, 1px field-rule outline, 3.2px corners, 36px tall; the caret is the dark ink (light ink on night stock).
- **Focus:** riso-blue border and 3px ring at 50%.
- **Error:** misprint red border and ring.

### Navigation

The sidebar is binding paper with the wordmark at the top. Each room row carries its own pair: the active room fills with its light ink in riso-black bold, and the unseen count is a small light-ink badge (2.4px corners, bold tabular numerals). On phones the sidebar is a sheet opened from the app bar's 44px menu button.

### Room Band

A room's name, set in the headline style on a solid band of its light ink in riso-black, followed by a 2px rule of its dark ink running to the edge. It heads every room group in the queue, the room page and, as a variant, auth card titles in the app pink.

### Ink Spot

State as a printed mark: a 10px solid light-ink circle keyed with a 1.5px dark-ink-type ring while unseen; only the ring once seen. Sits before the link title.

### Ink Highlighter Note

A sharer's note in 13px medium, run through a highlighter of the room's light ink (lower 60% of the line). On night stock the whole line prints black on the solid ink.

### Riso Thumbnail

The signature. An 80px preview printed in the room's pair: a light-ink tone plate (screen blend), a dark-ink shadow plate screened into a 3px dot grid, and a solid dark-ink key plate for type and outlines, both dark plates 1px off register. Hovering the row fades the plates (0.35s, cubic-bezier(0.16, 1, 0.3, 1)) to show the full-colour image. Live arrivals print in over 520ms: they fade up 6px while the dark plates slide from 6px off register to rest. Reduced motion skips the animation.

### Avatar Fallback

Initials in bold white on the surrounding room's dark ink, so a row stays in one pair.

## Do's and Don'ts

### Do:

- **Do** scope every room surface with `inkVars()` and read `--ink-a`, `--ink-b` and `--ink-text`; never hard-code a room's hex.
- **Do** keep room inks at full strength and put riso-black type on every light-ink fill.
- **Do** rank within a row by weight and ink across exactly two sizes (16px and 13px).
- **Do** separate feed rows with hairline rules and keep corners at 4px or less.
- **Do** print previews through the riso thumbnail and let hover register them to full colour.
- **Do** ship every surface in both paper and night stock.

### Don't:

- **Don't** tint, fade or apply alpha to a room ink, or mix two rooms' inks in one row.
- **Don't** use hard offset box shadows or thick black outlines; the only offset is ink misregistration.
- **Don't** wrap feed items in shadowed cards.
- **Don't** add a third type size to a link row.
- **Don't** let chrome outshout embedded content: ink marks identity and state, not decoration.
