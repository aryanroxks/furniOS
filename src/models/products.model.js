import mongoose, { Schema } from "mongoose";

const productSchema = new Schema(
    {
        subCategoryID: {
            type: Schema.Types.ObjectId,
            ref: "SubCategory",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        stock: {
            type: Number,
            default: 0,
            min: 0,
        },

        /* ✅ FEATURES (ALL HERE) */
        features: {
            material: {
                type: String,
                required: true,
                index: true,
            },
            color: {
                type: String,
                required: true,
                index: true,
            },
            height: {
                type: String,
                required: true,
            },
            width: {
                type: String,
                required: true,
            },
            length: {
                type: String,
                required: true,
            },
        },

        images: [
            {
                name: String,
                url: { type: String, required: true },
                publicID: { type: String, required: true },
                isPrimary: { type: Boolean, default: false },
            },
        ],

        videos: [
            {
                url: { type: String, required: true },
                publicID: { type: String, required: true },
            },
        ],
    },
    { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
