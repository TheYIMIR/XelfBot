const fs = require("node:fs");
const { EmbedBuilder } = require("discord.js");
const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();

module.exports = {
    name: "guildMemberRemove",
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
            serverStats.memberLeaves++;
            serverStats.lastUpdated = new Date().toISOString();
            
            // Save stats
            fs.writeFileSync(serverStatsPath, JSON.stringify(serverStats, null, 4));
            
            // Leave message
            try {
                // Check if a leave channel exists
                const leaveChannel = member.guild.channels.cache.find(
                    channel => channel.name.includes("leave") || channel.name.includes("goodbye") || channel.name.includes("exits")
                );
                
                if (leaveChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle("Member Left")
                        .setDescription(`${member.user.tag} has left the server.`)
                        .setColor("#FF0000")
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: "Joined At", value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` },
                            { name: "Left At", value: `<t:${Math.floor(Date.now() / 1000)}:R>` },
                            { name: "New Member Count", value: `${member.guild.memberCount}` }
                        )
                        .setFooter({ text: `User ID: ${member.id}` })
                        .setTimestamp();
                    
                    await leaveChannel.send({ embeds: [embed] });
                }
            } catch (error) {
                Logger.logRed(`Error sending leave message: ${error}`);
            }
        } catch (error) {
            Logger.logRed(`Error tracking member leave: ${error}`);
        }
    }
};