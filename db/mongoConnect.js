const mongoose = require("mongoose");
const { secret } = require("../config/config");

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(
    `mongodb+srv://${secret.userDb}:${secret.passDb}@cluster0.amqcy.mongodb.net/test`
  );
  console.log("Mongo Connected... (Deliver Project)");
}
