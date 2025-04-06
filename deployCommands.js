const { REST, Routes } = require("discord.js");
const config = require("./config.json");
const fs = require("node:fs");
const LoggerClass = require("./internal/Logger");
const Logger = new LoggerClass();

async function deploy(data) {
    const commands = [];
    const commandNames = [];
    
    // Load current commands
    for (const file of data) {
        const command = require(`./commands/${file}`);
        Logger.logYellow("Registering command: " + file.replace(".js", ""));
        commands.push(command.data.toJSON());
        commandNames.push(command.data.name);
    }
    
    const rest = new REST({ version: "10" }).setToken(config.token);
    
    try {
        // First, fetch the existing commands to compare
        Logger.logYellow("Fetching existing commands...");
        const existingCommands = await rest.get(
            Routes.applicationCommands(config.clientID)
        );
        
        // Identify commands that will be removed
        const existingCommandNames = existingCommands.map(cmd => cmd.name);
        const commandsToRemove = existingCommandNames.filter(name => !commandNames.includes(name));
        
        // Log what we're about to do
        if (commandsToRemove.length > 0) {
            Logger.logYellow(`Will remove ${commandsToRemove.length} old commands: ${commandsToRemove.join(", ")}`);
        }
        
        Logger.logYellow(`Started refreshing ${commands.length} application (/) commands.`);
        
        // Put the new commands (which replaces all existing commands)
        const data = await rest.put(
            Routes.applicationCommands(config.clientID),
            { body: commands },
        );
        
        // Log the results
        Logger.logYellow(`Successfully reloaded ${data.length} application (/) commands.`);
        if (commandsToRemove.length > 0) {
            Logger.logGreen(`Successfully removed ${commandsToRemove.length} old commands.`);
        }
    } catch (error) {
        Logger.logRed(error);
    }
}

module.exports = {
    deploy: deploy
}