// api/db/models/Users.js

const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    email:       { type: String, required: true ,unique:true},
    password:    { type: String, required: true },
    is_active:   { type: Boolean, default: true },
    first_name:  String,
    last_name:   String,
    phone_number:String,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
  }
);

module.exports = mongoose.model("Users", schema, "users");
