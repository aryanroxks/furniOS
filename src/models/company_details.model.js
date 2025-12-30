import mongoose,{Schema} from "mongoose";

const companyDetailsSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    logoUrl: {
      type: String,
      required: true
    },

    address: {
      type: String,
      required: true
    },

    number: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Invalid phone number"]
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"]
    }
  },
  { timestamps: true }
);

export const CompanyDetails = mongoose.model(
  "CompanyDetails",
  companyDetailsSchema
);
