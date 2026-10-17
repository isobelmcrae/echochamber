# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Small friend groups, and pairs of friends, who already pass links to each other: articles, videos, posts, songs. Anyone can sign up and start a room with their own friends, so a newcomer has to understand the product without someone explaining it. Most use is on a phone: posting a link they just found, and catching up on what friends shared in a spare moment.

## Product Purpose

echochamber gives each friend group a private room for sharing links. People post links, each one gets an automatic preview and its own comment thread, and everything updates live. It succeeds when links shared between friends actually get opened and talked about, instead of scrolling away unread in a group chat.

## Positioning

Two mechanisms set it apart from dropping links into a chat:

- **The unseen-link queue.** Home is an inbox of every link you haven't opened yet, across all your rooms, newest first. Opening a link marks it seen and removes it from the queue, so nothing gets buried and "all caught up" means something.
- **Discussion per link.** Each link has its own threaded comments, so conversation stays attached to the thing it's about rather than mixed into one chat stream.

## Operating Context

- Rooms are invite-only. A room can be a named group or a 1:1, which is a room created with one friend invited as a fellow admin. Invites go by username or by an invite link (`/join/[token]`).
- Links open in a viewer: an embedded player or page where the site allows framing, a preview card where it doesn't, with the comment thread beside it (stacked on narrow screens). From the home queue the viewer flips across links one after another.
- People join a room already caught up; links posted before they joined don't flood their queue.
- Sign-in is email + password, GitHub, or Google.

## Capabilities and Constraints

- Roles per room: `admin` (rename/delete the room, invite, remove members, change roles, delete anyone's content) and `member` (post links and comments). Non-members can't tell a room exists.
- Link previews come from OpenGraph/oEmbed, fetched server-side after posting; some sites can't be framed and fall back to a preview card.
- Live updates assume a single Node process; the app is deployed on Zenith with SQLite.
- The app sends no email.
- Terminology: **room**, **link**, **comment**, **invite**, **queue**, **seen**, **caught up**.

## Brand Commitments

- Name: **echochamber**, written lowercase.

## Evidence on Hand

- Demo seed data: users alice and bob and a shared room (`bun run seed`). These are fixtures, not real users.
- No testimonials, usage numbers, customers, or press exist. Do not invent any.

## Product Principles

1. **Unread friend links come first.** The queue is the core of the product; nothing should make it harder to see what's new and clear it.
2. **Conversation lives with the link.** Talk about a link happens on that link, not in a general feed.
3. **Phone first.** Posting, catching up, and replying must be quick with one thumb on a small screen.
4. **Private by default.** Rooms are small and invite-only; no public feeds, discovery, or algorithmic ranking.
5. **Self-explanatory to newcomers.** A new user, invited by a friend or arriving alone, should understand rooms, the queue, and threads without a guide.
