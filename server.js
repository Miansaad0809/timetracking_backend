const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const connectDB = require("./config/db");
dotenv.config({ path: "./config/config.env" });
connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(fileUpload());

// routes
require('./routes')(app);

var PORT = process.env.PORT || 8000;

app.listen(PORT, console.log(`server is running on the port is ${PORT}`))

process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
});
