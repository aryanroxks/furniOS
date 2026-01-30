import mongoose, { Schema } from "mongoose";

const offerSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    appliesTo: {
      type: String,
      enum: ["PRODUCT", "SUBCATEGORY", "ALL"],
      required: true,
    },

    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    subCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "SubCategory",
      },
    ],

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    priority: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

export const Offer = mongoose.model("Offer", offerSchema);
