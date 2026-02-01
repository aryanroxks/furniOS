import mongoose,{Schema} from "mongoose";

const notificationReadSchema = new Schema(
  {
    notificationID: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      required: true
    },

    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    readAt: {
      type: Date,
      default: Date.now
    }
  }
);

export const NotificationRead = mongoose.model(
  "NotificationRead",
  notificationReadSchema
);
