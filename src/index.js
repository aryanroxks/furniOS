import express from "express";
import connectDB from "./db/index.js";
import dotenv from "dotenv";
import {app} from "./app.js"


dotenv.config({
    path:'./env'
})

// const app = express();

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000  ,()=>{
        console.log(`Server is running on ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MongoDB connection failed!!",err)
})