import mongoose, { Schema } from "mongoose";

const feedbackSchema = new Schema(
  {
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    productID: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    isVerifiedPurchase: {
      type: Boolean,
      default: false, // set true if user bought this product
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // or "pending" if you want moderation
    },

    adminReply: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export const Feedback = mongoose.model("Feedback", feedbackSchema);
