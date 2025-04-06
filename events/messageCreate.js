const ConfigManager = require("../internal/ConfigManager");
const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();
const config = new ConfigManager();

module.exports = {
    name: "messageCreate",
    async execute(message) {
        try {
            // Skip if message is from a bot
            if (message.author.bot) return;
            
            // Skip DMs
            if (!message.guild) return;
            
            const guildId = message.guild.id;
            
            // Load stats
            const serverStats = config.getServerStats(guildId);
            const userStats = config.getUserStats(guildId);
            const messageStats = config.getMessageStats(guildId);
            
            // Initialize user stats if they don't exist
            if (!userStats[message.author.id]) {
                userStats[message.author.id] = {
                    userId: message.author.id,
                    username: message.author.tag,
                    joinedAt: message.member.joinedAt.toISOString(),
                    messagesTotal: 0,
                    commandsUsed: 0,
                    voiceMinutesTotal: 0,
                    lastActive: new Date().toISOString()
                };
            }
            
            // Initialize message stats if they don't exist
            if (!messageStats[message.author.id]) {
                messageStats[message.author.id] = {
                    userId: message.author.id,
                    username: message.author.tag,
                    total: 0,
                    channels: {},
                    hourlyActivity: Array(24).fill(0),
                    dailyActivity: Array(7).fill(0)
                };
            }
            
            // Update stats
            serverStats.messagesTotal++;
            serverStats.lastUpdated = new Date().toISOString();
            
            userStats[message.author.id].messagesTotal++;
            userStats[message.author.id].lastActive = new Date().toISOString();
            userStats[message.author.id].username = message.author.tag; // Update username in case it changed
            
            messageStats[message.author.id].total++;
            messageStats[message.author.id].username = message.author.tag; // Update username in case it changed
            
            // Update channel stats
            if (!messageStats[message.author.id].channels[message.channel.id]) {
                messageStats[message.author.id].channels[message.channel.id] = 0;
            }
            messageStats[message.author.id].channels[message.channel.id]++;
            
            // Update hourly activity
            const hour = new Date().getHours();
            messageStats[message.author.id].hourlyActivity[hour]++;
            
            // Update daily activity
            const day = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
            messageStats[message.author.id].dailyActivity[day]++;
            
            // Save stats
            config.saveServerStats(guildId, serverStats);
            config.saveUserStats(guildId, userStats);
            config.saveMessageStats(guildId, messageStats);
            
        } catch (error) {
            Logger.logRed(`Error tracking message stats: ${error}`);
        }
    }
};