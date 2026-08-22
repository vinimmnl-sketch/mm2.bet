export type RobloxUser = { id: number; name: string };

export async function lookupRobloxUser(username: string): Promise<RobloxUser | null> {
  const res = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: Array<{ id: number; name: string }> };
  const user = json.data?.[0];
  return user ? { id: user.id, name: user.name } : null;
}

/** Returns the profile description, or null when Roblox could not be reached. */
export async function getRobloxDescription(userId: string): Promise<string | null> {
  const res = await fetch(`https://users.roblox.com/v1/users/${userId}`);
  if (!res.ok) return null;
  const json = (await res.json()) as { description?: string | null };
  return json.description ?? "";
}

export async function getRobloxAvatar(userId: string): Promise<string | null> {
  const res = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: Array<{ imageUrl?: string }> };
  return json.data?.[0]?.imageUrl ?? null;
}
