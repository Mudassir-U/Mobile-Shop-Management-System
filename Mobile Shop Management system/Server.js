const express = require("express");
const mongoose = require("mongoose");
let server = express();
const bcrypt = require("bcrypt");
const flash = require("connect-flash");
server.use(flash());

let Order = require("./models/order.model");

let Product = require("./models/product.model");
let User = require("./models/user.model");

let cookieParser = require("cookie-parser");
server.use(cookieParser());

let session = require("express-session");
server.use(session({ secret: "my session secret" }));

let siteMiddleware = require("./middlewares/site-middleware");
let authMiddleware = require("./middlewares/auth-middleware");
server.use(siteMiddleware);

var expressLayouts = require("express-ejs-layouts");
server.use(expressLayouts);

server.set("view engine", "ejs");
server.use(express.static("public"));
server.use(express.static("uploads"));

server.use(express.urlencoded());

let shoppingCartRouter = require("./routes/user/shopping.controller");
//server.use(shoppingCartRouter);
let adminProductsRouter = require("./routes/admin/products.controller");
//server.use(adminProductsRouter);

server.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

server.get("/about-me", authMiddleware, (req, res) => {
  return res.render("about-me");
});
server.get("/logout", async (req, res) => {
  req.session.user = null;
  return res.redirect("/login");
});
server.get("/login", async (req, res) => {
  return res.render("auth/login");
});

server.get("/password", async (req, res) => {
  return res.render("auth/password"); // Ensure you have a corresponding password.ejs file to render this form
});

// Password reset handling (POST)
server.post("/auth/password", async (req, res) => {
  try {
    const { email, new_password, confirm_password } = req.body;

    // Validate that the new password and confirm password match
    if (new_password !== confirm_password) {
      return res.status(400).send("Passwords do not match.");
    }

    // Check if a user with the provided email exists in the database
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send("No account associated with this email.");
    }

    // Hash the new password before saving it
    const hashedPassword = await bcrypt.hash(new_password, 10);
    user.password = hashedPassword; // Set the hashed password
    await user.save(); // Save the updated user

    // Show success message and redirect to login page
    req.flash("success", "Password reset successfully! Please login with your new password.");
    return res.redirect("/login"); // Redirect to login page
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).send("An error occurred while resetting your password. Please try again later.");
  }
});


server.post("/login", async (req, res) => {
  let data = req.body;
  let user = await User.findOne({ email: data.email });
  if (!user) return res.redirect("/register");
  const isValid = await bcrypt.compare(data.password, user.password);
  if (!isValid) return res.redirect("/login");
  req.session.user = user;
  return res.redirect("/Bootstrap");
});



server.get("/register", async (req, res) => {
  return res.render("auth/register");
});


server.post("/register", async (req, res) => {
  let data = req.body;
  let user = await User.findOne({ email: data.email });
  const hashedPassword = await bcrypt.hash(data.password, 10);
  user = new User({ ...data, password: hashedPassword })
  await user.save();
  return res.redirect("/login");
});


/*
server.get("/add-to-cart/:id", (req, res) => {
  let cart = req.cookies.cart;
  cart = cart ? cart : [];
  cart.push(req.params.id);
  res.cookie("cart", cart);
  return res.redirect("/Bootstrap");
});

server.get("/cart", async (req, res) => {
  let cart = req.cookies.cart;
  cart = cart ? cart : [];
  let products = await Product.find({ _id: { $in: cart } });
  return res.render("cart", { products });
});*/

let adminMiddleware = require("./middlewares/admin-middleware");

server.use("/", authMiddleware, (req, res, next) => {
  if (req.session.user?.role.includes("admin")) {
    return adminMiddleware(req, res, () => {
      adminProductsRouter(req, res, next); 
    });
  }
  next(); 
});

server.use("/", authMiddleware, (req, res, next) => {
  if (!req.session.user?.role.includes("admin")) {
    // If the user does not have the 'admin' role, apply user functionality
    return shoppingCartRouter(req, res, next);
  }
  next(); // If admin, skip this middleware
});

server.get("/review-form/:id", async (req, res) => {
  const orderId = req.params.id;
  console.log("Received orderId:", orderId);  // Log the received orderId
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).send("Invalid order ID");
  }

  try {
    const order = await Order.findById(orderId).populate('userId');
    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("review-form", { order });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching order details");
  }
});

server.get("/checkout",(req,res)=>{
  return res.render("checkout");
});

server.get("/Bootstrap", (req, res) => {
    return res.render("Bootstrap");
  });

  let connectionString = "mongodb://127.0.0.1/Mobileshop";
  mongoose
    .connect(connectionString, { useNewUrlParser: true })
    .then(() => console.log("Connected to Mongo DB Server: " + connectionString))
    .catch((error) => console.log(error.message));

  server.listen(2000, () => {
    console.log(`Server Started at localhost:2000`);
  });