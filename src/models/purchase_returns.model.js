// models/purchaseReturn.model.js
import mongoose from "mongoose";

const purchaseReturnItemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ["PRODUCT", "RAWMATERIAL"],
      required: true,
    },

    itemID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      trim: true,
    },
  },
  { _id: false } // important → keeps document clean
);

const purchaseReturnSchema = new mongoose.Schema(
  {
    purchaseID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
      index: true,
    },

    vendorID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    items: {
      type: [purchaseReturnItemSchema],
      required: true,
      validate: v => v.length > 0,
    },

    returnAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["CREATED", "COMPLETED"],
      default: "CREATED",
    },
  },
  { timestamps: true }
);

export const PurchaseReturn = mongoose.model(
  "PurchaseReturn",
  purchaseReturnSchema
);
