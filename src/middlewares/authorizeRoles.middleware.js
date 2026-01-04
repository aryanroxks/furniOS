import { ApiError } from "../utils/ApiError.js";


const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(String(req.user.roleID))) {
    throw new ApiError(403, "Forbidden");
  }
  next();
};

export { authorizeRoles };


// const authorizeRoles = (...allowedRoles) => (req, res, next) => {
//     if (!req.user?.roleID) throw new ApiError(401, "Unauthorized");

//     // Convert ObjectId to string internally for comparison
//     const userRoleId = req.user.roleID.toString();

//     const allowed = allowedRoles.some(roleId => userRoleId === roleId);
//     if (!allowed) throw new ApiError(403, "Access denied!");

//     next();
// };

// export { authorizeRoles };



// import { ApiError } from "../utils/ApiError.js";

// const authorizeRoles = (...allowedRoles) => {
//     return (req,res,next) => {
//         if(!req.user || !allowedRoles.includes(req.user.roleID)){
//             throw new ApiError(403,"Access denied!")
//         }
//         next()
//     }
// }

// export {authorizeRoles}



// import { ApiError } from "../utils/ApiError.js";
// import { Role } from "../models/role.model.js"; // your roles collection

// const authorizeRoles = (...roleNames) => {
//     return async (req, res, next) => {
//         try {
//             if (!req.user || !req.user.roleID) {
//                 throw new ApiError(401, "Unauthorized");
//             }

//             // Fetch the role from DB by ObjectId
//             const role = await Role.findById(req.user.roleID);
//             if (!role) throw new ApiError(403, "Access denied!");

//             // Check if role name is allowed
//             if (!roleNames.includes(role.name)) {
//                 throw new ApiError(403, "Access denied!");
//             }

//             next();
//         } catch (err) {
//             next(err);
//         }
//     };
// };

// export { authorizeRoles };
