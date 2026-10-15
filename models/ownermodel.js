const mongoose = require("mongoose");
// mongoose.connect("mongodb://localhost:27017/Scatch");
const ownerSchema = new mongoose.Schema({
  fullname: {
    type: String,
    minlength: 3,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    minlength: 6,
  },
  products: {
    type: Array,
    default: [],
  },
  picture: String,
  gstin: String,
});
module.exports = mongoose.model("Owner", ownerSchema);
