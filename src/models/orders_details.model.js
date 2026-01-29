import mongoose, { Schema } from "mongoose";

const orderDetailSchema = new Schema(
  {
    orderID: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },

    productID: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    price: {
      type: Number,
      required: true,
      min: 0
      // snapshot price at time of order
    }
  },
  {
    timestamps: true
  }
);

export const OrderDetail = mongoose.model("OrderDetail", orderDetailSchema);
