const express = require("express");
let routers = express.Router();
let Product = require("../../models/product.model");
let Order = require("../../models/order.model");
const Review = require('../../models/review.model'); 
const mongoose = require("mongoose");

routers.get("/cart", async (req, res) => {
  let cart = req.cookies.cart || [];

  // Filter out invalid ObjectId entries and extract product IDs
  const validIds = cart
    .filter((item) => mongoose.Types.ObjectId.isValid(item.id))
    .map((item) => item.id);

  // If no valid product IDs are found, redirect or show an empty cart message
  if (validIds.length === 0) {
    return res.render("cart", {
      layout: "",
      products: [],
      total: 0,  // Cart is empty, total is 0
    });
  }

  // Fetch products with valid IDs
  let products = await Product.find({ _id: { $in: validIds } });

  // Attach the quantities to the products and calculate the total bill
  let total = 0;
  products = products.map((product) => {
    const cartItem = cart.find((item) => item.id === product._id.toString());
    const quantity = cartItem ? cartItem.quantity : 0;
    total += product.price * quantity;  // Accumulate the total price
    return {
      ...product.toObject(),
      quantity,
    };
  });

  // Render the cart page with products and total price
  return res.render("cart", {
    layout: "",
    products,
    total: total.toFixed(2),  // Display total with two decimal places
  });
});

// Add to cart
routers.get("/add-to-cart/:id", (req, res) => {
  const productId = req.params.id;

  // Validate the productId
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).send("Invalid product ID");
  }

  // Get the cart from cookies (or initialize if empty)
  let cart = req.cookies.cart || [];

  // Check if the product already exists in the cart
  const productIndex = cart.findIndex((item) => item.id === productId);

  if (productIndex > -1) {
    // Increment the quantity if the product is already in the cart
    cart[productIndex].quantity += 1;
  } else {
    // Add a new product with quantity 1
    cart.push({ id: productId, quantity: 1 });
  }

  // Update the cart cookie
  res.cookie("cart", cart);

  return res.redirect("/homepage");
});

routers.post("/update-cart/:id", (req, res) => {
  const productId = req.params.id;
  const action = req.body.action;  // Get action from the form button

  let cart = req.cookies.cart || [];

  const productIndex = cart.findIndex((item) => item.id === productId);

  if (productIndex > -1) {
    if (action === "increment") {
      cart[productIndex].quantity += 1;
    }
    else if (action === "decrement") {
      // Decrement the quantity
      if (cart[productIndex].quantity > 1) {
        cart[productIndex].quantity -= 1;
      } else {
        // If quantity is 1 and decrement is clicked, remove the product from cart
        cart = cart.filter(item => item.id !== productId);
      }
    }
  }

  res.cookie("cart", cart);
  return res.redirect("/cart");
});


// Remove from cart
routers.get("/remove-from-cart/:productId", (req, res) => {
  const productId = req.params.productId;
  let cart = req.cookies.cart || [];

  // Remove the product from cart
  cart = cart.filter(item => item.id !== productId);

  res.cookie("cart", cart);
  return res.redirect("/cart");
});

// Route to clear all items from the cart
routers.post("/clear-cart", (req, res) => {
  // Clear the cart cookie
  res.clearCookie("cart");

  // Redirect to the cart page with the cart cleared
  res.redirect("/cart");
});
routers.post("/checkout", async (req, res) => {
  try {
    // Ensure the user is logged in and fetch their ID from the session
    const userId = req.session.user._id; // Assuming user object contains the _id
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const cartItems = req.cookies.cart || [];
    const { name, email, number, address, paymentMethod, orderDate } = req.body;

    // Validate product IDs from the cart
    const productIds = cartItems
      .map((item) => {
        if (mongoose.Types.ObjectId.isValid(item.id)) {
          return new mongoose.Types.ObjectId(item.id);
        } else {
          console.error("Invalid productId:", item.id);
          return null;
        }
      })
      .filter((id) => id !== null);

    if (productIds.length === 0) {
      return res.status(400).json({ message: "No valid products in the cart" });
    }

    // Fetch products from the database
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length === 0) {
      return res.status(404).json({ message: "No products found in the database" });
    }

    // Calculate total bill and update stock
    const totalBill = cartItems.reduce((total, item) => {
      const product = products.find((p) => p._id.toString() === item.id);
      if (product) {
        // Check stock availability
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.title}`);
        }

        // Deduct the stock
        product.stock -= item.quantity;
        product.save(); // Save updated stock to the database

        total += product.price * item.quantity;
      }
      return total;
    }, 0);

    // Create the new order with the default "Pending" status
    const newOrder = new Order({
      userId,
      name,
      email,
      number,
      address,
      paymentMethod,
      date: orderDate,
      status: "Pending", // Explicitly setting the status to "Pending"
      products: products.map((product) => ({
        productId: product._id,
        title: product.title,
        quantity: cartItems.find((item) => item.id === product._id.toString()).quantity,
      })),
      total: totalBill,
    });

    // Save the order to the database
    await newOrder.save();

    // Clear the cart and redirect
    res.clearCookie("cart");
    res.redirect("Bootstrap");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error placing order" });
  }
});

routers.get("/customer-order", async (req, res) => {
  try {
    // Ensure the user's ID is available from the session
    const userId = req.user._id; // Adjust this based on your session structure
    if (!userId) {
      return res.redirect("/login");
    }

    // Fetch orders for the specific user
    const orders = await Order.find({ userId }).sort({ date: -1 });

    // Check if reviews exist for each order
    const ordersWithReviewStatus = await Promise.all(
      orders.map(async (order) => {
        const reviewExists = await Review.findOne({ orderId: order._id, userId });
        return {
          ...order.toObject(),
          hasReviewed: !!reviewExists, // Add `hasReviewed` flag
        };
      })
    );

    // Render the orders page with review status
    res.render("customer-order", { orders: ordersWithReviewStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching orders" });
  }
});
routers.post("/review-form/:id", async (req, res) => {
  const orderId = req.params.id;

  try {
    // Validate order ID
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).send("Invalid order ID");
    }

    // Fetch the order with populated user details
    const order = await Order.findById(orderId).populate('userId');
    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Extract rating and comment from the request body
    const { rating, comment } = req.body;

    // Create the review object
    const newReview = new Review({
      orders: [
        {
          orderId: order._id,
          userId: order.userId._id,
          name: order.name,
          email: order.email,
          products: order.products.map(product => ({
            productId: product.productId,
            title: product.title
          }))
        }
      ],
      rating,
      comment
    });

    // Save the review to the database
    await newReview.save();

    // Redirect to a specified route or page after saving the review
    res.redirect("/Bootstrap");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error submitting review");
  }
});
routers.get("/reviews", async (req, res) => {
  try {
    // Ensure the user's ID is available from the session
    const userId = req.user._id; // Adjust this based on your session structure
    if (!userId) {
      return res.redirect("/login");
    }

    // Fetch reviews for the specific user by matching the userId in the orders array
    const reviews = await Review.find({ "orders.userId": userId }).sort({ date: -1 });

    // Render the reviews page
    res.render("reviews", { reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching reviews" });
  }
});


  routers.get('/homepage', async (req, res) => {
    try {
        const products = await Product.find(); // Fetch all products from the database
        res.render('homepage', { products }); // Pass products to EJS
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Server error');
    }
  });

  module.exports = routers;