import mongoose, { Schema } from "mongoose";

const wholesaleQuotationSchema = new Schema(
{
    quotationNumber: {
        type: String,
        unique: true
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
            "REVERTED",
            "APPROVED",
            "REJECTED",
            "ORDER_CREATED"
        ],
        default: "REQUESTED"
    },

    totalQuantity: {
        type: Number,
        default: 0
    },

    totalAmount: {
        type: Number,
        default: 0
    },

    userNote: {
        type: String
    },

    adminNote: {
        type: String
    }
},
{
    timestamps: true
});

export const WholesaleQuotation =
    mongoose.model("WholesaleQuotation", wholesaleQuotationSchema);
