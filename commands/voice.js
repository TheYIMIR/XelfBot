const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require("discord.js");
const ConfigManager = require("../internal/ConfigManager");
const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();
const config = new ConfigManager();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("voice")
        .setDescription("Temporary voice channel commands")
        .addSubcommand(subcommand =>
            subcommand
                .setName("setup")
                .setDescription("Setup the temp voice channel system")
                .addChannelOption(option => 
                    option.setName("category")
                        .setDescription("Category to create voice channels in")
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName("create_channel")
                        .setDescription("Voice channel that users will join to create their own channel")
                        .addChannelTypes(ChannelType.GuildVoice)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("lock")
                .setDescription("Lock your voice channel"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("unlock")
                .setDescription("Unlock your voice channel"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("limit")
                .setDescription("Set the user limit for your voice channel")
                .addIntegerOption(option => 
                    option.setName("limit")
                        .setDescription("User limit (0 for unlimited)")
                        .setMinValue(0)
                        .setMaxValue(99)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("name")
                .setDescription("Change the name of your voice channel")
                .addStringOption(option => 
                    option.setName("name")
                        .setDescription("New channel name")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("transfer")
                .setDescription("Transfer ownership of your voice channel")
                .addUserOption(option => 
                    option.setName("user")
                        .setDescription("User to transfer ownership to")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("kick")
                .setDescription("Kick a user from your voice channel")
                .addUserOption(option => 
                    option.setName("user")
                        .setDescription("User to kick")
                        .setRequired(true))),
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;
            
            switch (subcommand) {
                case "setup": {
                    // Check for admin permissions
                    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                        return await interaction.reply({ content: "You need administrator permissions to use this command.", ephemeral: true });
                    }
                    
                    const category = interaction.options.getChannel("category");
                    const createChannel = interaction.options.getChannel("create_channel");
                    
                    // Save voice configuration
                    const voiceConfig = {
                        guildId: guildId,
                        category: category.id,
                        createChannel: createChannel.id
                    };
                    
                    config.saveGuildConfig(guildId, "voice", voiceConfig);
                    
                    // Create an info channel with controls
                    const infoChannel = await interaction.guild.channels.create({
                        name: "voice-controls",
                        type: ChannelType.GuildText,
                        parent: category.id,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.roles.everyone.id,
                                deny: [PermissionFlagsBits.SendMessages],
                                allow: [PermissionFlagsBits.ViewChannel]
                            }
                        ]
                    });
                    
                    // Save the info channel ID to the config
                    voiceConfig.infoChannel = infoChannel.id;
                    config.saveGuildConfig(guildId, "voice", voiceConfig);
                    
                    // Create info embed
                    const embed = new EmbedBuilder()
                        .setTitle("Temporary Voice Channels")
                        .setDescription("Join the 'Create Voice Channel' to get your own voice channel. You can use the buttons below to manage your channel.")
                        .setColor("#3498db")
                        .addFields(
                            { name: "Commands", value: 
                            "/voice lock - Lock your channel\n" +
                            "/voice unlock - Unlock your channel\n" +
                            "/voice limit - Set user limit\n" +
                            "/voice name - Change channel name\n" +
                            "/voice transfer - Transfer ownership\n" +
                            "/voice kick - Kick a user from your channel" }
                        )
                        .setFooter({ text: "StreamBot Voice System" });
                    
                    // Create UI buttons
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId("voice_lock")
                                .setLabel("Lock")
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji("🔒"),
                            new ButtonBuilder()
                                .setCustomId("voice_unlock")
                                .setLabel("Unlock")
                                .setStyle(ButtonStyle.Success)
                                .setEmoji("🔓"),
                            new ButtonBuilder()
                                .setCustomId("voice_limit")
                                .setLabel("Set Limit")
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji("👥"),
                            new ButtonBuilder()
                                .setCustomId("voice_name")
                                .setLabel("Change Name")
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji("✏️"),
                            new ButtonBuilder()
                                .setCustomId("voice_info")
                                .setLabel("Channel Info")
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji("ℹ️")
                        );
                    
                    // Create second row for additional buttons
                    const row2 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId("voice_transfer")
                                .setLabel("Transfer Ownership")
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji("👑"),
                            new ButtonBuilder()
                                .setCustomId("voice_kick")
                                .setLabel("Kick User")
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji("👢"),
                            new ButtonBuilder()
                                .setCustomId("voice_claim")
                                .setLabel("Claim Channel")
                                .setStyle(ButtonStyle.Success)
                                .setEmoji("🏳️")
                        );
                    
                    await infoChannel.send({ embeds: [embed], components: [row, row2] });
                    
                    return await interaction.reply({ content: "Voice channel system has been set up successfully!", ephemeral: true });
                }
                
                case "lock": {
                    // Load voice channels
                    const voiceChannels = config.getVoiceChannels(guildId);
                    
                    // Check if the user is in a voice channel and is the owner
                    if (!interaction.member.voice.channel) {
                        return await interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
                    }
                    
                    const channelId = interaction.member.voice.channel.id;
                    
                    if (!voiceChannels[channelId] || voiceChannels[channelId].owner !== interaction.user.id) {
                        return await interaction.reply({ content: "You must be the owner of the voice channel to use this command.", ephemeral: true });
                    }
                    
                    // Lock the channel
                    await interaction.member.voice.channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
                        Connect: false
                    });
                    
                    // Update channel status
                    voiceChannels[channelId].locked = true;
                    config.saveVoiceChannels(guildId, voiceChannels);
                    
                    return await interaction.reply({ content: "Your voice channel has been locked.", ephemeral: true });
                }
                
                case "unlock": {
                    // Load voice channels
                    const voiceChannels = config.getVoiceChannels(guildId);
                    
                    // Check if the user is in a voice channel and is the owner
                    if (!interaction.member.voice.channel) {
                        return await interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
                    }
                    
                    const channelId = interaction.member.voice.channel.id;
                    
                    if (!voiceChannels[channelId] || voiceChannels[channelId].owner !== interaction.user.id) {
                        return await interaction.reply({ content: "You must be the owner of the voice channel to use this command.", ephemeral: true });
                    }
                    
                    // Unlock the channel
                    await interaction.member.voice.channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
                        Connect: true
                    });
                    
                    // Update channel status
                    voiceChannels[channelId].locked = false;
                    config.saveVoiceChannels(guildId, voiceChannels);
                    
                    return await interaction.reply({ content: "Your voice channel has been unlocked.", ephemeral: true });
                }
                
                case "limit": {
                    // Load voice channels
                    const voiceChannels = config.getVoiceChannels(guildId);
                    
                    // Check if the user is in a voice channel and is the owner
                    if (!interaction.member.voice.channel) {
                        return await interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
                    }
                    
                    const channelId = interaction.member.voice.channel.id;
                    
                    if (!voiceChannels[channelId] || voiceChannels[channelId].owner !== interaction.user.id) {
                        return await interaction.reply({ content: "You must be the owner of the voice channel to use this command.", ephemeral: true });
                    }
                    
                    const limit = interaction.options.getInteger("limit");
                    
                    // Set user limit
                    await interaction.member.voice.channel.setUserLimit(limit);
                    
                    // Update channel status
                    voiceChannels[channelId].userLimit = limit;
                    config.saveVoiceChannels(guildId, voiceChannels);
                    
                    return await interaction.reply({ 
                        content: limit === 0 
                            ? "Your voice channel now has no user limit." 
                            : `Your voice channel user limit has been set to ${limit}.`, 
                        ephemeral: true 
                    });
                }
                
                case "name": {
                    // Load voice channels
                    const voiceChannels = config.getVoiceChannels(guildId);
                    
                    // Check if the user is in a voice channel and is the owner
                    if (!interaction.member.voice.channel) {
                        return await interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
                    }
                    
                    const channelId = interaction.member.voice.channel.id;
                    
                    if (!voiceChannels[channelId] || voiceChannels[channelId].owner !== interaction.user.id) {
                        return await interaction.reply({ content: "You must be the owner of the voice channel to use this command.", ephemeral: true });
                    }
                    
                    const name = interaction.options.getString("name");
                    
                    // Check if name is appropriate (you can add more checks)
                    if (name.length > 100 || name.length < 1) {
                        return await interaction.reply({ content: "Channel name must be between 1 and 100 characters.", ephemeral: true });
                    }
                    
                    // Set channel name
                    await interaction.member.voice.channel.setName(name);
                    
                    // Update channel status
                    voiceChannels[channelId].name = name;
                    config.saveVoiceChannels(guildId, voiceChannels);
                    
                    return await interaction.reply({ content: `Your voice channel name has been set to ${name}.`, ephemeral: true });
                }
                
                case "transfer": {
                    // Load voice channels
                    const voiceChannels = config.getVoiceChannels(guildId);
                    
                    // Check if the user is in a voice channel and is the owner
                    if (!interaction.member.voice.channel) {
                        return await interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
                    }
                    
                    const channelId = interaction.member.voice.channel.id;
                    
                    if (!voiceChannels[channelId] || voiceChannels[channelId].owner !== interaction.user.id) {
                        return await interaction.reply({ content: "You must be the owner of the voice channel to use this command.", ephemeral: true });
                    }
                    
                    const user = interaction.options.getUser("user");
                    const member = interaction.options.getMember("user");
                    
                    // Check if the user is in the channel
                    if (!member.voice.channel || member.voice.channel.id !== channelId) {
                        return await interaction.reply({ content: "The user must be in your voice channel to transfer ownership.", ephemeral: true });
                    }
                    
                    // Transfer ownership
                    voiceChannels[channelId].owner = user.id;
                    voiceChannels[channelId].ownerTag = user.tag;
                    config.saveVoiceChannels(guildId, voiceChannels);
                    
                    return await interaction.reply({ content: `Voice channel ownership has been transferred to ${user.tag}.` });
                }
                
                case "kick": {
                    // Load voice channels
                    const voiceChannels = config.getVoiceChannels(guildId);
                    
                    // Check if the user is in a voice channel and is the owner
                    if (!interaction.member.voice.channel) {
                        return await interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
                    }
                    
                    const channelId = interaction.member.voice.channel.id;
                    
                    if (!voiceChannels[channelId] || voiceChannels[channelId].owner !== interaction.user.id) {
                        return await interaction.reply({ content: "You must be the owner of the voice channel to use this command.", ephemeral: true });
                    }
                    
                    const user = interaction.options.getUser("user");
                    const member = interaction.options.getMember("user");
                    
                    // Check if the user is in the channel
                    if (!member.voice.channel || member.voice.channel.id !== channelId) {
                        return await interaction.reply({ content: "The user is not in your voice channel.", ephemeral: true });
                    }
                    
                    // Prevent kicking moderators or administrators
                    if (member.permissions.has(PermissionFlagsBits.ModerateMembers) || member.permissions.has(PermissionFlagsBits.Administrator)) {
                        return await interaction.reply({ content: "You cannot kick moderators or administrators.", ephemeral: true });
                    }
                    
                    // Kick the user and prevent them from rejoining
                    await interaction.member.voice.channel.permissionOverwrites.edit(user.id, {
                        Connect: false
                    });
                    
                    // Disconnect the user
                    await member.voice.disconnect("Kicked from voice channel by owner");
                    
                    return await interaction.reply({ content: `${user.tag} has been kicked from your voice channel.`, ephemeral: true });
                }
            }
        } catch (error) {
            Logger.logRed(error);
            return await interaction.reply({ content: "An error occurred while executing the command.", ephemeral: true });
        }
    }
};