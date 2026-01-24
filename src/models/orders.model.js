import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema(
  {
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // snapshot of cart items at order time
    products: [
      {
        productID: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        name: {
          type: String, // snapshot (product name at time of order)
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        price: {
          type: Number, // snapshot price
          required: true,
          min: 0
        }
      }
    ],

    // taxes
    SGST: {
      type: Number,
      default: 0,
      min: 0
    },
    CGST: {
      type: Number,
      default: 0,
      min: 0
    },

    shippingCharge: {
      type: Number,
      default: 0,
      min: 0
    },

    // address snapshot
    deliveryAddress1: {
      type: String,
      required: true,
      trim: true
    },
    deliveryAddress2: {
      type: String,
      trim: true
    },

    status: {
      type: String,
      enum: [
        "PLACED",
        "CONFIRMED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED"
      ],
      default: "PLACED"
    },

    total: {
      type: Number,
      required: true,
      min: 0
    },

    deliveryPersonID: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryPerson" // or DeliveryPerson if you have separate model
    },

    offerID: {
      type: Schema.Types.ObjectId,
      ref: "Offer"
    },

    orderedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export const Order = mongoose.model("Order", orderSchema);
