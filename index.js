const LoggerClass = require("./internal/Logger");
const Logger = new LoggerClass();

const { Client, GatewayIntentBits, Collection } = require("discord.js");
const path = require("node:path");
const fs = require("node:fs");

const client = new Client({ intents: [ GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildInvites ]})

const config = require("./config.json");

client.eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(client.eventsPath).filter(file => file.endsWith(".js"));

for(const file of eventFiles){
    const filePath = path.join(client.eventsPath, file);
    const event = require(filePath);
    if(event.once){
        client.once(event.name, (...args) => event.execute(...args));
    }
    else{
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(client.commandsPath).filter(file => file.endsWith(".js"));

const deployCommands = require("./deployCommands");
deployCommands.deploy(commandFiles);

client.commands = new Collection();

for(const file of commandFiles){
    const filePath = path.join(client.commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

client.login(config.token);