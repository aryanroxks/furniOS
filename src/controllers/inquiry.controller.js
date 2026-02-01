import mongoose from "mongoose";
import { Inquiry } from "../models/inquiry.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";


export const createInquiry = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productID, type, subject, message } = req.body;

  if (!type || !subject || !message) {
    throw new ApiError(400, "Type, subject and message are required");
  }

  if (productID && !mongoose.Types.ObjectId.isValid(productID)) {
    throw new ApiError(400, "Invalid product ID");
  }

  const inquiry = await Inquiry.create({
    userID: userId,
    productID: productID || null,
    type,
    subject,
    message,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, inquiry, "Inquiry created successfully"));
});


export const getMyInquiries = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const inquiries = await Inquiry.find({ userID: userId })
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, inquiries, "My inquiries fetched successfully")
  );
});


export const getMyInquiryById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { inquiryId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
    throw new ApiError(400, "Invalid inquiry ID");
  }

  const inquiry = await Inquiry.findOne({
    _id: inquiryId,
    userID: userId,
  }).populate("productID", "name");

  if (!inquiry) {
    throw new ApiError(404, "Inquiry not found or access denied");
  }

  return res.status(200).json(
    new ApiResponse(200, inquiry, "Inquiry fetched successfully")
  );
});



export const closeMyInquiry = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { inquiryId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
    throw new ApiError(400, "Invalid inquiry ID");
  }

  const inquiry = await Inquiry.findOne({
    _id: inquiryId,
    userID: userId,
  });

  if (!inquiry) {
    throw new ApiError(404, "Inquiry not found or access denied");
  }

  if (inquiry.status !== "resolved") {
    throw new ApiError(400, "Only resolved inquiries can be closed");
  }

  inquiry.status = "closed";
  await inquiry.save();

  return res.status(200).json(
    new ApiResponse(200, inquiry, "Inquiry closed successfully")
  );
});


export const getAllInquiries = asyncHandler(async (req, res) => {
  const inquiries = await Inquiry.find()
    .populate("userID", "username email")
    .populate("productID", "name")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, inquiries, "All inquiries fetched successfully")
  );
});


export const getInquiryByIdAdmin = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
    throw new ApiError(400, "Invalid inquiry ID");
  }

  const inquiry = await Inquiry.findById(inquiryId)
    .populate("userID", "username email")
    .populate("productID", "name");

  if (!inquiry) {
    throw new ApiError(404, "Inquiry not found");
  }

  return res.status(200).json(
    new ApiResponse(200, inquiry, "Inquiry details fetched successfully")
  );
});


export const updateInquiryStatus = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
    throw new ApiError(400, "Invalid inquiry ID");
  }

  const inquiry = await Inquiry.findById(inquiryId);

  if (!inquiry) {
    throw new ApiError(404, "Inquiry not found");
  }

  inquiry.status = status;

  if (status === "resolved") {
    inquiry.resolvedAt = new Date();
  }

  await inquiry.save();

  return res.status(200).json(
    new ApiResponse(200, inquiry, "Inquiry status updated successfully")
  );
});



export const replyToInquiry = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  const { adminReply, status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
    throw new ApiError(400, "Invalid inquiry ID");
  }

  const inquiry = await Inquiry.findById(inquiryId);

  if (!inquiry) {
    throw new ApiError(404, "Inquiry not found");
  }

  inquiry.adminReply = adminReply;
  inquiry.status = status || "in_progress";

  if (status === "resolved") {
    inquiry.resolvedAt = new Date();
  }

  await inquiry.save();

  return res.status(200).json(
    new ApiResponse(200, inquiry, "Reply sent successfully")
  );
});


export const deleteInquiryAdmin = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
    throw new ApiError(400, "Invalid inquiry ID");
  }

  const inquiry = await Inquiry.findByIdAndDelete(inquiryId);

  if (!inquiry) {
    throw new ApiError(404, "Inquiry not found");
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Inquiry deleted successfully")
  );
});
