const express = require('express');
const app = express();
const Register = require('./models/registers');
const Otp = require('./models/otp')
const bcrypt = require('bcryptjs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const auth = require('./middleware/auth');
require('./db/connection')
require('dotenv').config();
const nodemailer = require('nodemailer');
const PORT = process.env.PORT || 3000

app.use(express.json());
app.use(cookieParser())
app.get('/', (req,res) => {
    res.send("hiii i'm hear")
})
app.use(cors())
//create user Register
app.post('/create', async (req, res)=>{
    try {
        const {email,phone,password,confirmpassword} = req.body
        const emailExists = await Register.exists({email});
        const phoneExists = await Register.exists({phone});

        if(emailExists){
            return res.status(400).send("This email is already registered")
        }
        if(phoneExists){
            return res.status(400).send("This phone is already registered")
        }

        if(password === confirmpassword){
            const register = new Register({
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email,
                gender: req.body.gender,
                phone,
                age: req.body.age,
                password,
                confirmpassword,
            });


            const token = await register.generateAuthToken();
            res.cookie('jwt', token,{
                expires: new Date(Date.now() + 30000),
                httpOnly: true
            })

            const saveRegUser = await register.save();
            res.status(201).send(saveRegUser);
        }else{
            res.send("Password is not matching")
        }
    } catch (error) {
        res.status(400).send(error);
    }
})

//user login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const useremail = await Register.findOne({email})
        if (!useremail) {
            return res.status(400).send("Please check your credentials");
          }
        const isMatch = await bcrypt.compare(password, useremail.password)
        const logToken = await useremail.generateAuthToken();
        res.cookie('jwt', logToken,{
            expires: new Date(Date.now() + 60000),
            httpOnly: true
        })

        if(isMatch){
            const responseData = {
                message:"Login successful",
                _id : useremail._id,
                firstname: useremail.firstname,
                lastname: useremail.lastname,
                email: useremail.email,
                phone: useremail.phone,
                age: useremail.age,
                gender: useremail.gender,
                password: useremail.password,
                tokens: useremail.tokens
              };
            res.status(201).send(responseData)
            //res.status(201).render("File Name")
        }else{
            res.status(400).send("Please Check you credentials")
        }
    } catch (error) {
        res.status(400).send("Please Check you credentials");
    }
})

// Get single Register user  
app.get('/user/:id',async (req, res) => {
    try {
        const _id = req.params.id
        const editData = await Register.findById(_id);
        if(editData){
            res.status(200).send(editData);
        }else{
            res.status(404).send("Not Found");
        }
    } catch (error) {
        console.log("error",error.message);
    }
})

//Update single student data
app.patch('/update/:id',async (req, res) => {
    try {
        const _id = req.params.id
        const updateData = req.body
        if(Object.keys(updateData).length === 0){
            return res.status(400).send("No update data provided.");
        }
        const updateUser = await Register.findByIdAndUpdate(_id, updateData, {
            new:true
        })
        const response = {
            message: "User update successful",
            user: updateUser
        };
        res.status(200).send(response);
    } catch (error) {
        res.status(400).send(error);
    }
})

// Forgot password -> Send Email 
app.post('/email-send', async (req, res) => {
    try {
        const data = await Register.findOne({ email: req.body.email });
        const response = {};
    
        if (data) {
            const otpCode = Math.floor(1000 + Math.random() * 9000);
            let otpData = new Otp({
                email: req.body.email,
                code: otpCode,
                expireIn: new Date().getTime() + 300 * 1000 //current timestamp plus 300,000 milliseconds (300 seconds or 5 minutes). 
            });
            const otpResponse = await otpData.save();
            mailer(req.body.email,otpCode);
            response.statusText = "success";
            response.message = "Please check your email id";
            res.status(200).json(response);     
        } else {
            response.statusText = "error";
            response.message = "Email id not exist";
            res.status(404).json(response);
        }
    
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

// Reset Password (New Password)
app.post('/reset-password', async (req, res) => {
    try {
        const { code, password, confirmpassword } = req.body;
        if (password !== confirmpassword) {
            res.status(400).send({ message: "Passwords do not match", statusText: "error" });
            return;
        }
    
        const data = await Otp.findOne({code});
        const response = {};    
    
        if (data) {
            const currentTime = new Date().getTime();
            const diff = data.expireIn - currentTime;
            if (diff < 0) {
                response.message = 'Token expired';
                response.statusText = 'error';
                res.status(400).json(response);
                
            } else {
                const user = await Register.findOne({email:data.email});
                if (!user) {
                    response.message = 'User not found';
                    response.statusText = 'error';
                    res.status(404).json(response);
                } else {
                    user.password = req.body.password;
                    await user.save();
                    response.statusText = 'success';
                    response.message = 'Password changed successfully';
                    res.status(200).send(response);
                }
            }
        } else {
            response.message = 'Invalid Otp';
            response.statusText = 'error';
            res.status(404).json(response);
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: 'Internal server error', statusText: 'error' });
    }
});

const mailer = (email,otpCode) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 587,
        secure: false,
        auth: {
            user: process.env.USER_EMAIL,
            pass: process.env.USER_PASS
        }
    });

    const mailOptions = {
        from: process.env.USER_EMAIL,
        to: email,
        subject: 'Reset Your Password - OTP Verification',
        text: `Dear User,\n\nYou have requested to reset your password. Please use the following OTP code to proceed with the password reset process:\n\nOTP Code: ${otpCode}\n\nThis OTP is valid for the next 5 minutes.\n\nIf you did not request this password reset, you can safely ignore this email.\n\nBest regards,\nYour Application Team`,
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                <h2 style="color: #0056b3;">Reset Your Password - OTP Verification</h2>
                <p>Dear User,</p>
                <p>You have requested to reset your password. Please use the following OTP code to proceed with the password reset process:</p>
                <p style="font-weight: bold; font-size: 18px; background-color: #e8e8e8; padding: 10px;">OTP Code: ${otpCode}</p>
                <p style="font-size: 14px;">This OTP is valid for the next 5 minutes.</p>
                <p>If you did not request this password reset, you can safely ignore this email.</p>
                <p>Best regards,</p>
                <p>Your Application Team</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log("transporter error =>",error);
        }else{
            console.log('email sent =>', info.response );
        }
    })
}

app.listen(PORT, () => {
    console.log(`server is running on this ${PORT} port`);
})