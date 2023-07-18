const mongoose = require('mongoose');

const userOtpSchema = new mongoose.Schema({
    email:String,
    code:String,
    expireIn: Number
},{
    timestamps:true
});

const Otp = new mongoose.model('Otp',userOtpSchema,'Otp');

module.exports = Otp;