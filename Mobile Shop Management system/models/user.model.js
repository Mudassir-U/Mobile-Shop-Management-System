const mongoose = require("mongoose");
let usersSchema = mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: [String],
});
let UserModel = mongoose.model("User", usersSchema);

module.exports = UserModel;