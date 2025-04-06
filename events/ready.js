const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();

const { ActivityType } = require("discord.js");

module.exports = {
    name: "ready",
    once: true,
    execute(client) {
        try {
            Logger.logGreen(`${client.user.tag} is online and serving ${client.guilds.cache.size} guilds!`);

            updatePresence(client);
    
            setInterval(updatePresence, 10 * 60 * 1000);
        } catch (error) {
            Logger.logRed(error);
        }
    }
}

function updatePresence(client) {
    const statuses = [
        { type: ActivityType.Playing, text: "with Discord.js" },
        { type: ActivityType.Watching, text: "over the server" },
        { type: ActivityType.Listening, text: "to commands" },
        { type: ActivityType.Playing, text: "/help for commands" }
    ];
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    client.user.setPresence({
        activities: [{ name: status.text, type: status.type }],
        status: "online"
    });
}