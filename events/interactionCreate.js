const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder } = require("discord.js");
const ConfigManager = require("../internal/ConfigManager");
const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();
const config = new ConfigManager();

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        try {
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);

                if (!command) {
                    Logger.logGreen("Command not found!");
                    return;
                }

                try {
                    await command.execute(interaction);
                } catch (error) {
                    Logger.logRed(error);
                    await interaction.reply({ content: "Error while executing command.", ephemeral: true }).catch(() => {});
                }
            }
            
            // Handle button interactions
            else if (interaction.isButton()) {
                // Ticket creation button
                if (interaction.customId === "create_ticket") {
                    await handleTicketCreation(interaction);
                }
                
                // Ticket close button
                else if (interaction.customId === "close_ticket") {
                    await handleTicketClose(interaction);
                }
                
                // Voice system buttons
                else if (interaction.customId.startsWith("voice_")) {
                    await handleVoiceButtons(interaction);
                }
                
                // Help menu buttons - add any other buttons here
                else if (interaction.customId.startsWith("help_")) {
                    // Handle help button interactions 
                    // These would be custom help navigation buttons if implemented
                }
            }
            
            // Handle select menu interactions
            else if (interaction.isStringSelectMenu()) {
                // Help category selection menu
                if (interaction.customId === "help_category") {
                    await handleHelpCategorySelect(interaction);
                }
                
                // Voice channel owner transfer menu
                else if (interaction.customId === "voice_transfer_select") {
                    await handleVoiceTransferSelect(interaction);
                }
                
                // Voice channel kick menu
                else if (interaction.customId === "voice_kick_select") {
                    await handleVoiceKickSelect(interaction);
                }
            }
            
            // Handle modal submissions
            else if (interaction.isModalSubmit()) {
                // Ticket modal
                if (interaction.customId === "ticket_modal") {
                    await handleTicketModal(interaction);
                }
                
                // Voice modal - channel limit
                else if (interaction.customId === "voice_limit_modal") {
                    await handleVoiceLimitModal(interaction);
                }
                
                // Voice modal - channel name
                else if (interaction.customId === "voice_name_modal") {
                    await handleVoiceNameModal(interaction);
                }
            }
        } catch (error) {
            Logger.logRed(error);
            
            // Try to respond to the interaction if it hasn't been acknowledged
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "An error occurred while processing your interaction.",
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};

// TICKET SYSTEM FUNCTIONS
// Handle ticket creation
async function handleTicketCreation(interaction) {
    const guildId = interaction.guild.id;
    
    // Load ticket configuration
    const ticketConfig = config.getGuildConfig(guildId, "ticket");
    
    // Check if config exists
    if (!ticketConfig || !ticketConfig.category || !ticketConfig.supportRole) {
        return await interaction.reply({
            content: "The ticket system has not been set up yet. Please ask an administrator to set it up.",
            ephemeral: true
        });
    }
    
    // Check if the user already has an open ticket
    const ticketData = Object.values(config.getGuildConfig(guildId, "tickets") || {})
        .find(ticket => ticket.creator === interaction.user.id && ticket.status === "open");
    
    if (ticketData) {
        return await interaction.reply({
            content: `You already have an open ticket: <#${ticketData.channelId}>`,
            ephemeral: true
        });
    }
    
    // Increment ticket counter
    ticketConfig.ticketCounter = (ticketConfig.ticketCounter || 0) + 1;
    config.saveGuildConfig(guildId, "ticket", ticketConfig);
    
    // Create the ticket channel
    const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${ticketConfig.ticketCounter}`,
        type: ChannelType.GuildText,
        parent: ticketConfig.category,
        permissionOverwrites: [
            {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            },
            {
                id: ticketConfig.supportRole,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            }
        ]
    });
    
    // Create ticket data
    const newTicketData = {
        ticketId: ticketConfig.ticketCounter,
        channelId: ticketChannel.id,
        creator: interaction.user.id,
        creatorTag: interaction.user.tag,
        createdAt: new Date().toISOString(),
        status: "open"
    };
    
    // Save ticket data
    config.saveTicketData(guildId, ticketChannel.id, newTicketData);
    
    // Create welcome embed
    const embed = new EmbedBuilder()
        .setTitle(`Ticket #${ticketConfig.ticketCounter}`)
        .setDescription(`Hello ${interaction.user}, welcome to your ticket. Please describe your issue and a staff member will be with you shortly.`)
        .setColor("#3498db")
        .setFooter({ text: "StreamBot Support System" })
        .setTimestamp();
    
    // Create ticket controls
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("Close Ticket")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🔒")
        );
    
    await ticketChannel.send({ content: `${interaction.user} | <@&${ticketConfig.supportRole}>`, embeds: [embed], components: [row] });
    
    // Notify the user
    await interaction.reply({
        content: `Your ticket has been created: ${ticketChannel}`,
        ephemeral: true
    });
}

// Handle ticket close
async function handleTicketClose(interaction) {
    const guildId = interaction.guild.id;
    
    // Check if the channel is a ticket
    const ticketData = config.getTicketData(guildId, interaction.channel.id);
    if (!ticketData) {
        return await interaction.reply({
            content: "This is not a ticket channel.",
            ephemeral: true
        });
    }
    
    // Create a transcript
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    let transcript = "Ticket Transcript\n\n";
    
    messages.reverse().forEach(msg => {
        transcript += `${msg.author.tag} (${msg.createdAt.toLocaleString()}):\n${msg.content}\n\n`;
    });
    
    const transcriptPath = config.saveTicketTranscript(guildId, interaction.channel.id, transcript);
    
    // Notify the user who created the ticket
    try {
        const creator = await interaction.client.users.fetch(ticketData.creator);
        await creator.send({
            content: `Your ticket (${interaction.channel.name}) has been closed.`,
            files: [{
                attachment: transcriptPath,
                name: `transcript-${interaction.channel.name}.txt`
            }]
        });
    } catch (error) {
        Logger.logRed(`Could not DM ticket creator: ${error}`);
    }
    
    // Delete the ticket data
    config.deleteTicketData(guildId, interaction.channel.id);
    
    await interaction.reply({ content: "Closing ticket in 5 seconds..." });
    
    // Delete the channel after 5 seconds
    setTimeout(() => {
        interaction.channel.delete().catch(error => {
            Logger.logRed(`Error deleting ticket channel: ${error}`);
        });
    }, 5000);
}

// VOICE CHANNEL FUNCTIONS
// Handle voice button interactions
async function handleVoiceButtons(interaction) {
    const guildId = interaction.guild.id;
    
    // Load voice channels
    const voiceChannels = config.getVoiceChannels(guildId);
    
    // Check if the user is in a voice channel
    if (!interaction.member.voice.channel) {
        return await interaction.reply({
            content: "You must be in a voice channel to use these controls.",
            ephemeral: true
        });
    }
    
    const channelId = interaction.member.voice.channel.id;
    
    // Check if the channel is a custom voice channel
    if (!voiceChannels[channelId]) {
        return await interaction.reply({
            content: "This is not a custom voice channel.",
            ephemeral: true
        });
    }
    
    // Handle different button actions
    switch (interaction.customId) {
        case "voice_lock": {
            // Check if the user is the owner
            if (voiceChannels[channelId].owner !== interaction.user.id) {
                return await interaction.reply({
                    content: "Only the channel owner can lock the channel.",
                    ephemeral: true
                });
            }
            
            // Lock the channel
            await interaction.member.voice.channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
                Connect: false
            });
            
            // Update channel status
            voiceChannels[channelId].locked = true;
            config.saveVoiceChannels(guildId, voiceChannels);
            
            return await interaction.reply({
                content: "Your voice channel has been locked.",
                ephemeral: true
            });
        }
        
        case "voice_unlock": {
            // Check if the user is the owner
            if (voiceChannels[channelId].owner !== interaction.user.id) {
                return await interaction.reply({
                    content: "Only the channel owner can unlock the channel.",
                    ephemeral: true
                });
            }
            
            // Unlock the channel
            await interaction.member.voice.channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
                Connect: true
            });
            
            // Update channel status
            voiceChannels[channelId].locked = false;
            config.saveVoiceChannels(guildId, voiceChannels);
            
            return await interaction.reply({
                content: "Your voice channel has been unlocked.",
                ephemeral: true
            });
        }
        
        case "voice_limit": {
            // Check if the user is the owner
            if (voiceChannels[channelId].owner !== interaction.user.id) {
                return await interaction.reply({
                    content: "Only the channel owner can set the user limit.",
                    ephemeral: true
                });
            }
            
            // Create a modal to input the limit
            const modal = {
                title: "Set User Limit",
                custom_id: "voice_limit_modal",
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                custom_id: "limit",
                                label: "User Limit (0 for unlimited)",
                                style: 1,
                                min_length: 1,
                                max_length: 2,
                                placeholder: "Enter a number (0-99)",
                                required: true
                            }
                        ]
                    }
                ]
            };
            
            await interaction.showModal(modal);
            return;
        }
        
        case "voice_name": {
            // Check if the user is the owner
            if (voiceChannels[channelId].owner !== interaction.user.id) {
                return await interaction.reply({
                    content: "Only the channel owner can change the channel name.",
                    ephemeral: true
                });
            }
            
            // Create a modal to input the name
            const modal = {
                title: "Change Channel Name",
                custom_id: "voice_name_modal",
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                custom_id: "name",
                                label: "Channel Name",
                                style: 1,
                                min_length: 1,
                                max_length: 100,
                                placeholder: "Enter a new channel name",
                                required: true
                            }
                        ]
                    }
                ]
            };
            
            await interaction.showModal(modal);
            return;
        }
        
        case "voice_info": {
            // Get channel information
            const channel = interaction.member.voice.channel;
            const owner = await interaction.guild.members.fetch(voiceChannels[channelId].owner).catch(() => null);
            
            // Create info embed
            const embed = new EmbedBuilder()
                .setTitle(`${channel.name} - Channel Info`)
                .setColor("#3498db")
                .addFields(
                    { name: "Owner", value: owner ? `${owner.user.tag} (${owner.user.id})` : "Unknown User" },
                    { name: "Created At", value: `<t:${Math.floor(new Date(voiceChannels[channelId].createdAt).getTime() / 1000)}:R>` },
                    { name: "User Limit", value: channel.userLimit > 0 ? channel.userLimit.toString() : "Unlimited" },
                    { name: "Status", value: voiceChannels[channelId].locked ? "🔒 Locked" : "🔓 Unlocked" },
                    { name: "Members", value: channel.members.size > 0 ? 
                        channel.members.map(m => `${m.user.tag}${m.id === voiceChannels[channelId].owner ? " (Owner)" : ""}`).join("\n") : 
                        "No members" }
                )
                .setFooter({ text: `Channel ID: ${channelId}` })
                .setTimestamp();
            
            return await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        }
        
        case "voice_transfer": {
            // Check if the user is the owner
            if (voiceChannels[channelId].owner !== interaction.user.id) {
                return await interaction.reply({
                    content: "Only the channel owner can transfer ownership.",
                    ephemeral: true
                });
            }
            
            // Create a selection menu with channel members
            const members = interaction.member.voice.channel.members
                .filter(m => !m.user.bot && m.id !== interaction.user.id)
                .map(m => ({
                    label: m.user.tag,
                    value: m.id,
                    description: `Transfer ownership to ${m.user.username}`,
                }));
            
            if (members.length === 0) {
                return await interaction.reply({
                    content: "There are no other members in the channel to transfer ownership to.",
                    ephemeral: true
                });
            }
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("voice_transfer_select")
                        .setPlaceholder("Select a member")
                        .addOptions(members)
                );
            
            return await interaction.reply({
                content: "Select a member to transfer ownership to:",
                components: [row],
                ephemeral: true
            });
        }
        
        case "voice_kick": {
            // Check if the user is the owner
            if (voiceChannels[channelId].owner !== interaction.user.id) {
                return await interaction.reply({
                    content: "Only the channel owner can kick members.",
                    ephemeral: true
                });
            }
            
            // Create a selection menu with channel members
            const members = interaction.member.voice.channel.members
                .filter(m => !m.user.bot && m.id !== interaction.user.id && 
                       !m.permissions.has(PermissionFlagsBits.Administrator) && 
                       !m.permissions.has(PermissionFlagsBits.ModerateMembers))
                .map(m => ({
                    label: m.user.tag,
                    value: m.id,
                    description: `Kick ${m.user.username} from the channel`,
                }));
            
            if (members.length === 0) {
                return await interaction.reply({
                    content: "There are no members you can kick from the channel.",
                    ephemeral: true
                });
            }
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("voice_kick_select")
                        .setPlaceholder("Select a member")
                        .addOptions(members)
                );
            
            return await interaction.reply({
                content: "Select a member to kick from your channel:",
                components: [row],
                ephemeral: true
            });
        }
        
        case "voice_claim": {
            // Check if the channel owner is still in the channel
            const owner = interaction.member.voice.channel.members.get(voiceChannels[channelId].owner);
            
            if (owner) {
                return await interaction.reply({
                    content: "You cannot claim this channel while the owner is still in the channel.",
                    ephemeral: true
                });
            }
            
            // Transfer ownership
            voiceChannels[channelId].owner = interaction.user.id;
            voiceChannels[channelId].ownerTag = interaction.user.tag;
            config.saveVoiceChannels(guildId, voiceChannels);
            
            return await interaction.reply({
                content: "You are now the owner of this channel.",
                ephemeral: true
            });
        }
    }
}

// Handle voice channel owner transfer selection
async function handleVoiceTransferSelect(interaction) {
    const guildId = interaction.guild.id;
    
    // Load voice channels
    const voiceChannels = config.getVoiceChannels(guildId);
    
    // Check if the user is in a voice channel
    if (!interaction.member.voice.channel) {
        return await interaction.reply({
            content: "You must be in a voice channel to use this.",
            ephemeral: true
        });
    }
    
    const channelId = interaction.member.voice.channel.id;
    
    // Check if the channel is a custom voice channel
    if (!voiceChannels[channelId]) {
        return await interaction.reply({
            content: "This is not a custom voice channel.",
            ephemeral: true
        });
    }
    
    // Check if the user is the owner
    if (voiceChannels[channelId].owner !== interaction.user.id) {
        return await interaction.reply({
            content: "Only the channel owner can transfer ownership.",
            ephemeral: true
        });
    }
    
    // Get the selected user
    const userId = interaction.values[0];
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    
    if (!member) {
        return await interaction.reply({
            content: "Selected user not found.",
            ephemeral: true
        });
    }
    
    // Check if the user is in the channel
    if (!member.voice.channel || member.voice.channel.id !== channelId) {
        return await interaction.reply({
            content: "The selected user must be in your voice channel.",
            ephemeral: true
        });
    }
    
    // Transfer ownership
    voiceChannels[channelId].owner = userId;
    voiceChannels[channelId].ownerTag = member.user.tag;
    config.saveVoiceChannels(guildId, voiceChannels);
    
    return await interaction.reply({
        content: `Voice channel ownership has been transferred to ${member.user.tag}.`,
        ephemeral: true
    });
}

// Handle voice channel kick selection
async function handleVoiceKickSelect(interaction) {
    const guildId = interaction.guild.id;
    
    // Load voice channels
    const voiceChannels = config.getVoiceChannels(guildId);
    
    // Check if the user is in a voice channel
    if (!interaction.member.voice.channel) {
        return await interaction.reply({
            content: "You must be in a voice channel to use this.",
            ephemeral: true
        });
    }
    
    const channelId = interaction.member.voice.channel.id;
    
    // Check if the channel is a custom voice channel
    if (!voiceChannels[channelId]) {
        return await interaction.reply({
            content: "This is not a custom voice channel.",
            ephemeral: true
        });
    }
    
    // Check if the user is the owner
    if (voiceChannels[channelId].owner !== interaction.user.id) {
        return await interaction.reply({
            content: "Only the channel owner can kick members.",
            ephemeral: true
        });
    }
    
    // Get the selected user
    const userId = interaction.values[0];
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    
    if (!member) {
        return await interaction.reply({
            content: "Selected user not found.",
            ephemeral: true
        });
    }
    
    // Check if the user is in the channel
    if (!member.voice.channel || member.voice.channel.id !== channelId) {
        return await interaction.reply({
            content: "The selected user is not in your voice channel.",
            ephemeral: true
        });
    }
    
    // Prevent kicking moderators or administrators
    if (member.permissions.has(PermissionFlagsBits.ModerateMembers) || member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
            content: "You cannot kick moderators or administrators.",
            ephemeral: true
        });
    }
    
    // Kick the user and prevent them from rejoining
    await interaction.member.voice.channel.permissionOverwrites.edit(userId, {
        Connect: false
    });
    
    // Disconnect the user
    await member.voice.disconnect("Kicked from voice channel by owner");
    
    return await interaction.reply({
        content: `${member.user.tag} has been kicked from your voice channel.`,
        ephemeral: true
    });
}

// Handle modal submissions for voice controls
async function handleVoiceLimitModal(interaction) {
    const guildId = interaction.guild.id;
    
    // Load voice channels
    const voiceChannels = config.getVoiceChannels(guildId);
    
    // Check if the user is in a voice channel
    if (!interaction.member.voice.channel) {
        return await interaction.reply({
            content: "You must be in a voice channel to use these controls.",
            ephemeral: true
        });
    }
    
    const channelId = interaction.member.voice.channel.id;
    
    // Check if the channel is a custom voice channel
    if (!voiceChannels[channelId]) {
        return await interaction.reply({
            content: "This is not a custom voice channel.",
            ephemeral: true
        });
    }
    
    // Check if the user is the owner
    if (voiceChannels[channelId].owner !== interaction.user.id) {
        return await interaction.reply({
            content: "Only the channel owner can modify these settings.",
            ephemeral: true
        });
    }
    
    const limit = parseInt(interaction.fields.getTextInputValue("limit"));
    
    // Validate limit
    if (isNaN(limit) || limit < 0 || limit > 99) {
        return await interaction.reply({
            content: "Invalid limit. Please enter a number between 0 and 99.",
            ephemeral: true
        });
    }
    
    // Set user limit
    await interaction.member.voice.channel.setUserLimit(limit);
    
    // Update channel status
    voiceChannels[channelId].userLimit = limit;
    config.saveVoiceChannels(guildId, voiceChannels);
    
    return await interaction.reply({
        content: limit === 0 ? "Your voice channel now has no user limit." : `Your voice channel user limit has been set to ${limit}.`,
        ephemeral: true
    });
}

async function handleVoiceNameModal(interaction) {
    const guildId = interaction.guild.id;
    
    // Load voice channels
    const voiceChannels = config.getVoiceChannels(guildId);
    
    // Check if the user is in a voice channel
    if (!interaction.member.voice.channel) {
        return await interaction.reply({
            content: "You must be in a voice channel to use these controls.",
            ephemeral: true
        });
    }
    
    const channelId = interaction.member.voice.channel.id;
    
    // Check if the channel is a custom voice channel
    if (!voiceChannels[channelId]) {
        return await interaction.reply({
            content: "This is not a custom voice channel.",
            ephemeral: true
        });
    }
    
    // Check if the user is the owner
    if (voiceChannels[channelId].owner !== interaction.user.id) {
        return await interaction.reply({
            content: "Only the channel owner can modify these settings.",
            ephemeral: true
        });
    }
    
    const name = interaction.fields.getTextInputValue("name");
    
    // Check if name is appropriate (you can add more checks)
    if (name.length > 100 || name.length < 1) {
        return await interaction.reply({
            content: "Channel name must be between 1 and 100 characters.",
            ephemeral: true
        });
    }
    
    // Set channel name
    await interaction.member.voice.channel.setName(name);
    
    // Update channel status
    voiceChannels[channelId].name = name;
    config.saveVoiceChannels(guildId, voiceChannels);
    
    return await interaction.reply({
        content: `Your voice channel name has been set to ${name}.`,
        ephemeral: true
    });
}

// Handle ticket modal submissions
async function handleTicketModal(interaction) {
    // This function would handle any ticket-related modal submissions
    // Currently, we don't have any ticket modals, but you could add them for ticket creation with a reason, etc.
}

// HELP MENU FUNCTIONS
// Handle help category selection
async function handleHelpCategorySelect(interaction) {
    // Define categories for commands
    const categories = {
        "Moderation": {
            description: "Moderation commands for managing your server",
            commands: ["mod"],
            emoji: "🛡️"
        },
        "Tickets": {
            description: "Support ticket system commands",
            commands: ["ticket"],
            emoji: "🎫"
        },
        "Voice": {
            description: "Temporary voice channel commands",
            commands: ["voice"],
            emoji: "🎙️"
        },
        "Statistics": {
            description: "Server and user statistics",
            commands: ["stats"],
            emoji: "📊"
        },
        "Utility": {
            description: "General utility commands",
            commands: ["user", "help"],
            emoji: "🔧"
        }
    };
    
    const selectedCategory = interaction.values[0];
    const categoryName = Object.keys(categories).find(cat => cat.toLowerCase() === selectedCategory);
    const categoryData = categories[categoryName];
    
    // Create command details based on the selected category
    let commandDetails = "";
    
    if (selectedCategory === "moderation") {
        commandDetails = "**`/mod kick`** - Kick a user from the server\n" +
                        "**`/mod ban`** - Ban a user from the server\n" +
                        "**`/mod timeout`** - Timeout a user\n" +
                        "**`/mod warn`** - Warn a user\n" +
                        "**`/mod warnings`** - View a user's warnings\n" +
                        "**`/mod clearwarns`** - Clear a user's warnings\n" +
                        "**`/mod setup`** - Setup moderation log channel";
    } else if (selectedCategory === "tickets") {
        commandDetails = "**`/ticket setup`** - Set up the ticket system\n" +
                        "**`/ticket close`** - Close a ticket\n" +
                        "**`/ticket add`** - Add a user to a ticket\n" +
                        "**`/ticket remove`** - Remove a user from a ticket";
    } else if (selectedCategory === "voice") {
        commandDetails = "**`/voice setup`** - Set up the temporary voice channel system\n" +
                        "**`/voice lock`** - Lock your voice channel\n" +
                        "**`/voice unlock`** - Unlock your voice channel\n" +
                        "**`/voice limit`** - Set a user limit for your voice channel\n" +
                        "**`/voice name`** - Change the name of your voice channel\n" +
                        "**`/voice transfer`** - Transfer ownership of your voice channel\n" +
                        "**`/voice kick`** - Kick a user from your voice channel";
    } else if (selectedCategory === "statistics") {
        commandDetails = "**`/stats server`** - View server statistics\n" +
                        "**`/stats user`** - View user statistics\n" +
                        "**`/stats messages`** - View message statistics\n" +
                        "**`/stats voice`** - View voice channel statistics";
    } else if (selectedCategory === "utility") {
        commandDetails = "**`/user`** - View user information\n" +
                        "**`/help`** - Show this help menu";
    }
    
    // Create the category embed
    const categoryEmbed = new EmbedBuilder()
        .setTitle(`${categoryData.emoji} ${categoryName} Commands`)
        .setDescription(categoryData.description)
        .setColor("#3498db")
        .addFields({ name: "Available Commands", value: commandDetails })
        .setFooter({ text: "Use the menu below to view other categories" })
        .setTimestamp();
    
    // Create the category selection menu for the response
    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("help_category")
                .setPlaceholder("Select a category")
                .addOptions(
                    Object.entries(categories).map(([name, { description, emoji }]) => ({
                        label: name,
                        value: name.toLowerCase(),
                        description: description,
                        emoji: emoji
                    }))
                )
        );
    
    await interaction.update({
        embeds: [categoryEmbed],
        components: [row]
    });
}