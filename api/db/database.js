
let instance=null;
const mongoose=require("mongoose");


class Database{

constructor(){
    if(!instance){
        this.mongoConnection=null;
        instance=this;
    }
    return instance;
}

 async connect(options){
    try{
         console.log("connecting...");

    let db = await mongoose.connect(options.CONNECTION_STRING);
    this.mongoConnection=db;
    console.log("DB connected.");
    }catch(err){
        console.error(err);
        process.exit(i);
        

    }
   
 }

}
module.exports=Database;