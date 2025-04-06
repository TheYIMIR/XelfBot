const fs = require('node:fs');
const path = require('node:path');
const LoggerClass = require('./Logger');
const Logger = new LoggerClass();

class ConfigManager {
    constructor() {
        // Ensure data directory exists
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data');
        }
        
        // Create guilds directory for guild-specific data
        if (!fs.existsSync('./data/guilds')) {
            fs.mkdirSync('./data/guilds');
        }
    }

    /**
     * Ensures a guild directory exists
     * @param {string} guildId - The Discord guild ID
     */
    ensureGuildDirectory(guildId) {
        const guildPath = path.join('./data/guilds', guildId);
        if (!fs.existsSync(guildPath)) {
            fs.mkdirSync(guildPath);
            
            // Create subdirectories for different systems
            fs.mkdirSync(path.join(guildPath, 'tickets'));
            fs.mkdirSync(path.join(guildPath, 'tickets/transcripts'));
            fs.mkdirSync(path.join(guildPath, 'stats'));
            
            Logger.logGreen(`Created directory structure for guild: ${guildId}`);
        }
        return guildPath;
    }

    /**
     * Gets a guild configuration
     * @param {string} guildId - The Discord guild ID
     * @param {string} configType - Type of configuration (e.g., 'ticket', 'voice', etc.)
     */
    getGuildConfig(guildId, configType) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const configPath = path.join(guildPath, `${configType}-config.json`);

        if (!fs.existsSync(configPath)) {
            // Return empty config
            return {};
        }

        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch (error) {
            Logger.logRed(`Error reading ${configType} config for guild ${guildId}: ${error}`);
            return {};
        }
    }

    /**
     * Saves a guild configuration
     * @param {string} guildId - The Discord guild ID
     * @param {string} configType - Type of configuration (e.g., 'ticket', 'voice', etc.)
     * @param {Object} data - Configuration data to save
     */
    saveGuildConfig(guildId, configType, data) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const configPath = path.join(guildPath, `${configType}-config.json`);

        try {
            fs.writeFileSync(configPath, JSON.stringify(data, null, 4));
            Logger.logGreen(`Saved ${configType} config for guild ${guildId}`);
            return true;
        } catch (error) {
            Logger.logRed(`Error saving ${configType} config for guild ${guildId}: ${error}`);
            return false;
        }
    }

    /**
     * Gets a ticket data
     * @param {string} guildId - The Discord guild ID
     * @param {string} ticketId - The ticket channel ID
     */
    getTicketData(guildId, ticketId) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const ticketPath = path.join(guildPath, 'tickets', `${ticketId}.json`);

        if (!fs.existsSync(ticketPath)) {
            return null;
        }

        try {
            return JSON.parse(fs.readFileSync(ticketPath, 'utf-8'));
        } catch (error) {
            Logger.logRed(`Error reading ticket data for ${ticketId} in guild ${guildId}: ${error}`);
            return null;
        }
    }

    /**
     * Saves ticket data
     * @param {string} guildId - The Discord guild ID
     * @param {string} ticketId - The ticket channel ID
     * @param {Object} data - Ticket data to save
     */
    saveTicketData(guildId, ticketId, data) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const ticketPath = path.join(guildPath, 'tickets', `${ticketId}.json`);

        try {
            fs.writeFileSync(ticketPath, JSON.stringify(data, null, 4));
            return true;
        } catch (error) {
            Logger.logRed(`Error saving ticket data for ${ticketId} in guild ${guildId}: ${error}`);
            return false;
        }
    }

    /**
     * Deletes ticket data
     * @param {string} guildId - The Discord guild ID
     * @param {string} ticketId - The ticket channel ID
     */
    deleteTicketData(guildId, ticketId) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const ticketPath = path.join(guildPath, 'tickets', `${ticketId}.json`);

        if (fs.existsSync(ticketPath)) {
            try {
                fs.unlinkSync(ticketPath);
                return true;
            } catch (error) {
                Logger.logRed(`Error deleting ticket data for ${ticketId} in guild ${guildId}: ${error}`);
                return false;
            }
        }
        return false;
    }

    /**
     * Saves a ticket transcript
     * @param {string} guildId - The Discord guild ID
     * @param {string} ticketId - The ticket channel ID
     * @param {string} transcript - Transcript content
     */
    saveTicketTranscript(guildId, ticketId, transcript) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const transcriptPath = path.join(guildPath, 'tickets/transcripts', `${ticketId}.txt`);

        try {
            fs.writeFileSync(transcriptPath, transcript);
            return transcriptPath;
        } catch (error) {
            Logger.logRed(`Error saving transcript for ${ticketId} in guild ${guildId}: ${error}`);
            return null;
        }
    }

    /**
     * Gets voice channel data
     * @param {string} guildId - The Discord guild ID
     */
    getVoiceChannels(guildId) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const voiceChannelsPath = path.join(guildPath, 'voice-channels.json');

        if (!fs.existsSync(voiceChannelsPath)) {
            fs.writeFileSync(voiceChannelsPath, JSON.stringify({}, null, 4));
            return {};
        }

        try {
            return JSON.parse(fs.readFileSync(voiceChannelsPath, 'utf-8'));
        } catch (error) {
            Logger.logRed(`Error reading voice channels for guild ${guildId}: ${error}`);
            return {};
        }
    }

    /**
     * Saves voice channel data
     * @param {string} guildId - The Discord guild ID
     * @param {Object} channelsData - Voice channels data
     */
    saveVoiceChannels(guildId, channelsData) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const voiceChannelsPath = path.join(guildPath, 'voice-channels.json');

        try {
            fs.writeFileSync(voiceChannelsPath, JSON.stringify(channelsData, null, 4));
            return true;
        } catch (error) {
            Logger.logRed(`Error saving voice channels for guild ${guildId}: ${error}`);
            return false;
        }
    }

    /**
     * Gets server stats
     * @param {string} guildId - The Discord guild ID
     */
    getServerStats(guildId) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const statsPath = path.join(guildPath, 'stats', 'server.json');

        if (!fs.existsSync(statsPath)) {
            // Initialize with default stats
            const serverStats = {
                guildId: guildId,
                created: new Date().toISOString(),
                memberJoins: 0,
                memberLeaves: 0,
                messagesTotal: 0,
                voiceMinutesTotal: 0,
                commandsUsed: 0,
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(statsPath, JSON.stringify(serverStats, null, 4));
            return serverStats;
        }

        try {
            return JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
        } catch (error) {
            Logger.logRed(`Error reading server stats for guild ${guildId}: ${error}`);
            return null;
        }
    }

    /**
     * Saves server stats
     * @param {string} guildId - The Discord guild ID
     * @param {Object} statsData - Server stats data
     */
    saveServerStats(guildId, statsData) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const statsPath = path.join(guildPath, 'stats', 'server.json');

        try {
            fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 4));
            return true;
        } catch (error) {
            Logger.logRed(`Error saving server stats for guild ${guildId}: ${error}`);
            return false;
        }
    }

    /**
     * Gets user stats
     * @param {string} guildId - The Discord guild ID
     */
    getUserStats(guildId) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const statsPath = path.join(guildPath, 'stats', 'users.json');

        if (!fs.existsSync(statsPath)) {
            fs.writeFileSync(statsPath, JSON.stringify({}, null, 4));
            return {};
        }

        try {
            return JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
        } catch (error) {
            Logger.logRed(`Error reading user stats for guild ${guildId}: ${error}`);
            return {};
        }
    }

    /**
     * Saves user stats
     * @param {string} guildId - The Discord guild ID
     * @param {Object} statsData - User stats data
     */
    saveUserStats(guildId, statsData) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const statsPath = path.join(guildPath, 'stats', 'users.json');

        try {
            fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 4));
            return true;
        } catch (error) {
            Logger.logRed(`Error saving user stats for guild ${guildId}: ${error}`);
            return false;
        }
    }

    /**
     * Gets message stats
     * @param {string} guildId - The Discord guild ID
     */
    getMessageStats(guildId) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const statsPath = path.join(guildPath, 'stats', 'messages.json');

        if (!fs.existsSync(statsPath)) {
            fs.writeFileSync(statsPath, JSON.stringify({}, null, 4));
            return {};
        }

        try {
            return JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
        } catch (error) {
            Logger.logRed(`Error reading message stats for guild ${guildId}: ${error}`);
            return {};
        }
    }

    /**
     * Saves message stats
     * @param {string} guildId - The Discord guild ID
     * @param {Object} statsData - Message stats data
     */
    saveMessageStats(guildId, statsData) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const statsPath = path.join(guildPath, 'stats', 'messages.json');

        try {
            fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 4));
            return true;
        } catch (error) {
            Logger.logRed(`Error saving message stats for guild ${guildId}: ${error}`);
            return false;
        }
    }

    /**
     * Gets voice stats
     * @param {string} guildId - The Discord guild ID
     */
    getVoiceStats(guildId) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const statsPath = path.join(guildPath, 'stats', 'voice.json');

        if (!fs.existsSync(statsPath)) {
            fs.writeFileSync(statsPath, JSON.stringify({}, null, 4));
            return {};
        }

        try {
            return JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
        } catch (error) {
            Logger.logRed(`Error reading voice stats for guild ${guildId}: ${error}`);
            return {};
        }
    }

    /**
     * Saves voice stats
     * @param {string} guildId - The Discord guild ID
     * @param {Object} statsData - Voice stats data
     */
    saveVoiceStats(guildId, statsData) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const statsPath = path.join(guildPath, 'stats', 'voice.json');

        try {
            fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 4));
            return true;
        } catch (error) {
            Logger.logRed(`Error saving voice stats for guild ${guildId}: ${error}`);
            return false;
        }
    }

    /**
     * Gets warning data for a guild
     * @param {string} guildId - The Discord guild ID
     */
    getWarnings(guildId) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const warningsPath = path.join(guildPath, 'warnings.json');

        if (!fs.existsSync(warningsPath)) {
            fs.writeFileSync(warningsPath, JSON.stringify({}, null, 4));
            return {};
        }

        try {
            return JSON.parse(fs.readFileSync(warningsPath, 'utf-8'));
        } catch (error) {
            Logger.logRed(`Error reading warnings for guild ${guildId}: ${error}`);
            return {};
        }
    }

    /**
     * Saves warning data for a guild
     * @param {string} guildId - The Discord guild ID
     * @param {Object} warningsData - Warning data
     */
    saveWarnings(guildId, warningsData) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const warningsPath = path.join(guildPath, 'warnings.json');

        try {
            fs.writeFileSync(warningsPath, JSON.stringify(warningsData, null, 4));
            return true;
        } catch (error) {
            Logger.logRed(`Error saving warnings for guild ${guildId}: ${error}`);
            return false;
        }
    }
}

module.exports = ConfigManager;