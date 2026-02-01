import mongoose, { Schema } from "mongoose";

const inquirySchema = new Schema(
  {
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    productID: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null, // optional
    },

    type: {
      type: String,
      enum: ["inquiry", "complaint", "return", "payment", "other"],
      required: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },

    adminReply: {
      type: String,
      trim: true,
    },

    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const Inquiry = mongoose.model("Inquiry", inquirySchema);
