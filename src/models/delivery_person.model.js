import mongoose, { Schema } from "mongoose";


const deliveryPersonSchema = new Schema(
  {
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "ON_DELIVERY", "OFFLINE"],
      default: "AVAILABLE"
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export const DeliveryPerson = mongoose.model("DeliveryPerson",deliveryPersonSchema)