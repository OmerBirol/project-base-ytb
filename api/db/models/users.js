// api/db/models/Users.js

const mongoose = require("mongoose");
const is = require("is_js"); // email kontrolü için
const { PASS_LENGTH, HTTP_CODES } = require("../../config/Enum"); // kendi path'ine göre düzelt
const CustomError = require("../../lib/Error");                    // kendi path'ine göre düzelt
const bcrypt=require("bcrypt-nodejs")
const schema = new mongoose.Schema(
  {
    email:        { type: String, required: true, unique: true },
    password:     { type: String, required: true },
    is_active:    { type: Boolean, default: true },
    first_name:   String,
    last_name:    String,
    phone_number: String,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
  }
);

// ---- Class kısmı (videodaki gibi) ----
class Users extends mongoose.Model {
  
  validPassword(password){
    return bcrypt.compareSync(password,this.password);
  }




  static validateFieldsBeforeAuth(email, password) {  
    if (
      typeof password !== "string" ||
      password.length < PASS_LENGTH ||
      !is.email(email)
    ) {
      throw new CustomError(
        HTTP_CODES.UNAUTHORIZED,
        "Validation Error",
        "email or password wrong"
      );
    }

    return null;
  }
}

// Class'ı şemaya yükle
schema.loadClass(Users);

// Model export
module.exports = mongoose.model("Users", schema, "users");
