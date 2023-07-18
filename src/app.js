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
                firstname: useremail.firstname,
                lastname: useremail.lastname,
                email: useremail.email,
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

app.post('/email-send', async (req, res) => {
    try {
        const data = await Register.findOne({ email: req.body.email });
        const response = {};
    
        if (data) {
            const otpCode = Math.floor((Math.random() * 10000) + 1);
            let otpData = new Otp({
                email: req.body.email,
                code: otpCode,
                expireIn: new Date().getTime() + 300 * 1000
            });
            const otpResponse = await otpData.save();
            mailer(req.body.email,req.body.password,otpCode);
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

app.post('/reset-password', async (req, res) => {
    try {
        const { code, password, confirmpassword } = req.body;
        console.log("otp =>",code);
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
                    response.message = 'Password changed successfully';
                    response.statusText = 'success';
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

const mailer = (email,Otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 587,
        secure: false,
        auth: {
            user: "USER_EMAIL",
            pass: "USER_PASS"
        }
    });

    const mailOptions = {
        from: "USER_EMAIL",
        to: email,
        subject:'Sending email using node js',
        text:'Thank You sir!'
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