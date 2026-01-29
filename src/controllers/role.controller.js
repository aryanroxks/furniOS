import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import {Role} from "../models/role.model.js";

const createRole = asyncHandler(async(req,res) => {

    const {name} = req.body

    if(name===""){
        throw new ApiError(400,"Provide role!")
    }

    const existedRole = await Role.findOne({
        name:name
    })

    if(existedRole){
        throw new ApiError(401,"Role already exists!")
    }

    const newRole = await Role.create({
        name:name
    })

    const createdRole = await Role.findById(newRole._id)

    if(!createdRole){
        throw new ApiError(401,"Role could not be created!")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,createdRole,"Role successfully created!"))
})


export {
    createRole,
    
}