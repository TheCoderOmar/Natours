const app = require("./index");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

dotenv.config({ path: "./config.env" });
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log("Database Connected!!!");
  });

dotenv.config({ path: "./config.env" });

//console.log(process.env);
const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`port number: ${port}`);
});
