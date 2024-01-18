const { REST, Routes } = require("discord.js");
const config = require("./config.json");
const fs = require("node:fs");
const LoggerClass = require("./internal/Logger");
const Logger = new LoggerClass();

const commands = []

function deploy(data){
    for(const file of data){
        const command = require(`./commands/${file}`);
        Logger.logYellow("Registered command called: " + file.replace(".js", ""));
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: "10" }).setToken(config.token);

    (async () => {
        try {
            Logger.logYellow(`Started refreshing ${commands.length} application (/) commands.`);
            const data = await rest.put(
                Routes.applicationCommands(config.clientID),
                { body: commands },
            );
            Logger.logYellow(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            Logger.logRed(error);
        }
    })();
}

module.exports = {
    deploy: deploy
}