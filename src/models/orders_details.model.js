import mongoose, { Schema } from "mongoose";

const orderDetailSchema = new Schema(
  {
    orderID: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    productID: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number, // original product price
      required: true,
      min: 0,
    },

    finalUnitPrice: {
      type: Number, // after offer
      required: true,
      min: 0,
    },

    appliedOfferSnapshot: {
      title: String,
      discountType: String,
      discountValue: Number,
    },
  },
  { timestamps: true }
);

export const OrderDetail = mongoose.model(
  "OrderDetail",
  orderDetailSchema
);
