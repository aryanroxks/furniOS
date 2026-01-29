// models/rawMaterial.model.js
import mongoose from "mongoose";

const rawMaterialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    uomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UOM",
      required: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export const RawMaterial = mongoose.model(
  "RawMaterial",
  rawMaterialSchema
);
