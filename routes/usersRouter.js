const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const router = express.Router();
const bcrypt = require("bcrypt");
const userModel = require("../models/usermodel");
const Order = require("../models/ordermodel");
const {
  getGmailConfig,
  sendOrderConfirmation,
} = require("../utils/order-notifications");

const jwtSecret =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production"
    ? null
    : crypto.randomBytes(32).toString("hex"));
if (!jwtSecret) {
  throw new Error("Set JWT_SECRET in production before starting the app.");
}

const products = [
  {
    id: "everyday-tote",
    name: "The Everyday Tote",
    category: "Totes",
    price: 2499,
    color: "#e8d5bc",
    symbol: "👜",
    label: "BESTSELLER",
    description: "Room for your day, wherever it takes you.",
  },
  {
    id: "city-crossbody",
    name: "City Crossbody",
    category: "Crossbody",
    price: 1899,
    color: "#d9c7b7",
    symbol: "👝",
    label: "JUST IN",
    description: "Hands-free, easy-going, always ready.",
  },
  {
    id: "weekend-duffel",
    name: "Weekend Duffel",
    category: "Travel",
    price: 4299,
    color: "#c8d4bf",
    symbol: "🧳",
    label: "TRAVEL PICK",
    description: "A little extra room for the long weekend.",
  },
  {
    id: "mini-shoulder",
    name: "Mini Shoulder Bag",
    category: "Shoulder",
    price: 2199,
    color: "#e9c7c1",
    symbol: "👜",
    label: "",
    description: "Small on size. Big on personality.",
  },
  {
    id: "daily-backpack",
    name: "Daily Backpack",
    category: "Backpacks",
    price: 3199,
    color: "#cbd6e3",
    symbol: "🎒",
    label: "EVERYDAY",
    description: "Your everyday essentials, neatly in place.",
  },
  {
    id: "market-shopper",
    name: "Market Shopper",
    category: "Totes",
    price: 1599,
    color: "#e4dcae",
    symbol: "🛍️",
    label: "",
    description: "Lightweight, roomy, and ready for anything.",
  },
  {
    id: "woven-everyday-tote",
    name: "Woven Everyday Tote",
    category: "Totes",
    price: 2799,
    color: "#d8c5a9",
    symbol: "👜",
    label: "HANDWOVEN LOOK",
    description: "A textured favorite with room for the essentials.",
  },
  {
    id: "canvas-book-tote",
    name: "Canvas Book Tote",
    category: "Totes",
    price: 1799,
    color: "#e9dfc8",
    symbol: "📚",
    label: "",
    description: "A light, roomy carry-all for busy days.",
  },
  {
    id: "compact-crossbody",
    name: "Compact Crossbody",
    category: "Crossbody",
    price: 2299,
    color: "#d7b7a5",
    symbol: "👝",
    label: "CUSTOMER PICK",
    description: "Just enough space, with hands-free comfort.",
  },
  {
    id: "classic-satchel",
    name: "Classic Satchel",
    category: "Shoulder",
    price: 3499,
    color: "#b99b78",
    symbol: "👜",
    label: "",
    description: "A polished everyday shape with a timeless feel.",
  },
  {
    id: "quilted-shoulder",
    name: "Quilted Shoulder Bag",
    category: "Shoulder",
    price: 2999,
    color: "#d9c6ca",
    symbol: "👛",
    label: "JUST IN",
    description: "Soft texture and a little extra personality.",
  },
  {
    id: "commuter-backpack",
    name: "Commuter Backpack",
    category: "Backpacks",
    price: 3899,
    color: "#b9c5b8",
    symbol: "🎒",
    label: "WORKDAY READY",
    description: "A comfortable carry for work, class, and commute.",
  },
  {
    id: "mini-daypack",
    name: "Mini Daypack",
    category: "Backpacks",
    price: 2699,
    color: "#c5d0dc",
    symbol: "🎒",
    label: "",
    description: "Compact, lightweight, and ready for a day out.",
  },
  {
    id: "carry-on-duffel",
    name: "Carry-On Duffel",
    category: "Travel",
    price: 4999,
    color: "#b8c6a9",
    symbol: "🧳",
    label: "TRAVEL PICK",
    description: "Pack your weekend plans into one easy carry.",
  },
  {
    id: "evening-clutch",
    name: "Evening Clutch",
    category: "Clutches",
    price: 1699,
    color: "#d7b7b4",
    symbol: "👛",
    label: "",
    description: "A neat little finish for dinners and celebrations.",
  },
  {
    id: "zipper-pouch-set",
    name: "Zipper Pouch Set",
    category: "Accessories",
    price: 999,
    color: "#e6d7ba",
    symbol: "🧵",
    label: "EASY ORGANIZER",
    description: "Keep small essentials together inside any bag.",
  },
];

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function requireLogin(req, res, next) {
  try {
    const token = req.cookies.scatch_token;
    if (!token) {
      return res.redirect("/users/login");
    }

    const payload = jwt.verify(token, jwtSecret);
    const user = await userModel.findById(payload.sub).select("-password");
    if (!user) {
      res.clearCookie("scatch_token", cookieOptions);
      return res.redirect("/users/login");
    }

    req.user = user;
    return next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      res.clearCookie("scatch_token", cookieOptions);
      return res.redirect("/users/login");
    }

    return next(err);
  }
}

router.get("/", (req, res) => {
  res.send("Welcome to the Users API");
});

router.get("/create", (req, res) => {
  res.render("users-create", { error: null });
});

router.post("/create", async (req, res) => {
  try {
    const fullname = req.body.fullname?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!fullname || !email || !password) {
      return res.status(400).render("users-create", {
        error: "Please complete all required fields.",
      });
    }

    if (fullname.length < 3 || password.length < 6) {
      return res.status(400).render("users-create", {
        error: "Name must be at least 3 characters and password at least 6.",
      });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(409).render("users-create", {
        error: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await userModel.create({ fullname, email, password: hashedPassword });
    return res.redirect("/users/login?created=1");
  } catch (err) {
    console.error("Failed to create user:", err);
    return res.status(500).render("users-create", {
      error: "Could not create your account. Please try again.",
    });
  }
});

router.get("/login", (req, res) => {
  res.render("users-login", {
    error: null,
    message: req.query.created ? "Your account is ready. Please log in." : null,
  });
});

router.post("/login", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).render("users-login", {
        error: "Enter your email and password.",
        message: null,
      });
    }

    const user = await userModel.findOne({ email });
    const passwordMatches = user && await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).render("users-login", {
        error: "Email or password is incorrect.",
        message: null,
      });
    }

    const token = jwt.sign({}, jwtSecret, {
      subject: user._id.toString(),
      expiresIn: "7d",
    });
    res.cookie("scatch_token", token, cookieOptions);
    return res.redirect("/users/shop");
  } catch (err) {
    console.error("Failed to log in user:", err);
    return res.status(500).render("users-login", {
      error: "Could not log in. Please try again.",
      message: null,
    });
  }
});

router.get("/shop", requireLogin, async (req, res, next) => {
  try {
    const cart = Array.isArray(req.user.cart) ? req.user.cart : [];
    const cartItems = cart.flatMap((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1) {
        return [];
      }
      return [{ product, quantity, lineTotal: product.price * quantity }];
    });
    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cartItems.reduce((total, item) => total + item.lineTotal, 0);

    return res.render("shop", {
      user: req.user,
      products,
      categories: [...new Set(products.map((product) => product.category))],
      cartItems,
      cartCount,
      cartTotal,
      checkoutError: {
        invalid_details: "Please complete your delivery and contact details and choose a payment method.",
        order_failed: "We could not place your order. Your bag is still saved; please try again.",
      }[req.query.checkout] || null,
      formatPrice: (price) => `Rs. ${price.toLocaleString("en-PK")}`,
      recentOrders: await Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/cart/add", requireLogin, async (req, res, next) => {
  try {
    const product = products.find((entry) => entry.id === req.body.productId);
    if (!product) {
      return res.status(400).send("That bag is not available.");
    }

    const cart = Array.isArray(req.user.cart) ? req.user.cart : [];
    const existingItem = cart.find((item) => item.productId === product.id);
    if (existingItem) {
      existingItem.quantity = Math.min(Number(existingItem.quantity) + 1, 10);
    } else {
      cart.push({ productId: product.id, quantity: 1 });
    }

    req.user.cart = cart;
    await req.user.save();
    return res.redirect("/users/shop");
  } catch (err) {
    return next(err);
  }
});

router.post("/checkout", requireLogin, async (req, res, next) => {
  try {
    const paymentMethod = req.body.paymentMethod;
    const shippingDetails = {
      name: req.body.shippingName?.trim(),
      email: req.body.email?.trim().toLowerCase(),
      phone: req.body.phone?.trim(),
      address: {
        line1: req.body.addressLine1?.trim(),
        city: req.body.city?.trim(),
        state: req.body.province?.trim(),
        postal_code: req.body.postalCode?.trim(),
        country: "PK",
      },
    };
    const phoneDigits = shippingDetails.phone?.replace(/\D/g, "");
    if (
      paymentMethod !== "cash_on_delivery" ||
      !shippingDetails.name ||
      shippingDetails.name.length > 100 ||
      !shippingDetails.email ||
      shippingDetails.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingDetails.email) ||
      !phoneDigits ||
      phoneDigits.length < 10 ||
      phoneDigits.length > 15 ||
      !shippingDetails.address.line1 ||
      shippingDetails.address.line1.length > 200 ||
      !shippingDetails.address.city ||
      shippingDetails.address.city.length > 100 ||
      (shippingDetails.address.state && shippingDetails.address.state.length > 100) ||
      (shippingDetails.address.postal_code &&
        shippingDetails.address.postal_code.length > 20)
    ) {
      return res.redirect("/users/shop?checkout=invalid_details");
    }

    const cart = Array.isArray(req.user.cart) ? req.user.cart : [];
    const items = cart.flatMap((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return [];
      }
      return [{
        productId: product.id,
        name: product.name,
        quantity,
        unitAmount: product.price,
      }];
    });

    if (items.length === 0) {
      return res.redirect("/users/shop");
    }

    const amountTotal = items.reduce(
      (sum, item) => sum + item.unitAmount * item.quantity,
      0
    );
    try {
      const order = await Order.create({
        user: req.user._id,
        items,
        amountTotal,
        currency: "pkr",
        paymentMethod,
        status: "pending_cod",
        shippingDetails,
      });

      try {
        req.user.cart = [];
        await req.user.save();
      } catch (err) {
        console.error("Order created, but failed to clear the user's cart:", err);
      }
      try {
        await sendOrderConfirmation(order);
      } catch (err) {
        console.error("Order created, but confirmation notifications could not be sent:", err);
      }
      return res.redirect(`/users/orders/${order._id}`);
    } catch (err) {
      console.error("Failed to place order:", err);
      return res.redirect("/users/shop?checkout=order_failed");
    }
  } catch (err) {
    return next(err);
  }
});

router.get("/orders/:orderId", requireLogin, async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.orderId)) {
      return res.status(404).send("Order not found.");
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    });
    if (!order) {
      return res.status(404).send("Order not found.");
    }

    return res.render("order-result", {
      order,
      notificationAvailability: {
        email: Boolean(getGmailConfig()),
        sms: Boolean(
          process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_AUTH_TOKEN &&
          process.env.TWILIO_PHONE_NUMBER
        ),
      },
      orderItems: order.items.map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return {
          ...item.toObject(),
          color: product?.color || "#e8d5bc",
          symbol: product?.symbol || "👜",
        };
      }),
      formatPrice: (amount) => `Rs. ${amount.toLocaleString("en-PK")}`,
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("scatch_token", cookieOptions);
  return res.redirect("/");
});

module.exports = router;
