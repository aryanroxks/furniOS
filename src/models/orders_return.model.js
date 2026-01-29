import mongoose,{Schema} from "mongoose";

const orderReturnSchema = new Schema(
  {
    orderID: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },

    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: [
        "REQUESTED",
        "APPROVED",
        "REJECTED",
        "PICKED_UP",
        "RECEIVED",
        "REFUNDED"
      ],
      default: "REQUESTED"
    },

    reason: {
      type: String,
      required: true,
      trim: true
    },

    refundAmount: {
      type: Number,
      required: true,
      min: 0
    },

    refundMode: {
      type: String,
      enum: ["ORIGINAL", "WALLET", "BANK"],
      default: "ORIGINAL"
    },

    requestedAt: {
      type: Date,
      default: Date.now
    },

    approvedAt: Date,
    refundedAt: Date
  },
  { timestamps: true }
);





export const OrderReturn = mongoose.model("OrderReturn", orderReturnSchema);
