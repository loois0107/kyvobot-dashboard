// Authorization bitfield constants from Discord API documentation
const DISCORD_ADMINISTRATOR_BIT = BigInt(0x8);
const DISCORD_MANAGE_GUILD_BIT = BigInt(0x20);

interface DiscordGuildResponse {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string; // Discord returns permissions as a stringified bitfield
  features: string[];
}

/**
 * Validates if the authenticated session user holds administrative rights over a specific Guild.
 * @param accessToken The Discord OAuth2 User Access Token fetched from the session.
 * @param guildId The target Guild identity context to evaluate.
 */
export async function verifyDiscordAdmin(accessToken: string, guildId: string): Promise<boolean> {
  if (!accessToken || !guildId) {
    return false;
  }

  try {
    // Fetch the list of guilds the authenticated user belongs to directly from Discord
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 30 } // Cache results for 30 seconds to prevent aggressive rate limiting
    });

    if (!response.ok) {
      console.error(`[DISCORD API ERROR] Failed fetching user guild data registry: ${response.statusText}`);
      return false;
    }

    const guilds: DiscordGuildResponse[] = await response.json();
    
    // Locate the matching guild instance mapping
    const targetGuild = guilds.find((guild) => guild.id === guildId);
    
    if (!targetGuild) {
      return false; // User is not even a member of the requested guild
    }

    // Guard: If the user is the absolute owner of the server, skip bitwise authorization check
    if (targetGuild.owner) {
      return true;
    }

    // Convert stringified bitfield into a BigInt node for bitwise operations
    const userPermissions = BigInt(targetGuild.permissions);

    // Evaluate if the user holds ADMINISTRATOR or MANAGE_GUILD node blocks
    const isAdmin = (userPermissions & DISCORD_ADMINISTRATOR_BIT) === DISCORD_ADMINISTRATOR_BIT;
    const canManage = (userPermissions & DISCORD_MANAGE_GUILD_BIT) === DISCORD_MANAGE_GUILD_BIT;

    return isAdmin || canManage;

  } catch (error) {
    console.error(`[SECURITY CRITICAL ERROR] Admin check validation pipeline crashed: ${error}`);
    return false;
  }
}
