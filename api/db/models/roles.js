// api/db/models/Roles.js

const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    role_name: { type: String, required: true, unique: true },
    is_active: { type: Boolean, default: true },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    versionKey: false,
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// BURADA EKSTRA class/loadClass YOK!

module.exports = mongoose.model("Roles", schema, "roles");
