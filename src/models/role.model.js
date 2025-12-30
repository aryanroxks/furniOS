import mongoose, { Mongoose, Schema } from "mongoose";

const roleSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            enum: {
                values: [
                    "admin",
                    "wholesale_customer",
                    "retail_customer",
                    "delivery_person"
                ],
                message: "Invalid role name"
            }
        }
    },
    {
        timestamps: true
    }
)

export const Role = mongoose.model("Role", roleSchema)