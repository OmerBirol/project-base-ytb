var express = require('express');
var router = express.Router();
const isAuthhenticated=false;

router.all("*",(req,res,next)=>{
  if (isAuthhenticated){
    next();
  }else{
    res.json({succes:false,error:"Not authhenticated"})
  }
})
/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json({succes:true});
  

});

module.exports = router;