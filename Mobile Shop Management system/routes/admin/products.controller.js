const express = require("express");
let router = express.Router();
let Product = require("../../models/product.model");
let Category = require("../../models/category.model");
let Order = require('../../models/order.model');
const Review = require('../../models/review.model'); 

let multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads"); // Directory to store files
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique file name
  },
});
const upload = multer({ storage: storage });

// route to render create product form
router.get("/admin/product/create", (req, res) => {
  res.render("admin/product-form", { 
    layout:"admin-layout",
    pageTitle: "Create New Product" });
});

//route to handle create product form submission
router.post("/admin/product/create", upload.single("file"),
 async (req, res) => {
  let data = req.body;
  let newProduct = new Product(data);
  newProduct.title = data.title;
  if (req.file) {
    newProduct.picture = req.file.filename;
  }
  await newProduct.save();
  return res.redirect("/admin/product/:page?");
});

//route to render edit product form
router.get("/admin/product/edit/:id", async (req, res) => {
  let product = await Product.findById(req.params.id);
  return res.render("admin/product-edit-form", {
    layout: "admin-layout",
    product,
  });
});

// route to handle Delete of product
router.get("/admin/product/delete/:id", async (req, res) => {
  let params = req.params;
  let product = await Product.findByIdAndDelete(req.params.id);
  // let query = req.query;
  // return res.send({ query, params });
  // return res.send(product);
  return res.redirect("/admin/product/:page?");
});

router.post("/admin/product/edit/:id", upload.single("file"),
 async (req, res) => {
  let product = await Product.findById(req.params.id);
  product.title = req.body.title;
  product.description = req.body.description;
  product.price = req.body.price;
  product.stock = req.body.stock;
  if (req.file) {
    Product.picture = req.file.filename;
  }
  await product.save();
  return res.redirect("/admin/product/:page?");
});

// 1. Route to render "Create Category" form
router.get("/category/category/create", (req, res) => {
  res.render("category/category-form", {
    layout: "admin-layout",
    pageTitle: "Create New Category",
  });
});

//route to handle create category form submission
router.post("/category/category/create", upload.single("file"),
 async (req, res) => {
  let data = req.body;
  let newCategory = new Category(data);
  newCategory.name = data.name;
  if (req.file) {
    newCategory.picture = req.file.filename;
  }
  await newCategory.save();
  return res.redirect("/category/category/:page?");
});

// 3. Route to render "Edit Category" form
router.get("/category/category/edit/:id", async (req, res) => {
  let category = await Category.findById(req.params.id);
  return res.render("category/category-edit-form", {
    layout: "admin-layout",
    category,
    pageTitle: "Edit Category",
  });
});

router.post("/category/category/edit/:id", upload.single("file"),
 async (req, res) => {
  let category = await Category.findById(req.params.id);
  category.name = req.body.name;
  category.description = req.body.description;
  category.price = req.body.price;
  if (req.file) {
    category.picture = req.file.filename;
  }
  await category.save();
  return res.redirect("/category/category/:page?");
});

// 5. Route to handle "Delete Category"
router.get("/category/category/delete/:id", async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  return res.redirect("/category/category/:page?");
});

router.get("/admin/order", async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ date: -1 });
    res.render("admin/order", {layout:"admin-layout", orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

router.get("/admin/customer-reviews", async (req, res) => {
  try {
    // Fetch all reviews and populate the userId inside the orders array with user details
    const reviews = await Review.find({})
      .populate('orders.userId', 'name email')  // Populate userId inside orders array with name and email
      .sort({ date: -1 }); // Optionally, sort by date in descending order
    
    // Render the reviews page
    res.render("admin/customer-reviews", { reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching reviews" });
  }
});



router.get("/admin/product/:page?", async (req, res) => {
  try {
    let page = req.params.page ? Number(req.params.page) : 1;
    const searchQuery = req.query.search || '';
    let pageSize = 2;

    // Get total records for pagination
    const totalRecords = await Product.countDocuments({
      title: { $regex: searchQuery, $options: 'i' },
    });
    const totalPages = Math.ceil(totalRecords / pageSize);

    // Fetch products with pagination and search query
    const products = await Product.find({
      title: { $regex: searchQuery, $options: 'i' },
    })
      .limit(pageSize)
      .skip((page - 1) * pageSize);

    // Render the product management page
    return res.render("admin/product", {
      layout: "admin-layout",
      pageTitle: "Manage Your Products",
      products,
      page,
      pageSize,
      totalPages,
      totalRecords,
      searchQuery,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("An error occurred while fetching products");
  }
});


//pagenation / Searching
router.get("/category/category/:page?", async (req, res) => {
  let page = req.params.page;
  page = page ? Number(page) : 1;
  const searchQuery = req.query.search || '';
  let pageSize = 1;
  let totalRecords = await Category.countDocuments({
    name:{$regex:searchQuery,$options:'i'}
  });
  let totalPages = Math.ceil(totalRecords / pageSize);
  let categories = await Category.find({
    name:{$regex:searchQuery,$options:'i'}
  })
    .limit(pageSize)
    .skip((page - 1) * pageSize);
  return res.render("category/category", {
    layout: "admin-layout",
    pageTitle: "Manage Your Categories",
    categories,
    page,
    pageSize,
    totalPages,
    totalRecords,
    searchQuery,
  });
});

// Route to update order status
router.post('/admin/order/:id', async (req, res) => {
  const orderId = req.params.id; // Get the order ID from the URL
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: 'Delivered' }, // Update the status to Delivered
      { new: true } // Return the updated order
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Redirect to the order page after updating the status
    res.redirect('/admin/order');
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;