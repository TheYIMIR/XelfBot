const { ChannelType, PermissionFlagsBits } = require("discord.js");
const ConfigManager = require("../internal/ConfigManager");
const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();
const config = new ConfigManager();

module.exports = {
    name: "voiceStateUpdate",
    async execute(oldState, newState) {
        try {
            const guildId = newState.guild.id;
            
            // Load voice configuration
            const voiceConfig = config.getGuildConfig(guildId, "voice");
            
            // Skip if the setup hasn't been done
            if (!voiceConfig || !voiceConfig.createChannel) {
                return;
            }
            
            // Load voice channels
            const voiceChannels = config.getVoiceChannels(guildId);
            
            // Update voice stats
            await updateVoiceStats(oldState, newState);
            
            // Handle user joining the create channel
            if (newState.channelId === voiceConfig.createChannel && oldState.channelId !== newState.channelId) {
                // Create a new voice channel for the user
                const channel = await newState.guild.channels.create({
                    name: `${newState.member.displayName}'s Channel`,
                    type: ChannelType.GuildVoice,
                    parent: voiceConfig.category,
                    permissionOverwrites: [
                        {
                            id: newState.guild.roles.everyone.id,
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
                        },
                        {
                            id: newState.member.id,
                            allow: [
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers,
                                PermissionFlagsBits.MoveMembers
                            ]
                        }
                    ]
                });
                
                // Move the user to their new channel
                await newState.member.voice.setChannel(channel);
                
                // Save the channel to the voice channels file
                voiceChannels[channel.id] = {
                    id: channel.id,
                    owner: newState.member.id,
                    ownerTag: newState.member.user.tag,
                    name: channel.name,
                    createdAt: new Date().toISOString(),
                    userLimit: 0,
                    locked: false
                };
                
                config.saveVoiceChannels(guildId, voiceChannels);
                
                Logger.logGreen(`Created voice channel ${channel.name} for ${newState.member.user.tag}`);
            }
            
            // Handle voice channel deletion when empty
            if (oldState.channelId && oldState.channelId !== voiceConfig.createChannel && voiceChannels[oldState.channelId]) {
                const channel = oldState.guild.channels.cache.get(oldState.channelId);
                
                // Check if the channel exists and is empty
                if (channel && channel.members.size === 0) {
                    // Remove the channel from the voice channels file
                    delete voiceChannels[oldState.channelId];
                    config.saveVoiceChannels(guildId, voiceChannels);
                    
                    // Delete the channel
                    await channel.delete("Voice channel empty");
                    Logger.logGreen(`Deleted empty voice channel ${channel.name}`);
                }
            }
        } catch (error) {
            Logger.logRed(error);
        }
    }
};

// Function to update voice stats
async function updateVoiceStats(oldState, newState) {
    try {
        // Skip if bot user
        if (newState.member.user.bot) return;
        
        const guildId = newState.guild.id;
        
        // Load stats
        const serverStats = config.getServerStats(guildId);
        const voiceStats = config.getVoiceStats(guildId);
        const userStats = config.getUserStats(guildId);
        
        // Handle user joining voice
        if (!oldState.channelId && newState.channelId) {
            // Initialize user voice stats if they don't exist
            if (!voiceStats[newState.member.id]) {
                voiceStats[newState.member.id] = {
                    userId: newState.member.id,
                    username: newState.member.user.tag,
                    totalMinutes: 0,
                    channels: {},
                    sessions: []
                };
            }
            
            // Add new session
            voiceStats[newState.member.id].sessions.push({
                channelId: newState.channelId,
                start: new Date().toISOString(),
                end: null
            });
            
            // Keep only last 20 sessions
            if (voiceStats[newState.member.id].sessions.length > 20) {
                voiceStats[newState.member.id].sessions.shift();
            }
            
            // Save voice stats
            config.saveVoiceStats(guildId, voiceStats);
        }
        
        // Handle user leaving voice
        if (oldState.channelId && !newState.channelId) {
            // Initialize user voice stats if they don't exist (shouldn't happen but just in case)
            if (!voiceStats[oldState.member.id]) {
                voiceStats[oldState.member.id] = {
                    userId: oldState.member.id,
                    username: oldState.member.user.tag,
                    totalMinutes: 0,
                    channels: {},
                    sessions: []
                };
            }
            
            // Find the current session
            const currentSession = voiceStats[oldState.member.id].sessions.find(
                session => session.channelId === oldState.channelId && !session.end
            );
            
            if (currentSession) {
                // Calculate session duration in minutes
                const start = new Date(currentSession.start);
                const end = new Date();
                const durationMinutes = Math.floor((end - start) / (1000 * 60));
                
                // Update session
                currentSession.end = end.toISOString();
                
                // Update channel stats
                if (!voiceStats[oldState.member.id].channels[oldState.channelId]) {
                    voiceStats[oldState.member.id].channels[oldState.channelId] = 0;
                }
                voiceStats[oldState.member.id].channels[oldState.channelId] += durationMinutes;
                
                // Update total minutes
                voiceStats[oldState.member.id].totalMinutes += durationMinutes;
                
                // Update server stats
                serverStats.voiceMinutesTotal += durationMinutes;
                serverStats.lastUpdated = new Date().toISOString();
                
                // Update user stats
                if (!userStats[oldState.member.id]) {
                    userStats[oldState.member.id] = {
                        userId: oldState.member.id,
                        username: oldState.member.user.tag,
                        joinedAt: oldState.member.joinedAt.toISOString(),
                        messagesTotal: 0,
                        commandsUsed: 0,
                        voiceMinutesTotal: 0,
                        lastActive: new Date().toISOString()
                    };
                }
                userStats[oldState.member.id].voiceMinutesTotal += durationMinutes;
                userStats[oldState.member.id].lastActive = new Date().toISOString();
                
                // Update username in case it changed
                voiceStats[oldState.member.id].username = oldState.member.user.tag;
                userStats[oldState.member.id].username = oldState.member.user.tag;
                
                // Save stats
                config.saveVoiceStats(guildId, voiceStats);
                config.saveServerStats(guildId, serverStats);
                config.saveUserStats(guildId, userStats);
            }
        }
        
        // Handle user switching channels
        if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            // Initialize user voice stats if they don't exist
            if (!voiceStats[newState.member.id]) {
                voiceStats[newState.member.id] = {
                    userId: newState.member.id,
                    username: newState.member.user.tag,
                    totalMinutes: 0,
                    channels: {},
                    sessions: []
                };
            }
            
            // Find the current session
            const currentSession = voiceStats[oldState.member.id].sessions.find(
                session => session.channelId === oldState.channelId && !session.end
            );
            
            if (currentSession) {
                // Calculate session duration in minutes
                const start = new Date(currentSession.start);
                const end = new Date();
                const durationMinutes = Math.floor((end - start) / (1000 * 60));
                
                // Update session
                currentSession.end = end.toISOString();
                
                // Update channel stats
                if (!voiceStats[oldState.member.id].channels[oldState.channelId]) {
                    voiceStats[oldState.member.id].channels[oldState.channelId] = 0;
                }
                voiceStats[oldState.member.id].channels[oldState.channelId] += durationMinutes;
                
                // Update total minutes
                voiceStats[oldState.member.id].totalMinutes += durationMinutes;
                
                // Update server stats
                serverStats.voiceMinutesTotal += durationMinutes;
                serverStats.lastUpdated = new Date().toISOString();
                
                // Update user stats
                if (!userStats[oldState.member.id]) {
                    userStats[oldState.member.id] = {
                        userId: oldState.member.id,
                        username: oldState.member.user.tag,
                        joinedAt: oldState.member.joinedAt.toISOString(),
                        messagesTotal: 0,
                        commandsUsed: 0,
                        voiceMinutesTotal: 0,
                        lastActive: new Date().toISOString()
                    };
                }
                userStats[oldState.member.id].voiceMinutesTotal += durationMinutes;
                userStats[oldState.member.id].lastActive = new Date().toISOString();
            }
            
            // Add new session for the new channel
            voiceStats[newState.member.id].sessions.push({
                channelId: newState.channelId,
                start: new Date().toISOString(),
                end: null
            });
            
            // Keep only last 20 sessions
            if (voiceStats[newState.member.id].sessions.length > 20) {
                voiceStats[newState.member.id].sessions.shift();
            }
            
            // Update username in case it changed
            voiceStats[newState.member.id].username = newState.member.user.tag;
            userStats[newState.member.id].username = newState.member.user.tag;
            
            // Save stats
            config.saveVoiceStats(guildId, voiceStats);
            config.saveServerStats(guildId, serverStats);
            config.saveUserStats(guildId, userStats);
        }
    } catch (error) {
        Logger.logRed(`Error updating voice stats: ${error}`);
    }
}