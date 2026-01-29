// models/purchaseDetails.model.js
import mongoose from "mongoose";

const purchaseDetailsSchema = new mongoose.Schema(
    {
        purchaseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Purchase",
            required: true,
            index: true,
        },

        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
            index: true,
        },

        itemType: {
            type: String,
            enum: ["PRODUCT", "RAWMATERIAL"],
            required: true,
            index: true,
        },

        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        lineTotal: {
            type: Number,
            required: true,
            min: 0,
        },

        purchaseDate: {
            type: Date,
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: ["RECEIVED"],
            default: "RECEIVED",
        },
    },
    { timestamps: true }
);

export const PurchaseDetail = mongoose.model(
    "PurchaseDetail",
    purchaseDetailsSchema
);
