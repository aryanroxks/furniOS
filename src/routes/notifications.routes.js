// create notification (admin

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";

import {
    deleteNotification,createNotification,getAdminNotifications,getMyNotifications,getUnreadNotificationCount,markAllNotificationsAsRead,markNotificationAsRead
} from "../controllers/notification.controller.js"

const router = Router();




//base url /notifications
router.route("/").post(
  verifyJWT,
  authorizeRoles(roles.admin),
  createNotification
);

// get logged-in user's notifications
router.route("/my").get(
  verifyJWT,
  getMyNotifications
);

// mark single notification as read
router.route("/:notificationId/read").patch(
  verifyJWT,
  markNotificationAsRead
);

// mark all notifications as read
router.route("/read-all").patch(
  verifyJWT,
  markAllNotificationsAsRead
);

// get unread notification count
router.route("/unread-count").get(
  verifyJWT,
  getUnreadNotificationCount
);

// delete notification (admin)
router.route("/:notificationId").delete(
  verifyJWT,
  authorizeRoles(roles.admin),
  deleteNotification
);

// get admin notifications (admin dashboard)
router.route("/admin").get(
  verifyJWT,
  authorizeRoles(roles.admin),
  getAdminNotifications
);


export default router;