const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
let timestamp = null;
let currentUser = ''

const lobbyUsers = [];

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "register") {
      const { username } = data;

      if (!isUsernameTaken(username)) {
        lobbyUsers.push({ username, ws });
        sendRegistrationSuccess(ws);
      } else {
        sendRegistrationFailure(ws, "Username is already taken");
      }
    }

    if (data.type === "disabled" || data.type === "enabled") {
      // Handle disable/enable messages
      const { username, type } = data;
      let time = timestamp;
      if (data.type === "disabled") {
        time = data.timestamp
        timestamp = time
        setTimeout(() => {
          timestamp = null
          currentUser = ''
        }, 15000)
        currentUser = username
      }
      broadcastStateChange(username, type, time);
    }

    if (data.type === "reset") {
      // Handle reset message
      timestamp = null;
      currentUser = ''
      broadcastReset();
    }
  });

  ws.on("close", () => {
    // Handle user disconnection
    const userIndex = lobbyUsers.findIndex((user) => user.ws === ws);
    if (userIndex !== -1) {
      lobbyUsers.splice(userIndex, 1);
    }
  });
});

function isUsernameTaken(username) {
  // Check if the username is already taken
  return lobbyUsers.some(
    (user) => user.username.toLowerCase() === username.toLowerCase()
  );
}

function sendRegistrationSuccess(ws) {
  // Send a success message to the user
  ws.send(
    JSON.stringify({ type: "success", timestamp, currentUser })
  );
}

function sendRegistrationFailure(ws, message) {
  // Send a failure message to the user
  ws.send(JSON.stringify({ type: "failure", message }));
}

function broadcastStateChange(username, type, time) {
  const message = JSON.stringify({
    type: "stateChange",
    username,
    state: username === "админ" ? type : "disabled",
    global: username === "админ" ? true : false,
  });
  lobbyUsers.forEach((user) => {
    user.ws.send(message);
  });
}

function broadcastReset() {
  // Распространить сообщение о сбросе всем подключенным клиентам.
  const message = JSON.stringify({ type: "reset" });
  lobbyUsers.forEach((user) => user.ws.send(message));
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
