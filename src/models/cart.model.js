import mongoose, { Schema } from "mongoose";

const cartSchema = new Schema(
  {
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    products: [
      {
        productID: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },

        price: {
          type: Number, // ✅ original price snapshot
          required: true,
          min: 0,
        },

        finalUnitPrice: {
          type: Number, // ✅ after offer
          required: true,
          min: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Cart = mongoose.model("Cart", cartSchema);
