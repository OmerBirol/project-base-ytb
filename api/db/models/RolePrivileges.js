const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    role_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    permissions: { type: String, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId}
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class RolePrivileges extends mongoose.Model {}

schema.loadClass(RolePrivileges);

module.exports = mongoose.model("RolePrivileges", schema,"roleprivileges");
