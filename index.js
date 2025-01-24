import http from "http";
import app from "./app.js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: `${process.env.NODE_ENV ? '.env.'+ process.env.NODE_ENV : '.env'}` });

// Normalize the port and set it to the app
const port = normalizePort(process.env.PORT || 4200);
app.set("port", port);

// Create the HTTP server
const server = http.createServer(app);

// Start the server and listen on the specified port
server.listen(port, () => {
    console.log(`Server listening on port: ${port}`);
});

// Error handling
server.on("error", onError);

// Server listening event
server.on("listening", onListening);

// Normalize port into a number, string, or false
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

// Error handler for the server
function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

// Listening event handler for the server
function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string" ? `pipe ${addr}` : `port ${addr.port}`;
  console.log(`Listening on ${bind}`);
}
