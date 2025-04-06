const LoggerClass = require("./internal/Logger");
const Logger = new LoggerClass();

const { Client, GatewayIntentBits, Collection, ActivityType, Partials  } = require("discord.js");
const path = require("node:path");
const fs = require("node:fs");

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.GuildMember,
        Partials.User,
        Partials.Reaction
    ]
});

const config = require("./config.json");

process.on("unhandledRejection", error => {
    Logger.logRed("Unhandled promise rejection:");
    Logger.logRed(error);
});


const dataDirs = ["./data", "./data/stats", "./data/tickets", "./data/tickets/transcripts"];
for (const dir of dataDirs) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

client.eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(client.eventsPath).filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
    const filePath = path.join(client.eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    
    Logger.logYellow(`Loaded event: ${event.name}`);
}

client.commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(client.commandsPath).filter(file => file.endsWith(".js"));

const deployCommands = require("./deployCommands");
deployCommands.deploy(commandFiles);

client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.modals = new Collection();

for (const file of commandFiles) {
    const filePath = path.join(client.commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

client.login(config.token);