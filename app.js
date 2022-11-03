import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import { VerifyDiscordRequest, getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';
import {
  HasGuildCommands,
  ACCURACY_COMMAND,
} from './commands.js';
import { calculateHitChance } from './accuracy.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'accuracy' && data) {
      // Send a message into the channel where command was triggered from
      console.log(data)
      const accuracy = data.options.find( e => e.name === 'base_accuracy').value
      const max_range = data.options.find( e => e.name === 'max_range' ).value
      const current_distance = data.options.find( e => e.name === 'current_distance' ).value
      
      let distanceScale = calculateHitChance(accuracy, max_range, current_distance);
      
      const prettyAccuracy = parseFloat(accuracy * 100).toFixed(2);
      const prettyRange = parseInt(max_range);
      const prettyCurrentDistance = parseInt(current_distance)
      const prettyCalculatedHitChance = distanceScale.toFixed(2) * 100
      
      let color = 0xff0000; // red
      if ( distanceScale >= 0.8) {
        color = 0x00ffff // cyan
      } else if ( distanceScale >= 0.6 ) {
        color = 0x00ff00 // green
      } else if ( distanceScale >= 0.5 ) {
        color = 0xffff00 // yellow
      } else if ( distanceScale >= 0.35 ) {
        color = 0xffa500 // orange
      }
      
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          embeds: [{
            "title": "Hit Probability",
            "color": color,
            "fields": [
              {
                "name": "Accuracy",
                "value": prettyAccuracy + "%",
                "inline": true
              },
              {
                "name": "Max Range",
                "value": prettyRange + "m",
                "inline": true
              },
              {
                "name": "Firing Distance",
                "value": prettyCurrentDistance + "m",
                "inline": true
              },
              {
                "name": "-------",
                "value": "-"
              },
              {
                "name": "Hit Probability",
                "value": prettyCalculatedHitChance + "%"
              }
            ]
          }]
        },
      });
    }

  }

  /**
   * Handle requests from interactive components
   * See https://discord.com/developers/docs/interactions/message-components#responding-to-a-component-interaction
   */
  if (type === InteractionType.MESSAGE_COMPONENT) {
    // custom_id set in payload when sending message component
    const componentId = data.custom_id;

    if (componentId.startsWith('accept_button_')) {
      // get the associated game ID
      const gameId = componentId.replace('accept_button_', '');
      // Delete message with token in request body
      const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;
      try {
        await res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            // Fetches a random emoji to send from a helper function
            content: 'What is your object of choice?',
            // Indicates it'll be an ephemeral message
            flags: InteractionResponseFlags.EPHEMERAL,
            components: [
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.STRING_SELECT,
                    // Append game ID
                    custom_id: `select_choice_${gameId}`,
                    options: getShuffledOptions(),
                  },
                ],
              },
            ],
          },
        });
        // Delete previous message
        await DiscordRequest(endpoint, { method: 'DELETE' });
      } catch (err) {
        console.error('Error sending message:', err);
      }
    } else if (componentId.startsWith('select_choice_')) {
      // get the associated game ID
      const gameId = componentId.replace('select_choice_', '');

      if (activeGames[gameId]) {
        // Get user ID and object choice for responding user
        const userId = req.body.member.user.id;
        const objectName = data.values[0];
        // Calculate result from helper function
        const resultStr = getResult(activeGames[gameId], {
          id: userId,
          objectName,
        });

        // Remove game from storage
        delete activeGames[gameId];
        // Update message with token in request body
        const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;

        try {
          // Send results
          await res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: resultStr },
          });
          // Update ephemeral message
          await DiscordRequest(endpoint, {
            method: 'PATCH',
            body: {
              content: 'Nice choice ' + getRandomEmoji(),
              components: [],
            },
          });
        } catch (err) {
          console.error('Error sending message:', err);
        }
      }
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);

  // Check if guild commands from commands.js are installed (if not, install them)
  HasGuildCommands(process.env.APP_ID, process.env.GUILD_ID, [
    ACCURACY_COMMAND
  ]);
});
