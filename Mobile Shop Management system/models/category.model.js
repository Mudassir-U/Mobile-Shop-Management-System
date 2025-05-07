const mongoose = require("mongoose");

let categorySchema = mongoose.Schema({
  name: String,
  description: String,
  picture: String,
  price: Number,
});

let CategoryModel = mongoose.model("Category", categorySchema);

module.exports = CategoryModel;