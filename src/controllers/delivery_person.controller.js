import { DeliveryPerson } from "../models/delivery_person.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { roles } from "../constants.js";

export const createDeliveryPerson = asyncHandler(async (req, res) => {

    const { userID } = req.body;

    
    if (!userID || !mongoose.Types.ObjectId.isValid(userID)) {
        throw new ApiError(400, "Valid userID is required!");
    }

    //
    const user = await User.findById(userID);
    if (!user) {
        throw new ApiError(404, "User not found!");
    }

    if (user.roleID.toString() !== roles.delivery_person ) {
        throw new ApiError(400, "User is not a delivery person!");
    }

    console.log(user.roleID)

    const existingDeliveryPerson = await DeliveryPerson.findOne({ userID });
    if (existingDeliveryPerson) {
        throw new ApiError(409, "Delivery person already exists!");
    }

    
    const deliveryPerson = await DeliveryPerson.create({
        userID,
        status: "AVAILABLE",
        isActive: true
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                deliveryPerson,
                "Delivery person created successfully!"
            )
        );
});
