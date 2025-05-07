const mongoose = require("mongoose");

let reviewSchema = mongoose.Schema({
  orders: [
    {
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // Referring to the Order model
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },   // Referring to the User model
      name: { type: String }, // Order name, can be fetched from the Order model
      email: { type: String }, // Order email, can be fetched from the Order model
      products: [
        {
          productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // Referring to the Product model
          title: { type: String } // Product title
        }
      ]
    }
  ],
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

let ReviewModel = mongoose.model("Review", reviewSchema);
module.exports = ReviewModel;
