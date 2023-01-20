const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const Project = require("./models/Project");
const Task = require("./models/Task");
const bcrypt = require("bcrypt");
const connectDB = require("./config/db");

dotenv.config({ path: "./config/config.env" });

connectDB();

const importData = async () => {
 try {
  const salt = await bcrypt.genSalt(10);
  let password = await bcrypt.hash(process.env.CODE_PASSWORD, salt);
  await User.insertMany([
    { 
      name: "user 1",
      email: "user1@gmail.com",
      password: password,
      admin: false
    },
    { 
      name: "user 2",
      email: "user2@gmail.com",
      password: password,
      admin: false
    },
    { 
      name: "user 3",
      email: "user3@gmail.com",
      password: password,
      admin: false
    },
    { 
      name: "user 4",
      email: "user4@gmail.com",
      password: password,
      admin: false
    },
    { 
      name: "admin 1",
      email: "admin1@gmail.com",
      password: password,
      admin: true
    },
    { 
      name: "admin 2",
      email: "admin2@gmail.com",
      password: password,
      admin: true
    }
  ]);
  await Project.insertMany([
    { 
      title: "project 1"
    },
    { 
      title: "project 2"
    },
    { 
      title: "project 3"
    },
    { 
      title: "project 4"
    },
    { 
      title: "project 5"
    }
  ]);
  for(const project of await Project.find()) {
    await Task.insertMany([
      { 
        project_id: project._id,
        title: "task 1"
      },
      { 
        project_id: project._id,
        title: "task 2"
      }
    ]);
  }

  console.log("Data imported successfully...");
  process.exit();
 } catch (error) {
  console.log(error);
 }
};

const deleteData = async () => {
 try {
  mongoose.connect(process.env.MONGO_URI, async () => {
   await mongoose.connection.db.dropDatabase();
   console.log("Database cleared successfully...");
   process.exit();
  });
 } catch (error) {
  console.log(error);
 }
};

if (process.argv[2] === "-i") {
 importData();
} else if (process.argv[2] === "-d") {
 deleteData();
}
