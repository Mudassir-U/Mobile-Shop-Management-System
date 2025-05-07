const mongoose = require("mongoose");

let orderSchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: String,
  email: String,
  number: Number,
  address: String,
  paymentMethod: { type: String, enum: ["Cash"], default: "Cash" },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      title: { type: String },
      quantity: { type: Number }
    }
  ],
  total: { type: Number, required: true }, // Field to store the total bill
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["Pending", "Delivered"], default: "Pending" } // New status field
});

let OrderModel = mongoose.model("Order", orderSchema);
module.exports = OrderModel;
