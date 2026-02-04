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


export const getDeliveryPersons = asyncHandler(async (req, res) => {
  const {
    status,        // AVAILABLE | ON_DELIVERY
    isActive,      // true | false
    page = 1,
    limit = 10,
  } = req.query;

  const filter = {};

  // filter by availability status
  if (status) {
    filter.status = status;
  }

  // filter active / inactive
  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  const skip = (Number(page) - 1) * Number(limit);

  const deliveryPersons = await DeliveryPerson.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate("userID");

  const total = await DeliveryPerson.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total,
        page: Number(page),
        limit: Number(limit),
        deliveryPersons,
      },
      "Delivery persons fetched successfully"
    )
  );
});


export const getAllDeliveryPersons = asyncHandler(async(req,res) => {

  const deliveryPersons = await DeliveryPerson.find().populate("userID")
  
  return res
  .status(200)
  .json( new ApiResponse(200 , deliveryPersons , "All delivery persons fetched successfully!"))


})




export const getNotActivatedDeliveryUsers = asyncHandler(async (req, res) => {
  // 1️⃣ Get all activated delivery person userIDs
  const activatedDeliveryPersons = await DeliveryPerson.find(
    {},
    { userID: 1 }
  );

  const activatedUserIds = activatedDeliveryPersons.map(
    (dp) => dp.userID
  );

  // 2️⃣ Find users with delivery_person role but NOT activated
  const users = await User.find({
    roleID: roles.delivery_person,
    _id: { $nin: activatedUserIds },
  }).select(
    "-password -refreshToken"
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      users,
      "Not activated delivery users fetched successfully"
    )
  );
});

export const toggleDeliveryPersonActive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  // 1️⃣ Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid delivery person ID");
  }

  // 2️⃣ Validate payload
  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive must be boolean");
  }

  // 3️⃣ Find delivery person
  const deliveryPerson = await DeliveryPerson.findById(id);

  if (!deliveryPerson) {
    throw new ApiError(404, "Delivery person not found");
  }

  // 4️⃣ Update active status
  deliveryPerson.isActive = isActive;
  await deliveryPerson.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      deliveryPerson,
      "Delivery person active status updated successfully"
    )
  );
});

export const deleteDeliveryPerson = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dp = await DeliveryPerson.findById(id);
  if (!dp) {
    throw new ApiError(404, "Delivery person not found");
  }

  // Optional safety check
  if (dp.status === "ON_DELIVERY") {
    throw new ApiError(400, "Cannot remove while on delivery");
  }

  await DeliveryPerson.findByIdAndDelete(id);

  return res.status(200).json(
    new ApiResponse(200, null, "Delivery person removed successfully")
  );
});
