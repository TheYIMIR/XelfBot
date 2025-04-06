const fs = require("node:fs");
const { EmbedBuilder } = require("discord.js");
const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();

// Member Join Event
module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        try {
            // Ensure stats directory exists
            if (!fs.existsSync("./data/stats")) {
                fs.mkdirSync("./data/stats", { recursive: true });
            }
            
            // Stats file path
            const serverStatsPath = `./data/stats/${member.guild.id}_server.json`;
            
            // Initialize stats file if it doesn't exist
            if (!fs.existsSync(serverStatsPath)) {
                const serverStats = {
                    guildId: member.guild.id,
                    created: member.guild.createdAt.toISOString(),
                    memberJoins: 0,
                    memberLeaves: 0,
                    messagesTotal: 0,
                    voiceMinutesTotal: 0,
                    commandsUsed: 0,
                    lastUpdated: new Date().toISOString()
                };
                fs.writeFileSync(serverStatsPath, JSON.stringify(serverStats, null, 4));
            }
            
            // Load stats
            const serverStats = JSON.parse(fs.readFileSync(serverStatsPath, "utf-8"));
            
            // Update stats
            serverStats.memberJoins++;
            serverStats.lastUpdated = new Date().toISOString();
            
            // Save stats
            fs.writeFileSync(serverStatsPath, JSON.stringify(serverStats, null, 4));
            
            // Welcome message
            try {
                // Check if a welcome channel exists
                const welcomeChannel = member.guild.channels.cache.find(
                    channel => channel.name.includes("welcome") || channel.name.includes("joins")
                );
                
                if (welcomeChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle("Welcome to the Server!")
                        .setDescription(`Welcome ${member} to **${member.guild.name}**!`)
                        .setColor("#00FF00")
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: "Account Created", value: `<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>` },
                            { name: "Member Count", value: `${member.guild.memberCount}` }
                        )
                        .setFooter({ text: `User ID: ${member.id}` })
                        .setTimestamp();
                    
                    await welcomeChannel.send({ embeds: [embed] });
                }
            } catch (error) {
                Logger.logRed(`Error sending welcome message: ${error}`);
            }
        } catch (error) {
            Logger.logRed(`Error tracking member join: ${error}`);
        }
    }
};