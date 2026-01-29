import mongoose,{Schema} from "mongoose";

const orderReturnDetailsSchema = new Schema(
  {
    orderReturnID: {
      type: Schema.Types.ObjectId,
      ref: "OrderReturn",
      required: true
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
      type: Number, // snapshot from order
      required: true
    },

    total: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);


export const OrderReturnDetail = mongoose.model("OrderReturnDetail",orderReturnDetailsSchema)