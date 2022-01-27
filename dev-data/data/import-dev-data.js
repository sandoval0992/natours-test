const dotenv = require("dotenv");
const fs = require("fs");
const mongoose = require("mongoose");
const Tour = require("../../models/tourModel");
const Review = require("../../models/reviewModel");
const User = require("../../models/userModel");

dotenv.config({ path: "./config.env" });

// const dbConnectionString = process.env.REMOTE_DB_CONNECTION_STRING.replace(
//   "<PASSWORD>",
//   process.env.REMOTE_DB_PASSWORD
// );

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

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, "utf-8"));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, "utf-8"));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, "utf-8")
);

const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log("Data successfully loaded.");
  } catch (error) {
    console.log(error);
  }
  process.exit();
};

const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log("Data successfully deleted.");
  } catch (error) {
    console.log(error);
  }
  process.exit();
};

if (process.argv[2] === "--import") {
  console.log(
    "Rememeber to comment pre-save middlewares in userModel.js in order to prevent password encryption"
  );
  importData();
} else if (process.argv[2] == "--delete") {
  deleteData();
}
