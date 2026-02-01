import mongoose, { Schema } from "mongoose";

const wholesaleQuotationItemSchema = new Schema(
{
    quotationID: {
        type: Schema.Types.ObjectId,
        ref: "WholesaleQuotation",
        required: true
    },

    productID: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },

    quantity: {
        type: Number,
        required: true
    },

    requestedPrice: {
        type: Number,
        required: true
    },

    approvedPrice: {
        type: Number
    },

    finalPrice: {
        type: Number
    }
},
{
    timestamps: true
});

export const WholesaleQuotationItem =
    mongoose.model("WholesaleQuotationItem", wholesaleQuotationItemSchema);
