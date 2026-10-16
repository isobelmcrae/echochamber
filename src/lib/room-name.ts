type Member = { id: string; name: string };

/** A room's display name: its title, or the other members' names (yours if you're alone). */
export function roomName(room: { title: string | null; members: Member[] }, meId: string) {
  if (room.title) return room.title;
  const others = room.members.filter((m) => m.id !== meId).map((m) => m.name);
  if (others.length === 0) return "Just you";
  if (others.length <= 3) return others.join(", ");
  return `${others.slice(0, 2).join(", ")} and ${others.length - 2} others`;
}
