const express = require('express');
const app = express();
const Register = require('./models/registers');
const bcrypt = require('bcryptjs');
require('./db/connection')
require('dotenv').config();

const PORT = process.env.PORT || 3000

app.use(express.json());

app.get('/', (req,res) => {
    res.send("hiii i'm hear")
})

//create user Register
app.post('/create', async (req, res)=>{
    try {
        const password = req.body.password
        const confirmpassword = req.body.confirmpassword

        if(password === confirmpassword){
            const register = new Register({
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                gender: req.body.gender,
                phone: req.body.phone,
                age: req.body.age,
                password: password,
                confirmpassword: confirmpassword
            });

            const token = await register.generateAuthToken();

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
        const email = req.body.email;
        const password = req.body.password

        const useremail = await Register.findOne({email:email})
        const isMatch = await bcrypt.compare(password, useremail.password)

        const token = await useremail.generateAuthToken();
        console.log("Login Token:",token);

        if(isMatch){
            res.status(201).send("Login successful")
            //res.status(201).render("File Name")
        }else{
            res.status(400).send("Please Check you credentials")
        }
    } catch (error) {
        res.status(400).send("Please Check you credentials !!");
    }
})


app.listen(PORT, () => {
    console.log(`server is running on this ${PORT} port`);
})