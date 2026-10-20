const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 10 },
    unitAmount: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: { type: [orderItemSchema], required: true },
    amountTotal: { type: Number, required: true },
    currency: {
      type: String,
      enum: ["pkr"],
      default: "pkr",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "bank_transfer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending_cod", "awaiting_bank_transfer", "paid", "cancelled"],
      required: true,
    },
    shippingDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
      phone: { type: String, required: true },
      address: {
        line1: { type: String, required: true },
        city: { type: String, required: true },
        state: String,
        postal_code: String,
        country: { type: String, default: "PK", required: true },
      },
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    paidAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
