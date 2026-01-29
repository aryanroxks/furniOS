// models/uom.model.js
import mongoose from "mongoose";

const uomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // KG, METER, PCS
    },
  },
  { timestamps: true }
);

export const UOM = mongoose.model("UOM", uomSchema);
