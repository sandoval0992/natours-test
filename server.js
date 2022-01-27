const dotenv = require("dotenv");
const mongoose = require("mongoose");

process.on("uncaughtException", err => {
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "./config.env" });
const app = require("./app");

const dbConnectionString = process.env.REMOTE_DB_CONNECTION_STRING.replace(
  "<PASSWORD>",
  process.env.REMOTE_DB_PASSWORD
);

mongoose
  .connect(dbConnectionString, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(dbConnection => {
    console.log("App successfully connected to database");
  })
  .catch(error => {
    console.log(`Connection error: ${error}`);
  });

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`App running on port: ${port}`);
});

process.on("unhandledRejection", err => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
