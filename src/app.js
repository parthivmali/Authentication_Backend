const express = require('express');
const app = express();
const Register = require('./models/registers');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const auth = require('./middleware/auth');
require('./db/connection')
require('dotenv').config();

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


app.listen(PORT, () => {
    console.log(`server is running on this ${PORT} port`);
})