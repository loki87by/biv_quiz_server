const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
      console.log(data);
      const { username, state } = data;
      broadcastStateChange(username, state);
    }

    if (data.type === "reset") {
      // Handle reset message
      broadcastReset();
    }
  });

  ws.on("close", () => {
    // Handle user disconnection
    const userIndex = lobbyUsers.findIndex((user) => user.ws === ws);
    if (userIndex !== -1) {
      const { username } = lobbyUsers[userIndex];
      lobbyUsers.splice(userIndex, 1);
    }
  });
});

app.get("/startapp", (req, res) => {
  // Handle the initial user information from the frontend
  const { chat_type, chat_instance, start_param } = req.query;
  // You can decide what to do with this information, for now, we are not using it.
  res.send("User information recorded");
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
    JSON.stringify({ type: "success", message: "Registration successful" })
  );
}

function sendRegistrationFailure(ws, message) {
  // Send a failure message to the user
  ws.send(JSON.stringify({ type: "failure", message }));
}

function broadcastStateChange(username, state) {
  state = username === "админ" ? state : "disabled";
  const message = JSON.stringify({
    type: "stateChange",
    username,
    state,
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
