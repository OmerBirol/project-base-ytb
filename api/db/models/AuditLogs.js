const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const auditLogSchema = new Schema(
  {
    level: { type: String },
    email: { type: String },
    location: { type: String },
    proc_type: { type: String },

    // log alanı - serbest json için Mixed ya da Object kullanabilirsin
    // 1. seçenek: Mixed (Mongoose tipi)
    // log: { type: Schema.Types.Mixed },

    // 2. seçenek: Object (çoğu senaryo için yeterli ve sorunsuz)
    log: { type: Object },
  },
  {
    versionKey: false,
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports = model("audit_logs", auditLogSchema);
