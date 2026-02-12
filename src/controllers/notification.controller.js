import mongoose from "mongoose";
import { Notification } from "../models/notifications.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";


export const createNotification = asyncHandler(async (req, res) => {


  const {
    targetType,
    userID,
    roleID,
    title,
    message,
    type,
    createdBy
  } = req.body;

  if (!targetType || !title || !message || !type || !createdBy) {
    throw new ApiError(400, "Required fields missing");
  }

  if (targetType === "single" && !userID) {
    throw new ApiError(400, "userID required for single notification");
  }

  if (targetType === "role" && !roleID) {
    throw new ApiError(400, "roleID required for role notification");
  }

  const notification = await Notification.create({
    targetType,
    userID: targetType === "single" ? userID : null,
    roleID: targetType === "role" ? roleID : null,
    title,
    message,
    type,
    createdBy
  });

  res.status(201).json(
    new ApiResponse(201, notification, "Notification created successfully")
  );
});



export const getMyNotifications = asyncHandler(async (req, res) => {

  const userID = req.user._id;
  const roleID = req.user.roleID;

  const notifications = await Notification.find({
    $or: [
      { targetType: "all" },
      { targetType: "single", userID },
      { targetType: "role", roleID }
    ]
  }).sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, notifications, "Notifications fetched")
  );
});



export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new ApiError(400, "Invalid notification ID");
  }

  const notification = await Notification.findById(notificationId);

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  notification.status = "read";
  await notification.save();

  res.status(200).json(
    new ApiResponse(200, notification, "Notification marked as read")
  );
});



export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userID = req.user._id;
  const roleID = req.user.roleID;

  await Notification.updateMany(
    {
      status: "unread",
      $or: [
        { targetType: "all" },
        { targetType: "single", userID },
        { targetType: "role", roleID }
      ]
    },
    { $set: { status: "read" } }
  );

  res.status(200).json(
    new ApiResponse(200, null, "All notifications marked as read")
  );
});



export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const userID = req.user._id;
  const roleID = req.user.roleID;

  const count = await Notification.countDocuments({
    status: "unread",
    $or: [
      { targetType: "all" },
      { targetType: "single", userID },
      { targetType: "role", roleID }
    ]
  });

  res.status(200).json(
    new ApiResponse(200, { count }, "Unread notification count")
  );
});



export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new ApiError(400, "Invalid notification ID");
  }

  const notification = await Notification.findByIdAndDelete(notificationId);

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  res.status(200).json(
    new ApiResponse(200, null, "Notification deleted successfully")
  );
});



// export const getAdminNotifications = asyncHandler(async (req, res) => {
//   const notifications = await Notification.find({
//     targetType: { $in: ["all", "role"] }
//   }).sort({ createdAt: -1 });

//   res.status(200).json(
//     new ApiResponse(200, notifications, "Admin notifications fetched")
//   );
// });

// export const getAdminNotifications = asyncHandler(async (req, res) => {
//   const adminRoleId = req.user.roleID;

//   const notifications = await Notification.find({
//     $or: [
//       { targetType: "all" },
//       { targetType: "role", roleID: adminRoleId },
//       { targetType: "single", userID: req.user._id }
//     ]
//   }).sort({ createdAt: -1 });

//   res.status(200).json(
//     new ApiResponse(200, notifications, "Admin notifications fetched")
//   );
// });

export const getAdminNotifications = asyncHandler(async (req, res) => {
const notifications = await Notification.find({
  targetType: { $in: ["all", "role", "single"] }
}).sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, notifications, "Admin notifications fetched")
  );
});


