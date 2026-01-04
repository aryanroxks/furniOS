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
        images: [
            {
                name: {
                    type: String, // front, side, back, etc.
                    trim: true,
                },
                url: {
                    type: String,
                    required: true,
                },
                publicId: {
                    type: String,
                    // required: true,
                },
                isPrimary: {
                    type: Boolean,
                    default: false,
                },

            },
        ],
        videos: [
            {
                name: {
                    type: String, // front, side, back, etc.
                    trim: true,
                },
                url: {
                    type: String,
                    required: true,
                },
                publicId: {
                    type: String,
                    // required: true,
                },
                isPrimary: {
                    type: Boolean,
                    default: false,
                },

            },
        ]
    },
    {
        timestamps: true,
    }
);

export const Product = mongoose.model("Product", productSchema);
