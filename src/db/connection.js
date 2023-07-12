const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/UserAuthDemo',{
    useNewUrlParser: true,
    useUnifiedTopology:true
}).then(()=>{
    console.log("Connection Sucessfully");
}).catch((err)=>{
    console.log(err);
});