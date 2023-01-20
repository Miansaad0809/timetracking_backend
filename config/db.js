const mongoose = require('mongoose');

const connectDB = async() => {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    if(!conn) console.log(`db is not connected on ${conn.connection.host}`);
}

module.exports = connectDB;