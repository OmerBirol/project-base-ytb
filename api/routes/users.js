// api/routes/users.js
const bcrypt=require("bcrypt-nodejs")
var express = require('express');
const Users = require('../db/models/Users');
const Response = require('../lib/Response');
var router = express.Router();
const is=require("is_js");
const Enum=require('../config/Enum');
const CustomError = require("../lib/Error");
const usersroles = require("../db/models/usersroles");
const Roles = require("../db/models/Roles");
const jwt=require("jwt-simple");
const config=require("../config");
const auth=require("../lib/auth")()
const i18n = new (require("../lib/i18n"))(config.DEFAULT_LANG); // i18n eklendi

/* GET users listing. */

router.post("/register", async (req, res) => {
  let body = req.body;
  try {
    let user= await Users.findOne({email: body.email});

    if(user){
      return res.sendStatus(Enum.HTTP_CODES.NOT_FOUND);
    }

    // EMAIL zorunlu
    if (!body.email)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", config.DEFAULT_LANG),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", config.DEFAULT_LANG, ["email"])
      );

    // EMAIL format
    if(!is.email(body.email))
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", config.DEFAULT_LANG),
        i18n.translate("USERS.EMAIL_FORMAT_ERROR", config.DEFAULT_LANG)
      );

    // PASSWORD zorunlu
    if(!body.password)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", config.DEFAULT_LANG),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", config.DEFAULT_LANG, ["password"])
      );

    // PASSWORD uzunluk
    if(body.password.lenght<Enum.PASS_LENGHT){
       throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", config.DEFAULT_LANG),
        i18n.translate("USERS.PASSWORD_LENGTH_ERROR", config.DEFAULT_LANG, [Enum.PASS_LENGHT])
       );
    }

    let password=bcrypt.hashSync(body.password,bcrypt.genSaltSync(8),null);

    // 🔽🔽🔽 BURASI SENİN ORJİNAL KODUN 🔽🔽🔽
    let createdUser=await Users.create({
      email:body.email,
      password,
      is_active:true,
      first_name:body.first_name,
      last_name:body.last_name,
      phone_number:body.phone_number
    });

    // SUPER_ADMIN rolünü bul
    let role = await Roles.findOne({ role_name: "SUPER_ADMIN" });

    // Yoksa oluştur
    if (!role) {
      role = await Roles.create({
        role_name: "SUPER_ADMIN",
        is_active: true,
        created_by: createdUser._id
      });
    }

    // user_roles kaydını ObjectId ile oluştur
    await usersroles.create({
      role_id: role._id,
      user_id: createdUser._id
    });
    // 🔼🔼🔼 GÜNCELLENEN KISIM BİTTİ 🔼🔼🔼
     
    res.status(Enum.HTTP_CODES.CREATED).json(Response.successResponse({success:true},Enum.HTTP_CODES.CREATED));

    }catch(err){
      let errorResponse=Response.errorResponse(err);
      res.status(errorResponse.code).json(errorResponse);

    }
})

router.post("/auth",async(req,res)=>{
  try {
    let {email,password}=req.body;
    Users.validateFieldsBeforeAuth(email,password);
    let user=await Users.findOne({email});

    if (!user)
      throw new CustomError(
        Enum.HTTP_CODES.UNAUTHORIZED,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", config.DEFAULT_LANG),
        i18n.translate("USERS.AUTH_ERROR", config.DEFAULT_LANG)
      );

    // NOT: Mantığına dokunmadım, sadece mesajı i18n'e aldım
    if(user.validPassword(password))
      throw new CustomError(
        Enum.HTTP_CODES.UNAUTHORIZED,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", config.DEFAULT_LANG),
        i18n.translate("USERS.AUTH_ERROR", config.DEFAULT_LANG)
      );
     
    let payload={
      id:user._id,
      exp:parseInt(Date.now() / 1000) + config.JWT.EXPIRE_TIME
    }
    let token =jwt.encode(payload,config.JWT.SECRET);

    let userData = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name
    }

    res.json(Response.successResponse({ token, user: userData }));

  } catch (err) {
      let errorResponse=Response.errorResponse(err);
      res.status(errorResponse.code).json(errorResponse);
  }
})

router.all("*",auth.authenticate(),(req,res,next)=>{
   next();
});

router.get('/',auth.checkRoles("user_view"), async (req, res) => {
  try {
    const usersList = await Users.find({});
    res.json(Response.successResponse(usersList));
  } catch (err) {
    const errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/add",auth.checkRoles("user_add"), async (req, res) => {
  let body = req.body;
  try {

    const lang = req.user.language;

    // EMAIL zorunlu
    if (!body.email)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["email"])
      );

    // EMAIL format
    if(!is.email(body.email))
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang),
        i18n.translate("USERS.EMAIL_FORMAT_ERROR", lang)
      );

    // PASSWORD zorunlu
    if(!body.password)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["password"])
      );

    // PASSWORD uzunluk
    if(body.password.lenght<Enum.PASS_LENGHT){
       throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang),
        i18n.translate("USERS.PASSWORD_LENGTH_ERROR", lang, [Enum.PASS_LENGHT])
       );
    }

    // ROLES zorunlu ve Array
    if (!body.roles || !Array.isArray(body.roles) || body.roles.lenght==0){
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang),
        i18n.translate("COMMON.FIELD_MUST_BE_TYPE", lang, ["roles", "Array"])
      );
    }

    let roles=await Roles.find({_id:{$in:body.roles}});

    if(roles.lenght==0){
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang),
        i18n.translate("COMMON.FIELD_MUST_BE_TYPE", lang, ["roles", "Array"])
      );
    }

    let password=bcrypt.hashSync(body.password,bcrypt.genSaltSync(8),null);

    let user=await Users.create({
      email:body.email,
      password,
      is_active:true,
      first_name:body.first_name,
      last_name:body.last_name,
      phone_number:body.phone_number
    });

    for (let i=0;i<roles.length;i++){
      await usersroles.create({
        role_id:roles[i]._id,
        user_id:user._id
      })
    }
    
    res.status(Enum.HTTP_CODES.CREATED).json(Response.successResponse({success:true},Enum.HTTP_CODES.CREATED));

    }catch(err){
      let errorResponse=Response.errorResponse(err);
      res.status(errorResponse.code).json(errorResponse);

    }
});

router.post("/update",auth.checkRoles("user_update"), async (req, res) => {
  try {
      let body=req.body;
      let updates={};
      const lang = req.user.language;

      if(!body._id)
        throw new CustomError(
          Enum.HTTP_CODES.BAD_REQUEST,
          i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang),
          i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["_id"])
        );

      if(body.password && body.password.lenght>=Enum.PASS_LENGHT){
        updates.password=bcrypt.hashSync(body.password,bcrypt.genSaltSync(8),null);

      }
      if(typeof body.is_active==="boolean") updates.is_active=body.is_active;
      if(body.first_name) updates.first_name=body.first_name;
      if(body.last_name) updates.last_name=body.last_name;
      if(body.phone_number) updates.phone_number=body.phone_number;

      if(Array.isArray(body.roles)&&body.roles.lenght>0){
         let userRoles=await usersroles.find({user_id:body._id});
        
         let removedRoles = userRoles.filter(x => !body.roles.includes(x.role_id));
         let newRoles = body.roles.filter(x => !userRoles.map(r => r.role_id).includes(x));
        if (removedRoles.length > 0) {
         await usersroles.deleteMany({ _id: { $in: removedRoles.map(x => x._id.toString()) } });
      }

       if (newRoles.length > 0) {
         for (let i = 0; i < newRoles.length; i++) {
           let userRole = new usersroles({
             role_id: newRoles[i],
             user_id: body._id
           });

          await userRole.save();
        }
      }
      }

      await Users.updateOne({_id: body._id},updates);
      res.json(Response.successResponse({success:true}));
    
  } catch (err) {
     let errorResponse=Response.errorResponse(err);
      res.status(errorResponse.code).json(errorResponse);
  }

});

router.post("/delete",auth.checkRoles("user_delete"),async(req,res)=>{
try {
  let body=req.body;
  const lang = req.user.language;

  if(!body._id)
    throw new CustomError(
      Enum.HTTP_CODES.BAD_REQUEST,
      i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang),
      i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["_id"])
    );

  await Users.deleteOne({_id:body._id});
  await usersroles.deleteMany({ user_id: body._id });

  res.json(Response.successResponse({success:true}));
} catch (err) 
{
     let errorResponse=Response.errorResponse(err);
     res.status(errorResponse.code).json(errorResponse);
}

});

module.exports = router;
