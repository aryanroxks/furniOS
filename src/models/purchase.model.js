// models/purchase.model.js
import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    purchaseDate: {
      type: Date,
      default: Date.now,
      required: true,
    },

    items: [
      {
        itemType: {
          type: String,
          enum: ["PRODUCT", "RAWMATERIAL"],
          required: true,
        },

        itemId: {
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
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["PENDING", "RECEIVED", "CANCELLED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export const Purchase = mongoose.model("Purchase", purchaseSchema);
