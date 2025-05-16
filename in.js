// Système d'authentification par serveur central
const AuthManager = require('./auth-module');
const auth = new AuthManager();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/function');
const fs = require('fs');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const util = require('util');
const { sms, downloadMediaMessage } = require('./lib/msg');
const axios = require('axios');
const { File } = require('megajs');
const prefix = '.';
const path = require('path');

const ownerNumber = ['50931312968'];

// Ensure temp directory exists
if (!fs.existsSync('./temp')) {
  fs.mkdirSync('./temp');
}

// Multi-session configuration
global.multiConfig = {
  sessionsDir: path.join(__dirname, 'sessions'), // Directory for all sessions
  activeUsers: new Map(), // Track active users - key: userNumber, value: {connection, connectedAt}
  mainConn: null, // Store reference to main connection
  reconnectAttempts: {} // Track reconnection attempts per session
};

// Make sure the sessions directory exists
if (!fs.existsSync(global.multiConfig.sessionsDir)) {
  fs.mkdirSync(global.multiConfig.sessionsDir);
}

// Create main session directory if it doesn't exist (backward compatibility)
const mainSessionDir = path.join(global.multiConfig.sessionsDir, 'main');
if (!fs.existsSync(mainSessionDir)) {
  fs.mkdirSync(mainSessionDir, { recursive: true });
  
  // If old auth_info_baileys directory exists, move content to new location
  if (fs.existsSync('./auth_info_baileys')) {
    // Read all files from old auth directory
    const files = fs.readdirSync('./auth_info_baileys');
    for (const file of files) {
      const oldPath = path.join('./auth_info_baileys', file);
      const newPath = path.join(mainSessionDir, file);
      // Copy file to new location
      fs.copyFileSync(oldPath, newPath);
    }
    console.log('Moved auth files to new sessions directory');
  }
}

// Bot mode configuration (public/private)
let botConfig = { botMode: "public" }; // Default to public mode
const botConfigPath = path.join(__dirname, './lib/database/botconfig.json');

// Load bot config if it exists
if (fs.existsSync(botConfigPath)) {
  try {
    botConfig = JSON.parse(fs.readFileSync(botConfigPath));
    global.botMode = botConfig.botMode || "public";
    console.log(`Bot starting in ${global.botMode.toUpperCase()} mode`);
  } catch (error) {
    console.error("Error reading bot config:", error);
    global.botMode = "public"; // Default to public if error
  }
} else {
  global.botMode = "public"; // Default to public if no config
  fs.writeFileSync(botConfigPath, JSON.stringify({ botMode: "public" }, null, 2));
}

//===================SESSION-AUTH============================
// This is kept for backward compatibility but modified to use the main session
if (!fs.existsSync(path.join(mainSessionDir, 'creds.json'))) {
  if (!config.SESSION_ID) return console.log('Please add your session to SESSION_ID env !!');
  const sessdata = config.SESSION_ID;
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile(path.join(mainSessionDir, 'creds.json'), data, () => {
      console.log("Session downloaded ✅");
    });
  });
}

const express = require("express");
const app = express();
const port = process.env.PORT || 8000;

// ==================== Add Antilink and Autodownload Protection ====================
const { antilinkHandler } = require('./plugins/antilink');
const { handleAutoDownload } = require('./plugins/autodownload');
const antipurgeProtection = require('./plugins/antipurge');

// Modified to handle multiple sessions with auto-reconnect
async function connectToWA(sessionId = 'main', isOwner = true, retryCount = 0) {
  // Max retry attempts
  const MAX_RETRY = 5;
  const RETRY_INTERVAL = 10000; // 10 seconds between retries
  
  // Generate session path
  const sessionPath = path.join(global.multiConfig.sessionsDir, sessionId);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  
  console.log(`Connecting ${isOwner ? 'main' : 'secondary'} bot for ${sessionId}...`);
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    var { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
      logger: P({ level: 'silent' }),
      printQRInTerminal: sessionId === 'main', // Only show QR for main session
      browser: Browsers.macOS("Firefox"),
      syncFullHistory: true,
      auth: state,
      version
    });

    // Reset reconnect attempts on successful connection initialization
    global.multiConfig.reconnectAttempts[sessionId] = 0;

    // Track this connection in our active users map
    if (sessionId === 'main') {
      global.multiConfig.mainConn = conn;
      global.multiConfig.activeUsers.set('main', {
        connection: conn,
        isOwner: true,
        connectedAt: new Date().toISOString()
      });
    } else {
      global.multiConfig.activeUsers.set(sessionId, {
        connection: conn,
        isOwner: isOwner,
        connectedAt: new Date().toISOString()
      });
    }
    
    // Debug message to verify tracking
    console.log(`Active users after connecting ${sessionId}: ${Array.from(global.multiConfig.activeUsers.keys()).join(', ')}`);

    conn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect && lastDisconnect.error && 
                              lastDisconnect.error.output && 
                              lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
                              
        console.log(`Connection closed for ${sessionId}, reconnect: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          // Get current retry count
          const currentRetry = global.multiConfig.reconnectAttempts[sessionId] || 0;
          
          if (currentRetry < MAX_RETRY) {
            // Increment retry counter
            global.multiConfig.reconnectAttempts[sessionId] = currentRetry + 1;
            
            console.log(`Reconnecting ${sessionId}... Attempt ${currentRetry + 1}/${MAX_RETRY}`);
            
            // Exponential backoff for reconnection
            const delay = RETRY_INTERVAL * Math.pow(1.5, currentRetry);
            setTimeout(() => {
              connectToWA(sessionId, isOwner, currentRetry + 1);
            }, delay);
          } else {
            console.log(`Maximum reconnect attempts reached for ${sessionId}. Giving up.`);
            global.multiConfig.activeUsers.delete(sessionId);
            
            // Notify owner about failure (if main connection is available)
            if (sessionId !== 'main' && global.multiConfig.mainConn) {
              global.multiConfig.mainConn.sendMessage(ownerNumber + "@s.whatsapp.net", {
                text: `❌ Bot ${sessionId} failed to reconnect after ${MAX_RETRY} attempts.`
              });
            }
          }
        } else {
          console.log(`${sessionId} disconnected due to logout`);
          // Remove from active users
          global.multiConfig.activeUsers.delete(sessionId);
        }
      } else if (connection === 'open') {
        console.log(`${sessionId} connected to WhatsApp ✅`);
        
        // Reset reconnect attempts on successful connection
        global.multiConfig.reconnectAttempts[sessionId] = 0;
        
        // SYSTÈME D'AUTHENTIFICATION INTÉGRÉ ICI - Uniquement pour la session principale
        if (sessionId === 'main') {
          // Obtention du numéro du bot connecté
          const botNumber = conn.user.id.split(':')[0];
          console.log(`Bot connecté avec le numéro: ${botNumber}`);
          
          // Vérification de l'authentification
          try {
            // Si première exécution, enregistrement automatique avec le numéro détecté
            if (auth.config.status === 'new') {
              console.log('Premier démarrage, enregistrement du bot...');
              const registerResult = await auth.register(botNumber);
              console.log(`Résultat de l'enregistrement:`, registerResult);
              
              if (registerResult.success) {
                console.log(`Bot enregistré avec l'ID d'instance ${registerResult.instanceId}`);
                console.log('En attente d\'approbation par l\'administrateur');
                console.log('Redémarrez le bot après approbation');
                process.exit(0);
              } else {
                console.error(`Échec de l'enregistrement: ${registerResult.message}`);
                process.exit(1);
              }
            }
            
            // Validation de l'authentification
            console.log('Validation de l\'autorisation du bot...');
            const validationResult = await auth.validate();
            
            if (!validationResult.success) {
              console.error(`Authentification échouée: ${validationResult.message}`);
              console.error('Ce bot n\'est pas autorisé à s\'exécuter');
              process.exit(1);
            }
            
            console.log('Bot authentifié avec succès!');
            if (validationResult.expiresAt) {
              console.log(`L'autorisation expire le: ${new Date(validationResult.expiresAt).toLocaleString()}`);
            }
            
            // Configuration de validation périodique
            setInterval(async () => {
              console.log('Vérification périodique de l\'autorisation...');
              const checkResult = await auth.validate();
              if (!checkResult.success) {
                console.error(`Autorisation révoquée: ${checkResult.message}`);
                process.exit(1);
              }
            }, 30 * 60 * 1000); // Vérification toutes les 30 minutes
          } catch (error) {
            console.error("Erreur d'authentification:", error);
            process.exit(1);
          }
          
          console.log('😼 Installing plugins...');
          const path = require('path');
          fs.readdirSync("./plugins/").forEach((plugin) => {
            if (path.extname(plugin).toLowerCase() == ".js") {
              require("./plugins/" + plugin);
            }
          });
          console.log('Plugins installed successful ✅');

          let up = `Hasi-Ai connected successful ✅\n\nPREFIX: ${prefix}`;
          conn.sendMessage(ownerNumber + "@s.whatsapp.net", { 
            image: { url: `https://telegra.ph/file/900435c6d3157c98c3c88.jpg` }, 
            caption: up 
          });
        } else {
          // Send welcome message to secondary user
          conn.sendMessage(sessionId + "@s.whatsapp.net", { 
            text: "🤖 Your WhatsApp bot is now active! You can use all non-owner commands." 
          });
          
          // Notify owner about new connection
          const mainConn = global.multiConfig.mainConn;
          if (mainConn) {
            mainConn.sendMessage(ownerNumber + "@s.whatsapp.net", {
              text: `📱 Secondary User Connected\n\nUser: ${sessionId}\nTime: ${new Date().toISOString()}`
            });
          }
        }
      }
    });

    conn.ev.on('creds.update', saveCreds);

    // ========================= MESSAGE HANDLING =========================
    conn.ev.on('messages.upsert', async (chatUpdate) => {
      for (const mek of chatUpdate.messages) {
        if (!mek.message) continue;

        // First handle status viewing as before
        if (mek.key && mek.key.remoteJid === 'status@broadcast') {
          // Read status immediately
          await conn.readMessages([mek.key]);
          continue;
        }

        mek.message = (getContentType(mek.message) === 'ephemeralMessage') ?
          mek.message.ephemeralMessage.message : mek.message;

        const type = getContentType(mek.message);
        const content = JSON.stringify(mek.message);
        const from = mek.key.remoteJid;

        // Check for status reply (contextInfo is present in replies)
        if (type === 'extendedTextMessage' &&
          mek.message.extendedTextMessage.contextInfo &&
          mek.message.extendedTextMessage.contextInfo.participant) {

          // Get the message text
          const body = mek.message.extendedTextMessage.text.toLowerCase();

          // Check if this is a reply to bot's own status
          const repliedJID = mek.message.extendedTextMessage.contextInfo.participant;
          const isReplyToBotStatus = repliedJID.includes(conn.user.id.split(':')[0]);

          // Check if the status message is still in contextInfo (WhatsApp provides it)
          const hasQuotedMessage = mek.message.extendedTextMessage.contextInfo.quotedMessage !== undefined;

          // If this is a reply to bot's status with "send" or "snd" command
          if (isReplyToBotStatus && ["send", "snd"].includes(body) && hasQuotedMessage) {
            try {
              // Get the quoted status message
              const quotedMsg = mek.message.extendedTextMessage.contextInfo.quotedMessage;
              const quotedType = getContentType(quotedMsg);

              // Create caption
              const caption = `✨ *Requested Status* ✨\n\n_Shared via ${conn.user.name || "Hasi-Ai"}_`;

              // Send based on status type
              if (quotedType === 'imageMessage') {
                try {
                  // Create a properly structured object that matches downloadMediaMessage function expectations
                  const mediaObj = {
                    type: 'imageMessage',
                    msg: quotedMsg.imageMessage
                  };
                  
                  // Generate a random filename to avoid overwriting
                  const filename = './temp/status_' + Math.floor(Math.random() * 10000);
                  
                  // Download using existing function
                  const media = await downloadMediaMessage(mediaObj, filename);
                  
                  // Send image to the user who requested it
                  await conn.sendMessage(from, {
                    image: media,
                    caption: caption
                  });
                  
                  // Send confirmation
                  await conn.sendMessage(from, {
                    text: "Status sent! ✅"
                  });
                } catch (error) {
                  console.error("Error processing image:", error);
                  await conn.sendMessage(from, { text: "Failed to process image: " + error.message });
                }

              } else if (quotedType === 'videoMessage') {
                try {
                  // Create a properly structured object that matches downloadMediaMessage function expectations
                  const mediaObj = {
                    type: 'videoMessage',
                    msg: quotedMsg.videoMessage
                  };
                  
                  // Generate a random filename to avoid overwriting
                  const filename = './temp/status_' + Math.floor(Math.random() * 10000);
                  
                  // Download using existing function
                  const media = await downloadMediaMessage(mediaObj, filename);
                  
                  // Send video to the user who requested it
                  await conn.sendMessage(from, {
                    video: media,
                    caption: caption
                  });
                  
                  // Send confirmation
                  await conn.sendMessage(from, {
                    text: "Status sent! ✅"
                  });
                } catch (error) {
                  console.error("Error processing video:", error);
                  await conn.sendMessage(from, { text: "Failed to process video: " + error.message });
                }

              } else if (quotedType === 'extendedTextMessage') {
                // For text statuses
                const textContent = quotedMsg.extendedTextMessage.text;
                await conn.sendMessage(from, {
                  text: `"${textContent}"\n\n${caption}`
                });
                
                // Send confirmation
                await conn.sendMessage(from, {
                  text: "Status sent! ✅"
                });
              }

            } catch (error) {
              console.error("Error sending status:", error);
              await conn.sendMessage(from, {
                text: "Failed to send status: " + error.message
              });
            }
          }
        }

        const m = sms(conn, mek);
        const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];
        const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : (type == 'documentMessage') && mek.message.documentMessage.caption ? mek.message.documentMessage.caption : (type == 'buttonsResponseMessage') && mek.message.buttonsResponseMessage.selectedButtonId ? mek.message.buttonsResponseMessage.selectedButtonId : (type == 'templateButtonReplyMessage') && mek.message.templateButtonReplyMessage.selectedId ? mek.message.templateButtonReplyMessage.selectedId : (type == 'listResponseMessage') && mek.message.listResponseMessage.singleSelectReply.selectedRowId ? mek.message.listResponseMessage.singleSelectReply.selectedRowId : "";
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        const isGroup = from.endsWith('@g.us');
        const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid);
        const senderNumber = sender.split('@')[0];
        const botNumber = conn.user.id.split(':')[0];
        const pushname = mek.pushName || 'Sin Nombre';
        const isMe = botNumber.includes(senderNumber);
        
        // For secondary sessions - properly determine owner status
        const currentSession = sessionId; // The session ID of this connection
        const isMainSession = currentSession === 'main';
        
        // Owner check - main session owners are always owners
        const isOwner = isMainSession ? (ownerNumber.includes(senderNumber) || isMe) : false;
        
        // Debug: log who is sending messages to help diagnose the issue
        console.log(`[MSG] Session: ${sessionId}, Sender: ${senderNumber}, Command: ${isCmd ? command : 'none'}`);
        
        const botNumber2 = await jidNormalizedUser(conn.user.id);
        const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => { }) : '';
        const groupName = isGroup ? groupMetadata.subject : '';
        const participants = isGroup ? await groupMetadata.participants : '';
        const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
        const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
        const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
        const reply = (teks) => { conn.sendMessage(from, { text: teks }, { quoted: mek }); };

        // Si c'est un bot secondaire et que le message vient d'un groupe,
        // vérifier si le bot principal est présent dans ce groupe
        if (!isMainSession && isGroup && isCmd) {
          try {
            // Vérifier si le bot principal est dans ce groupe
            const mainSession = global.multiConfig.activeUsers.get('main');
            if (mainSession && mainSession.connection) {
              // Récupérer l'ID du bot principal
              const mainBotNumber = mainSession.connection.user.id.split(':')[0];
              
              // Vérifier si l'ID du bot principal est dans la liste des participants du groupe
              const isMainBotInGroup = participants.some(participant => 
                participant.id.startsWith(mainBotNumber));
              
              if (isMainBotInGroup) {
                // Si le bot principal est présent dans ce groupe et que c'est une commande,
                // le bot secondaire ne répond pas
                console.log(`Secondary bot ignoring command in group where main bot is present: ${groupName}`);
                continue; // Passer au message suivant
              }
            }
          } catch (error) {
            console.error("Error checking main bot presence:", error);
          }
        }

        // Antilink handler
        try {
          await antilinkHandler(conn, mek, {
            chat: from,
            sender: sender,
            body: body,
            isGroup: isGroup,
            key: mek.key
          });
        } catch (error) {
          console.error("Error in antilink handler:", error);
        }

        // Autodownload handler
        try {
          const autoDownloadHandled = await handleAutoDownload(conn, mek, {
            chat: from,
            quoted: quoted,
            body: body
          });

          if (autoDownloadHandled && !isCmd) {
            // Link was processed, but we'll still allow command processing
          }
        } catch (error) {
          console.error("Error in auto-download handler:", error);
        }

        // Add antipurge protection
        antipurgeProtection.eventHandler(conn, conn.ev); // Integrate antipurge protect

        const events = require('./command');
        const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;

        // Check if bot is in private mode and message is from non-owner
        // Only apply private mode restriction to main bot
        if (isMainSession && global.botMode === "private" && !isOwner && isCmd) {
          console.log(`Ignored command from non-owner (${senderNumber}) in private mode: ${command}`);
          continue; // Skip to next message
        }

        if (isCmd || (global.noPrefixMode && body)) {
          const noPrefixCmdName = global.noPrefixMode && !isCmd ? body.trim().split(" ")[0].toLowerCase() : false;
          const cmd = events.commands.find((cmd) => cmd.pattern === (cmdName || noPrefixCmdName)) ||
            events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName || noPrefixCmdName));

          if (cmd) {
            // Block owner commands for secondary users
            if (!isMainSession && cmd.category === 'owner') {
              reply("❌ You don't have permission to use owner commands.");
              continue;
            }
            
            // Bloquer spécifiquement la commande deploybot pour les bots secondaires
            if (!isMainSession && (cmd.pattern === "deploybot" || cmd.pattern === "deploybot")) {
              reply("❌ Secondary bots cannot create other secondary bots. Please contact the main bot owner.");
              continue;
            }
            
            if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });

            try {
              const finalCmdName = cmdName || noPrefixCmdName;
              const finalArgs = isCmd ? args : body.trim().split(/ +/).slice(1);
              const finalQ = finalArgs.join(' ');

              cmd.function(conn, mek, m, {
                from, quoted, body, isCmd: true,
                command: finalCmdName,
                args: finalArgs,
                q: finalQ,
                isGroup, sender, senderNumber,
                botNumber2, botNumber, pushname,
                isMe, isOwner, groupMetadata, groupName,
                participants: isGroup ? await groupMetadata.participants : '',
                groupAdmins, isBotAdmins, isAdmins, reply
              });
            } catch (e) {
              console.error("[PLUGIN ERROR] " + e);
            }
          }
        }
      }
    });

    return conn;
  } catch (err) {
    console.error(`Connection error for ${sessionId}:`, err);
    
    // Handle reconnection for non-fatal errors
    const currentRetry = global.multiConfig.reconnectAttempts[sessionId] || 0;
    if (currentRetry < MAX_RETRY) {
      // Increment retry counter
      global.multiConfig.reconnectAttempts[sessionId] = currentRetry + 1;
      
      const delay = RETRY_INTERVAL * Math.pow(1.5, currentRetry);
      console.log(`Will attempt to reconnect ${sessionId} in ${delay/1000} seconds... (Attempt ${currentRetry + 1}/${MAX_RETRY})`);
      
      setTimeout(() => {
        connectToWA(sessionId, isOwner, currentRetry + 1);
      }, delay);
    } else {
      console.log(`Maximum reconnect attempts reached for ${sessionId}. Giving up.`);
      // Notify owner about failure (if this isn't the main connection)
      if (sessionId !== 'main' && global.multiConfig.mainConn) {
        global.multiConfig.mainConn.sendMessage(ownerNumber + "@s.whatsapp.net", {
          text: `❌ Bot ${sessionId} failed to connect after ${MAX_RETRY} attempts.`
        });
      }
    }
    
    return null;
  }
}

// Make the connectToWA function available globally so it can be used by the deploybot plugin
global.connectToWA = connectToWA;

app.get("/", (req, res) => {
  res.send("Hey, Hasi-Ai started✅");
});

app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));

setTimeout(() => {
  connectToWA('main', true);
}, 4000);
