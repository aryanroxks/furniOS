export const createSystemNotification = async ({
  targetType,
  userID = null,
  roleID = null,
  title,
  message,
  type
}) => {
  await Notification.create({
    targetType,
    userID,
    roleID,
    title,
    message,
    type,
    createdBy: "system"
  });
};
