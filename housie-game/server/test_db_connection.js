const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');

const uri = process.env.MONGO_URI;
console.log("Testing Connection to:", uri.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs

// Extract hostname from URI
const hostname = uri.split('@')[1].split('/')[0];
console.log("Resolving hostname:", hostname);

dns.resolve(hostname, (err, addresses) => {
    if (err) {
        console.error("DNS Resolution Failed:", err);
    } else {
        console.log("DNS Resolution Success:", addresses);
    }

    console.log("Attempting Mongoose Connect...");
    mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
        .then(() => {
            console.log("✅ Mongoose Connected Successfully!");
            process.exit(0);
        })
        .catch(err => {
            console.error("❌ Mongoose Connection Failed:");
            console.error("Name:", err.name);
            console.error("Message:", err.message);
            console.error("Code:", err.code);
            if (err.reason) console.error("Reason:", err.reason);
            process.exit(1);
        });
});
