const express = require("express");
const router = express.Router();

const Roles = require("../db/models/Roles");
const RolePrivileges = require("../db/models/RolePrivileges");
const Response = require("../lib/Response");
const CustomError = require("../lib/Error"); // Eğer yoksa ekle
const Enum = require("../config/Enum");
const role_privileges = require("../config/roleprivileges");
const mongoose = require("mongoose");
// GET all roles
router.get("/", async (req, res) => {
    try {
        let roles = await Roles.find({});
        res.json(Response.successResponse(roles));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

// ADD new role
router.post("/add", async (req, res) => {
    let body = req.body;

    try {
        if (!body.role_name)
            throw new CustomError(
                Enum.HTTP_CODES.BAD_REQUEST,
                "Validation error",
                "role_name field must be filled"
            );

        if (!body.permissions || !Array.isArray(body.permissions) || body.permissions.length === 0) {
            throw new CustomError(
                Enum.HTTP_CODES.BAD_REQUEST,
                "Validation error",
                "permissions must be a non-empty array"
            );
        }

        // 🔥 Aynı isimde role var mı kontrol et
        const existingRole = await Roles.findOne({ role_name: body.role_name.trim() });
        if (existingRole) {
            throw new CustomError(
                409,                    // CONFLICT
                "Duplicate",
                "This role_name already exists"
            );
        }

        // Yeni role oluştur
        let role = new Roles({
            role_name: body.role_name.trim(),
            is_active: true,
            created_by: req.user?.id
        });
        await role.save();

        // permissions ekleme döngüsü
        for (let i = 0; i < body.permissions.length; i++) {
            let priv = new RolePrivileges({
                role_id: role._id,
                permissions: body.permissions[i],
                created_by: req.user?.id
            });
            await priv.save();
        }

        res.json(Response.successResponse({ success: true }));
    } catch (err) {

        // Mongo unique index patlarsa (role_name benzersiz ise)
        if (err.code === 11000) {
            err = new CustomError(
                409,
                "Duplicate",
                "This role_name already exists"
            );
        }

        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});


// UPDATE role
router.post("/update", async (req, res) => {
    let body = req.body;
    try {
        if (!body._id)
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation error", "_id field must be filled");

        let updates = {};
        if (body.role_name) updates.role_name = body.role_name;
        if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

        // Update permissions if provided
        if (body.permissions && Array.isArray(body.permissions) && body.permissions.length > 0) {
            let existingPermissions = await RolePrivileges.find({ role_id: body._id });

            let removedPermissions = existingPermissions.filter(
                x => !body.permissions.includes(x.permissions)
            );
            let newPermissions = body.permissions.filter(
                x => !existingPermissions.map(p => p.permissions).includes(x)
            );

            if (removedPermissions.length > 0) {
                await RolePrivileges.deleteMany({ _id: { $in: removedPermissions.map(x => x._id) } });
            }

            if (newPermissions.length > 0) {
                for (let i = 0; i < newPermissions.length; i++) {
                    let priv = new RolePrivileges({
                        role_id: body._id,
                        permissions: newPermissions[i],
                        created_by: req.user?.id
                    });
                    await priv.save();
                }
            }
        }

        await Roles.updateOne({ _id: body._id }, updates);

        res.json(Response.successResponse({ success: true }));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

// DELETE role
router.post("/delete", async (req, res) => {
    let body = req.body;

    try {
        if (!body._id)
            throw new CustomError(
                Enum.HTTP_CODES.BAD_REQUEST,
                "Validation error",
                "_id field must be filled"
            );

        const roleId = new mongoose.Types.ObjectId(body._id);

        // 1) Rolü sil
        await Roles.deleteOne({ _id: roleId });

        // 2) O role_id’ye bağlı TÜM permissions’ı sil
        const result = await RolePrivileges.deleteMany({ role_id: roleId });

        console.log("Silinen RolePrivileges sayısı:", result.deletedCount);

        return res.json(Response.successResponse({ success: true }));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        return res.status(errorResponse.code).json(errorResponse);
    }
});

// GET static role_privileges
router.get("/roleprivileges", async (req, res) => {
    res.json(role_privileges);
});

module.exports = router;
