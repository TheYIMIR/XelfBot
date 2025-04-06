const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const ConfigManager = require("../internal/ConfigManager");
const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();
const config = new ConfigManager();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("View server and user statistics")
        .addSubcommand(subcommand =>
            subcommand
                .setName("server")
                .setDescription("View server statistics"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("user")
                .setDescription("View user statistics")
                .addUserOption(option => 
                    option.setName("user")
                        .setDescription("User to check statistics for")))
        .addSubcommand(subcommand =>
            subcommand
                .setName("messages")
                .setDescription("View message statistics")
                .addUserOption(option => 
                    option.setName("user")
                        .setDescription("User to check message statistics for")))
        .addSubcommand(subcommand =>
            subcommand
                .setName("voice")
                .setDescription("View voice statistics")
                .addUserOption(option => 
                    option.setName("user")
                        .setDescription("User to check voice statistics for"))),
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;
            
            // Load stats
            const serverStats = config.getServerStats(guildId);
            const userStats = config.getUserStats(guildId);
            const messageStats = config.getMessageStats(guildId);
            const voiceStats = config.getVoiceStats(guildId);
            
            // Update command usage count
            serverStats.commandsUsed++;
            serverStats.lastUpdated = new Date().toISOString();
            config.saveServerStats(guildId, serverStats);
            
            switch (subcommand) {
                case "server": {
                    // Get current server stats
                    const memberCount = interaction.guild.memberCount;
                    const botCount = interaction.guild.members.cache.filter(member => member.user.bot).size;
                    const humanCount = memberCount - botCount;
                    const channelCount = interaction.guild.channels.cache.size;
                    const roleCount = interaction.guild.roles.cache.size;
                    const emojiCount = interaction.guild.emojis.cache.size;
                    const boostCount = interaction.guild.premiumSubscriptionCount;
                    const boostLevel = interaction.guild.premiumTier;
                    
                    // Calculate days since creation
                    const creationDate = new Date(interaction.guild.createdAt);
                    const now = new Date();
                    const daysSinceCreation = Math.floor((now - creationDate) / (1000 * 60 * 60 * 24));
                    
                    // Create stats embed
                    const embed = new EmbedBuilder()
                        .setTitle(`${interaction.guild.name} Statistics`)
                        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                        .setColor("#3498db")
                        .addFields(
                            { name: "👥 Member Stats", value: 
                              `Total Members: ${memberCount}\n` +
                              `Humans: ${humanCount}\n` +
                              `Bots: ${botCount}\n` +
                              `Joins: ${serverStats.memberJoins}\n` +
                              `Leaves: ${serverStats.memberLeaves}`, inline: true },
                            { name: "📊 Server Info", value: 
                              `Server Age: ${daysSinceCreation} days\n` +
                              `Channels: ${channelCount}\n` +
                              `Roles: ${roleCount}\n` +
                              `Emojis: ${emojiCount}\n` +
                              `Boost Level: ${boostLevel} (${boostCount} boosts)`, inline: true },
                            { name: "💬 Activity", value: 
                              `Messages Sent: ${serverStats.messagesTotal}\n` +
                              `Voice Minutes: ${serverStats.voiceMinutesTotal}\n` +
                              `Commands Used: ${serverStats.commandsUsed}`, inline: true }
                        )
                        .setFooter({ text: `Server ID: ${interaction.guild.id}` })
                        .setTimestamp();
                    
                    return await interaction.reply({ embeds: [embed] });
                }
                
                case "user": {
                    const user = interaction.options.getUser("user") || interaction.user;
                    const member = interaction.options.getMember("user") || interaction.member;
                    
                    // Initialize user stats if they don't exist
                    if (!userStats[user.id]) {
                        userStats[user.id] = {
                            userId: user.id,
                            username: user.tag,
                            joinedAt: member.joinedAt.toISOString(),
                            messagesTotal: 0,
                            commandsUsed: 0,
                            voiceMinutesTotal: 0,
                            lastActive: new Date().toISOString()
                        };
                        config.saveUserStats(guildId, userStats);
                    }
                    
                    // Update user stats with current username
                    userStats[user.id].username = user.tag;
                    userStats[user.id].lastActive = new Date().toISOString();
                    userStats[user.id].commandsUsed = (userStats[user.id].commandsUsed || 0) + 1;
                    config.saveUserStats(guildId, userStats);
                    
                    // Calculate days since join
                    const joinDate = new Date(member.joinedAt);
                    const now = new Date();
                    const daysSinceJoin = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
                    
                    // Get roles
                    const roles = member.roles.cache.map(role => role).filter(role => role.name !== "@everyone").join(", ") || "None";
                    
                    // Get user-specific message stats
                    const userMessageStats = messageStats[user.id] || { total: 0, channels: {} };
                    
                    // Get user-specific voice stats
                    const userVoiceStats = voiceStats[user.id] || { totalMinutes: 0, channels: {} };
                    
                    // Create stats embed
                    const embed = new EmbedBuilder()
                        .setTitle(`${user.tag} Statistics`)
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                        .setColor(member.displayHexColor || "#3498db")
                        .addFields(
                            { name: "👤 User Info", value: 
                              `Account Created: <t:${Math.floor(user.createdAt.getTime() / 1000)}:R>\n` +
                              `Joined Server: <t:${Math.floor(joinDate.getTime() / 1000)}:R>\n` +
                              `Days in Server: ${daysSinceJoin}`, inline: true },
                            { name: "📊 Activity Stats", value: 
                              `Messages Sent: ${userStats[user.id].messagesTotal || 0}\n` +
                              `Voice Minutes: ${userStats[user.id].voiceMinutesTotal || 0}\n` +
                              `Commands Used: ${userStats[user.id].commandsUsed || 0}\n` +
                              `Last Active: <t:${Math.floor(new Date(userStats[user.id].lastActive).getTime() / 1000)}:R>`, inline: true },
                            { name: "🏆 Roles", value: roles.length > 1024 ? roles.substring(0, 1021) + "..." : roles || "None" }
                        )
                        .setFooter({ text: `User ID: ${user.id}` })
                        .setTimestamp();
                    
                    return await interaction.reply({ embeds: [embed] });
                }
                
                case "messages": {
                    const user = interaction.options.getUser("user") || interaction.user;
                    
                    // Get user-specific message stats
                    const userMessageStats = messageStats[user.id] || { 
                        total: 0, 
                        channels: {},
                        hourlyActivity: Array(24).fill(0), 
                        dailyActivity: Array(7).fill(0)
                    };
                    
                    // Get top channels
                    const topChannels = Object.entries(userMessageStats.channels || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([channelId, count], index) => {
                            const channel = interaction.guild.channels.cache.get(channelId);
                            return `${index + 1}. ${channel ? `<#${channelId}>` : "Unknown Channel"}: ${count} messages`;
                        })
                        .join("\n") || "No message data yet";
                    
                    // Create days of week labels
                    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    const dailyData = (userMessageStats.dailyActivity || Array(7).fill(0))
                        .map((count, index) => `${days[index]}: ${count} messages`)
                        .join("\n");
                    
                    // Create hourly activity string
                    const hourlyData = (userMessageStats.hourlyActivity || Array(24).fill(0))
                        .map((count, index) => `${index.toString().padStart(2, '0')}:00 - ${(index + 1) % 24 === 0 ? '00' : (index + 1).toString().padStart(2, '0')}:00: ${count} messages`)
                        .join("\n");
                    
                    // Create stats embed
                    const embed = new EmbedBuilder()
                        .setTitle(`${user.tag} Message Statistics`)
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                        .setColor("#3498db")
                        .addFields(
                            { name: "💬 Message Count", value: `Total Messages: ${userMessageStats.total || 0}` },
                            { name: "📊 Top Channels", value: topChannels },
                            { name: "📅 Daily Activity", value: dailyData }
                        )
                        .setFooter({ text: `User ID: ${user.id}` })
                        .setTimestamp();
                    
                    // Create a second embed for hourly data (to avoid hitting field limits)
                    const hourlyEmbed = new EmbedBuilder()
                        .setTitle(`${user.tag} Hourly Activity`)
                        .setColor("#3498db")
                        .setDescription(hourlyData)
                        .setFooter({ text: `User ID: ${user.id}` });
                    
                    return await interaction.reply({ embeds: [embed, hourlyEmbed] });
                }
                
                case "voice": {
                    const user = interaction.options.getUser("user") || interaction.user;
                    
                    // Get user-specific voice stats
                    const userVoiceStats = voiceStats[user.id] || { 
                        totalMinutes: 0, 
                        channels: {}, 
                        sessions: [] 
                    };
                    
                    // Get top channels
                    const topChannels = Object.entries(userVoiceStats.channels || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([channelId, minutes], index) => {
                            const channel = interaction.guild.channels.cache.get(channelId);
                            return `${index + 1}. ${channel ? channel.name : "Unknown Channel"}: ${minutes} minutes`;
                        })
                        .join("\n") || "No voice data yet";
                    
                    // Get recent sessions
                    const recentSessions = (userVoiceStats.sessions || [])
                        .slice(-5)
                        .reverse()
                        .map((session, index) => {
                            const channel = interaction.guild.channels.cache.get(session.channelId);
                            const start = new Date(session.start);
                            const end = session.end ? new Date(session.end) : "Still Active";
                            const duration = session.end 
                                ? Math.floor((new Date(session.end) - new Date(session.start)) / (1000 * 60)) 
                                : Math.floor((new Date() - new Date(session.start)) / (1000 * 60));
                            
                            return `${index + 1}. ${channel ? channel.name : "Unknown Channel"}: ${duration} minutes\n   Started: <t:${Math.floor(start.getTime() / 1000)}:R>`;
                        })
                        .join("\n") || "No recent sessions";
                    
                    // Create stats embed
                    const embed = new EmbedBuilder()
                        .setTitle(`${user.tag} Voice Statistics`)
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                        .setColor("#3498db")
                        .addFields(
                            { name: "🎙️ Voice Activity", value: `Total Time: ${userVoiceStats.totalMinutes || 0} minutes` },
                            { name: "📊 Top Channels", value: topChannels },
                            { name: "🕒 Recent Sessions", value: recentSessions }
                        )
                        .setFooter({ text: `User ID: ${user.id}` })
                        .setTimestamp();
                    
                    return await interaction.reply({ embeds: [embed] });
                }
            }
        } catch (error) {
            Logger.logRed(error);
            return await interaction.reply({ content: "An error occurred while executing the command.", ephemeral: true });
        }
    }
};