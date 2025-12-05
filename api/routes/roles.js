const express = require("express");
const router = express.Router();

const Roles = require("../db/models/Roles");
const RolePrivileges = require("../db/models/RolePrivileges");
const UserRoles = require("../db/models/usersroles");
const Response = require("../lib/Response");
const CustomError = require("../lib/Error");
const Enum = require("../config/Enum");
const role_privileges = require("../config/roleprivileges");
const config = require("../config");

const auth = require("../lib/auth")();
const AuditLogs = require("../lib/AuditLogs");
const logger = require("../lib/loggger/LoggerClass");
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);


// Tüm isteklerde önce authenticate
router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});


// GET /api/roles  -> tüm rolleri permissions ile birlikte getir
router.get("/", auth.checkRoles("role_view"), async (req, res) => {
    try {
        let roles = await Roles.find({}).lean();

        for (let i = 0; i < roles.length; i++) {
            let permissions = await RolePrivileges.find({ role_id: roles[i]._id });
            roles[i].permissions = permissions;
        }

        res.json(Response.successResponse(roles));

    } catch (err) {
        logger.error(req.user?.email, "Roles", "List", err);
        let errorResponse = Response.errorResponse(err, req.user?.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});


// POST /api/roles/add
router.post("/add", auth.checkRoles("role_add"), async (req, res) => {
    let body = req.body;

    try {
        if (!body.role_name) {
            throw new CustomError(
                Enum.HTTP_CODES.BAD_REQUEST,
                i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language),
                i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["role_name"])
            );
        }

        if (!body.permissions || !Array.isArray(body.permissions) || body.permissions.length === 0) {
            throw new CustomError(
                Enum.HTTP_CODES.BAD_REQUEST,
                i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language),
                i18n.translate("COMMON.FIELD_MUST_BE_TYPE", req.user.language, ["permissions", "Array"])
            );
        }

        let role = new Roles({
            role_name: body.role_name,
            is_active: true,
            created_by: req.user?.id
        });

        await role.save();

        for (let i = 0; i < body.permissions.length; i++) {
            let priv = new RolePrivileges({
                role_id: role._id,
                permission: body.permissions[i],
                created_by: req.user?.id
            });

            await priv.save();
        }

        AuditLogs.info(req.user?.email, "Roles", "Add", role);
        logger.info(req.user?.email, "Roles", "Add", role);

        res.json(Response.successResponse({ success: true }));

    } catch (err) {
        logger.error(req.user?.email, "Roles", "Add", err);
        let errorResponse = Response.errorResponse(err, req.user?.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});


// POST /api/roles/update
router.post("/update", auth.checkRoles("role_update"), async (req, res) => {
    let body = req.body;

    try {
        if (!body._id) {
            throw new CustomError(
                Enum.HTTP_CODES.BAD_REQUEST,
                i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language),
                i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"])
            );
        }

        // Kendi rolünü güncellemeye çalışıyorsa engelle
        let userRole = await UserRoles.findOne({ user_id: req.user.id, role_id: body._id });
        if (userRole) {
            throw new CustomError(
                Enum.HTTP_CODES.FORBIDDEN,
                i18n.translate("COMMON.NEED_PERMISSIONS", req.user.language),
                i18n.translate("COMMON.NEED_PERMISSIONS", req.user.language)
            );
        }

        let updates = {};
        if (body.role_name) updates.role_name = body.role_name;
        if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

        // permissions güncelleme
        if (body.permissions && Array.isArray(body.permissions) && body.permissions.length > 0) {

            let permissions = await RolePrivileges.find({ role_id: body._id });

            // body.permissions => ["category_view", "user_add"]
            // permissions => [{role_id: "...", permission: "user_add", _id: "..."}];

            let removedPermissions = permissions.filter(x => !body.permissions.includes(x.permission));
            let newPermissions = body.permissions.filter(
                x => !permissions.map(p => p.permission).includes(x)
            );

            if (removedPermissions.length > 0) {
                await RolePrivileges.deleteMany({ _id: { $in: removedPermissions.map(x => x._id) } });
            }

            if (newPermissions.length > 0) {
                for (let i = 0; i < newPermissions.length; i++) {
                    let priv = new RolePrivileges({
                        role_id: body._id,
                        permission: newPermissions[i],
                        created_by: req.user?.id
                    });

                    await priv.save();
                }
            }
        }

        await Roles.updateOne({ _id: body._id }, updates);

        AuditLogs.info(req.user?.email, "Roles", "Update", { _id: body._id, ...updates });
        logger.info(req.user?.email, "Roles", "Update", { _id: body._id, ...updates });

        res.json(Response.successResponse({ success: true }));

    } catch (err) {
        logger.error(req.user?.email, "Roles", "Update", err);
        let errorResponse = Response.errorResponse(err, req.user?.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});


// POST /api/roles/delete
router.post("/delete", auth.checkRoles("role_delete"), async (req, res) => {
    let body = req.body;

    try {
        if (!body._id) {
            throw new CustomError(
                Enum.HTTP_CODES.BAD_REQUEST,
                i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language),
                i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"])
            );
        }

        await Roles.deleteOne({ _id: body._id });
        await RolePrivileges.deleteMany({ role_id: body._id });

        // İstediğin şekilde buraya uyarlanmış hali 👇
        // i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["name"]));
        // await Categories.deleteOne({_id:body._id});
        // AuditLogs.info(req.user?.email, "Categories", "Delete", { _id: body._id });

        AuditLogs.info(req.user?.email, "Roles", "Delete", { _id: body._id });
        logger.info(req.user?.email, "Roles", "Delete", { _id: body._id });

        res.json(Response.successResponse({ success: true }));

    } catch (err) {
        logger.error(req.user?.email, "Roles", "Delete", err);
        let errorResponse = Response.errorResponse(err, req.user?.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});


// GET /api/roles/role_privileges
router.get("/role_privileges", auth.checkRoles("role_view"), async (req, res) => {
    res.json(role_privileges);
});

module.exports = router;
