import mongoose,{Schema} from "mongoose";

const notificationSchema = new Schema(
  {
    targetType: {
      type: String,
      enum: ["single", "role", "all"],
      required: true
    },

    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    roleID: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      default: null
    },

    title: String,
    message: String,

    type: {
      type: String,
      enum: [
        "offer",
        "announcement",
        "order",
        "return",
        "quotation",
        "stock",
        "production"
      ]
    },

    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread"
    },

    createdBy: {
      type: String,
      enum: ["admin", "system"]
    }
  },
  { timestamps: true }
);


export const Notification = mongoose.model("Notification",notificationSchema)