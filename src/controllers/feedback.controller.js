import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Feedback } from "../models/feedback.model.js";
import { Order } from "../models/orders.model.js";
import mongoose from "mongoose";

export const createFeedback = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;
  const { rating, description } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid product ID");
  }

  // 🔒 Check if feedback already exists
  const existingFeedback = await Feedback.findOne({
    userID: userId,
    productID: productId,
  });

  if (existingFeedback) {
    throw new ApiError(409, "You have already submitted feedback for this product");
  }

  // ✅ Verify purchase (delivered order only)
  const hasPurchased = await Order.exists({
    userID: userId,
    "products.productID": productId,
    status: "DELIVERED",
  });

  const feedback = await Feedback.create({
    userID: userId,
    productID: productId,
    rating,
    description,
    isVerifiedPurchase: !!hasPurchased,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, feedback, "Feedback submitted successfully"));
});



export const updateMyFeedback = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { feedbackId } = req.params;
  const { rating, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    throw new ApiError(400, "Invalid feedback ID");
  }

  if (rating && (rating < 1 || rating > 5)) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const feedback = await Feedback.findOne({
    _id: feedbackId,
    userID: userId,
  });

  if (!feedback) {
    throw new ApiError(404, "Feedback not found or access denied");
  }

  // ✏️ Allowed updates only
  if (rating !== undefined) feedback.rating = rating;
  if (description !== undefined) feedback.description = description;

  await feedback.save();

  return res.status(200).json(
    new ApiResponse(200, feedback, "Feedback updated successfully")
  );
});


export const deleteMyFeedback = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { feedbackId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    throw new ApiError(400, "Invalid feedback ID");
  }

  const feedback = await Feedback.findOneAndDelete({
    _id: feedbackId,
    userID: userId,
  });

  if (!feedback) {
    throw new ApiError(404, "Feedback not found or access denied");
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Feedback deleted successfully")
  );
});


export const getMyFeedbacks = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const feedbacks = await Feedback.find({ userID: userId })
    .populate({
      path: "productID",
      select: "name price",
      
    })
    .sort({ createdAt: -1 });

  if (!feedbacks || feedbacks.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No feedbacks found"));
  }

  return res.status(200).json(
    new ApiResponse(200, feedbacks, "My feedbacks fetched successfully")
  );
});




export const getProductFeedbacks = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid product ID");
  }

  const feedbacks = await Feedback.find({
    productID: productId,
    status: "approved",
  })
    .populate({
      path: "userID",
      select: "username", // NEVER email/password
    })
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      feedbacks,
      "Product feedbacks fetched successfully"
    )
  );
});



export const getProductRatingSummary = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid product ID");
  }

  const summary = await Feedback.aggregate([
    {
      $match: {
        productID: new mongoose.Types.ObjectId(productId),
        status: "approved",
      },
    },
    {
      $group: {
        _id: "$productID",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
        verifiedReviews: {
          $sum: {
            $cond: ["$isVerifiedPurchase", 1, 0],
          },
        },
        ratingCounts: {
          $push: "$rating",
        },
      },
    },
    {
      $project: {
        _id: 0,
        averageRating: { $round: ["$averageRating", 1] },
        totalReviews: 1,
        verifiedReviews: 1,
        ratingBreakdown: {
          5: {
            $size: {
              $filter: {
                input: "$ratingCounts",
                as: "r",
                cond: { $eq: ["$$r", 5] },
              },
            },
          },
          4: {
            $size: {
              $filter: {
                input: "$ratingCounts",
                as: "r",
                cond: { $eq: ["$$r", 4] },
              },
            },
          },
          3: {
            $size: {
              $filter: {
                input: "$ratingCounts",
                as: "r",
                cond: { $eq: ["$$r", 3] },
              },
            },
          },
          2: {
            $size: {
              $filter: {
                input: "$ratingCounts",
                as: "r",
                cond: { $eq: ["$$r", 2] },
              },
            },
          },
          1: {
            $size: {
              $filter: {
                input: "$ratingCounts",
                as: "r",
                cond: { $eq: ["$$r", 1] },
              },
            },
          },
        },
      },
    },
  ]);

  // No feedback yet
  if (!summary.length) {
    return res.status(200).json(
      new ApiResponse(200, {
        averageRating: 0,
        totalReviews: 0,
        verifiedReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      }, "No ratings available for this product")
    );
  }

  return res.status(200).json(
    new ApiResponse(200, summary[0], "Product rating summary fetched successfully")
  );
});


export const getAllFeedbacksAdmin = asyncHandler(async (req, res) => {
  const feedbacks = await Feedback.find()
    .populate("userID", "username email")
    .populate("productID", "name")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, feedbacks, "All feedbacks fetched successfully")
  );
});


/**
 * GET /feedbacks/admin/:feedbackId
 * Admin: fetch single feedback
 */
export const getFeedbackByIdAdmin = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    throw new ApiError(400, "Invalid feedback ID");
  }

  const feedback = await Feedback.findById(feedbackId)
    .populate("userID", "username email")
    .populate("productID", "name");

  if (!feedback) {
    throw new ApiError(404, "Feedback not found");
  }

  return res.status(200).json(
    new ApiResponse(200, feedback, "Feedback fetched successfully")
  );
});


/**
 * PATCH /feedbacks/admin/:feedbackId
 * Admin: approve/reject feedback + reply
 */
export const updateFeedbackAdmin = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;
  const { status, adminReply } = req.body;

  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    throw new ApiError(400, "Invalid feedback ID");
  }

  if (
    status &&
    !["pending", "approved", "rejected"].includes(status)
  ) {
    throw new ApiError(400, "Invalid feedback status");
  }

  const feedback = await Feedback.findById(feedbackId);

  if (!feedback) {
    throw new ApiError(404, "Feedback not found");
  }

  // moderation updates
  if (status) feedback.status = status;
  if (adminReply !== undefined) feedback.adminReply = adminReply;

  await feedback.save();

  return res.status(200).json(
    new ApiResponse(200, feedback, "Feedback updated successfully")
  );
});
