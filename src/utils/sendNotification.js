import { Notification } from "../models/notifications.model.js";
import { ApiError } from "./ApiError.js";

export const sendNotification = async ({
  targetType,
  userID = null,
  roleID = null,
  title,
  message,
  type,
  createdBy = "system"
}) => {

  if (!targetType || !title || !message || !type) {
    throw new ApiError(400, "Notification payload incomplete");
  }

  if (targetType === "single" && !userID) {
    throw new ApiError(400, "userID required for single notification");
  }

  if (targetType === "role" && !roleID) {
    throw new ApiError(400, "roleID required for role notification");
  }

  return await Notification.create({
    targetType,
    userID: targetType === "single" ? userID : null,
    roleID: targetType === "role" ? roleID : null,
    title,
    message,
    type,
    createdBy
  });
};
