import { DiscordRequest } from './utils.js';

export async function HasGuildCommands(appId, guildId, commands) {
  if (guildId === '' || appId === '') return;

  commands.forEach((c) => HasGuildCommand(appId, guildId, c));
}

// Checks for a command
async function HasGuildCommand(appId, guildId, command) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;

  try {
    const res = await DiscordRequest(endpoint, { method: 'GET' });
    const data = await res.json();

    if (data) {
      const installedNames = data.map((c) => c['name']);
      // This is just matching on the name, so it's not good for updates
      if (!installedNames.includes(command['name'])) {
        console.log(`Installing "${command['name']}"`);
        InstallGuildCommand(appId, guildId, command);
      } else {
        console.log(`"${command['name']}" command already installed`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// Installs a command
export async function InstallGuildCommand(appId, guildId, command) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;
  // install command
  try {
    await DiscordRequest(endpoint, { method: 'POST', body: command });
  } catch (err) {
    console.error(err);
  }
}

// Calculate firing accuracy
export const ACCURACY_COMMAND = {
  name: 'accuracy',
  description: 'Calculate accuracy based on max range and current distance',
  options: [
    {
      type: 10,
      name: 'base_accuracy',
      description: 'Accuracy of firing unit at max range.',
      required: true,
      min_value: 0.0,
      max_value: 1.0
    },
    {
      type: 4,
      name: 'max_range',
      description: 'Max range of firing unit.',
      required: true,
      min_value: 0.0,
    },
    {
      type: 4,
      name: 'current_distance',
      description: 'Current distance of firing unit from target.',
      required: true,
      min_value: 0.0,
    }
  ]
};
