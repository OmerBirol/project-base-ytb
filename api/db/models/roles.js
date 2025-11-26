const mongoose=require("mongoose");

const schema = mongoose.Schema({
    role_name:{type:String,required:true},
    is_active:{type:Boolean,default:true},
    created_by: {
        type: mongoose.SchemaType.ObjectId,
        required:true

    }

},{
    versionKey:false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }


});

class roles extends mongoose.Model(){

}

schema.loadClass(roles);
module.exports=mongoose.model("roles",schema);