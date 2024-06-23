const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const axios = require("axios");
const FormData = require('form-data');
const fs = require("fs");
const path = require("path");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

mongoose.connect('mongodb://127.0.0.1:27017/hl', { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, "Connection error:"));
db.once('open', function() {
    console.log("Connected successfully to the database");
});

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Sign up endpoint
app.post("/sign_up", (req, res) => {
    const { firstname, lastname, email, password } = req.body;

    const data = {
        "firstname": firstname,
        "lastname": lastname,
        "email": email,
        "password": password
    };

    db.collection('users').insertOne(data, (err, collection) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error occurred while signing up.");
        } else {
            console.log("Recorded successfully");
            return res.redirect('disease.html');
        }
    });
});

//Checkout endpoint
app.post("/checkout", (req, res) => {
    const { username, email, address, address2, country, state, zip } = req.body;

    // Assuming totalPrice is calculated and sent from the client-side
    const totalPrice = req.body.totalPrice;

    const data = {
        "username": username,
        "email": email,
        "address": address,
        "address2": address2,
        "country": country,
        "state": state,
        "zip": zip,
        "totalPrice": totalPrice
    };

    db.collection('orders').insertOne(data, (err, collection) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error occurred while processing the checkout.");
        } else {
            console.log("Checkout data recorded successfully");
            return res.redirect('thankyou.html');
        }
    });
});




// Login endpoint
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.collection('users').findOne({ email: email }, (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).send("An error occurred. Please try again later.");
        } else if (user) {
            // Check if the password matches
            if (user.password === password) {
                return res.redirect('disease.html'); //Redirect to disease.html if login is successful
            } else {
                // Display an alert for incorrect username/password
                return res.send('<script>alert("Incorrect username/password"); window.location.href = "/login.html";</script>');
            }
        } else {
            // Display an alert for incorrect username/password
            return res.send('<script>alert("Incorrect username/password"); window.location.href = "/login.html";</script>');
        }
    });
});


// Diagnose endpoint with file upload and Flask API integration
app.post("/diagnose", upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    try {
        const formData = new FormData();
        formData.append('image', fs.createReadStream(req.file.path));

        // Replace 'http://your_flask_api_url' with your actual Flask API endpoint URL
        const response = await axios.post('http://3.110.196.103/', formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        // Assuming Flask API returns JSON with 'className' and 'probability'
        const className = response.data.class
        // className = className.toLowerCase()
        const probability = response.data.Probability

        const classData = await db.collection('diseases').findOne({ name: className });
        const description = classData ? classData.description : "Description not found";
        const symptoms = classData ? classData.symptoms : "Symptoms Not Found";
        const med1 = classData ? classData.med1 : "No Suggested Medication"
        const med2 = classData ? classData.med2 : "No Suggested Medication"
        const med3 = classData ? classData.med3 : "No Suggested Medication"
        const dimg = classData ? classData.img : "res/images/symp/404 Error-pana.svg"

        const med1p = classData ? classData.med1p : "Rs.100"
        const med2p = classData ? classData.med2p : "Rs.100"
        const med3p = classData ? classData.med3p : "Rs.100"



        // Send the prediction results
        res.redirect(`/results.html?class=${className}&description=${description}&symptoms=${symptoms}&med1=${med1}&med2=${med2}&med3=${med3}&dimg=${dimg}
        &med1p=${med1p}&med2p=${med2p}&med3p=${med3p}`);
    } catch (error) {
        console.error("Error in /diagnose endpoint:", error);
        res.status(500).send("Error processing the image.");
    } finally {
        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Server is running on port ${PORT}');
});