const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Health Ok!");
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
})

// modules.exports = app;