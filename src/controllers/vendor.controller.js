import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/products.model.js";
import mongoose from "mongoose";
import {roles} from "../constants.js"
import { Vendor } from "../models/vendor.model.js";


const createVendor = asyncHandler(async (req, res) => {
  const { name, email, phone, address } = req.body;

  if (!name) {
    throw new ApiError(400, "Vendor name is required");
  }

  const vendor = await Vendor.create({
    name,
    email,
    phone,
    address,
  });

  if(!vendor){
    throw new ApiError(400,"Failed to create vendor!")
  }

  return res
    .status(201)
    .json(new ApiResponse(201, vendor, "Vendor created successfully"));

});


const getAllVendors = asyncHandler(async (req, res) => {
  const { search, isActive } = req.query;

  const query = {};

  if (typeof isActive !== "undefined") {
    query.isActive = isActive === "true";
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const vendors = await Vendor.find(query).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, vendors, "Vendors fetched successfully"));
});


const getVendorById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vendor = await Vendor.findById(id);

  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, vendor, "Vendor fetched successfully"));
});


const updateVendor = asyncHandler(async (req, res) => {

  const { id } = req.params;
  const { name, email, phone, address } = req.body;

  const vendor = await Vendor.findById(id);

  if (!vendor) {
    throw new ApiError(404, "Vendor not found!");
  }

  if (name !== undefined) vendor.name = name;
  if (email !== undefined) vendor.email = email;
  if (phone !== undefined) vendor.phone = phone;
  if (address !== undefined) vendor.address = address;

  await vendor.save();

  return res
    .status(200)
    .json(new ApiResponse(200, vendor, "Vendor updated successfully"));
});


const toggleVendorStatus = asyncHandler(async (req, res) => {

  const { id } = req.params;

  const vendor = await Vendor.findById(id);

  if (!vendor) {
    throw new ApiError(404, "Vendor not found!");
  }

  vendor.isActive = !vendor.isActive;
  await vendor.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      vendor,
      `Vendor ${vendor.isActive ? "activated" : "deactivated"} successfully`
    )
  );
});



export {
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    toggleVendorStatus


}