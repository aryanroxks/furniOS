import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import { Role } from "../models/role.model.js"
import otpStore from "../utils/otpStore.js"
import { sendEmailOTP } from "../utils/nodemailer.js"


const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


const registerRetailUser = asyncHandler(async (req, res) => {
    await registerUser(req, res, "retail_customer");
});

const registerWholesaleUser = asyncHandler(async (req, res) => {
    await registerUser(req, res, "wholesale_customer");
});

const registerDeliveryPerson = asyncHandler(async (req, res) => {
    await registerUser(req, res, "delivery_person");
});



const registerUser = async (req, res, roleName) => {

    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { username, email, fullname, password, phone, gender, address, pincode, state, city, street, gstNumber } = req.body

    if (
        [username, email, fullname, password, phone, gender, address, pincode, state, city, street].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne(
        {
            $or: [{ username }, { email }, { phone }]
        }
    )

    if (existedUser) {
        throw new ApiError(409, "User with username,email or phone number already exists!")
    }

    //find role id
    // const roleName=req.roleName
    const existedRole = await Role.findOne(
        {
            name: roleName
        }
    )

    if (!existedRole) {
        throw new ApiError(404, "Invalid role!")
    }

    if (roleName === "wholesale_customer" && !gstNumber) {
        throw new ApiError(400, "GST number is required for wholesale users")
    }

    const user = await User.create({
        username,
        email,
        fullname,
        password,
        phone,
        gender,
        address,
        street,
        city,
        state,
        pincode,
        roleID: existedRole._id,
        gstNumber: gstNumber ?? null
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(400, "User could not be registered!")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, createdUser, "User registered successfully!"))
}


const logInUser = asyncHandler(async (req, res) => {

    const { username, phone, email, password } = req.body
    if (!username && !email && !phone) {
        throw new ApiError(400, "Username, phone or email required!")
    }

    const user = await User.findOne({
        $or: [{ username }, { phone }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exists!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully!"
            )
        )

})


const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user_id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully!"))

})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    //take old and new passwords
    //find user
    //if old match with stored -> store new password

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid old password!")
    }

    user.password = newPassword

    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully!"))
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully!"
        ))
})

const getAllUsers = asyncHandler(async (req, res) => {
    const { search, role } = req.query;

    let filter = {};

    // 🔍 Search by username or email
    if (search) {
        filter.$or = [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    // 🎭 Filter by role
    if (role) {
        filter.roleID = role;
    }

    const users = await User.find(filter);

    return res
        .status(200)
        .json(new ApiResponse(200, users, "Users fetched successfully"));
});

const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await User.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "User deleted successfully"));
});


// const updateAccountDetails = asyncHandler(async (req, res) => {
//     const { email, fullname, phone, gender, address, pincode, state, city, street } = req.body

//     if (!fullname || !email || !phone || !gender || !address || !pincode || !state || !city || !street) {
//         throw new ApiError(400, "All fields are required")
//     }

//     const user = await User.findByIdAndUpdate(
//         req.user?._id,
//         {
//             $set: {
//                 email,
//                 fullname,
//                 phone,
//                 gender,
//                 address,
//                 pincode,
//                 street,
//                 city,
//                 state
//             }
//         },
//         {
//             new:true
//         }
//     ).select("-password")

//     return res
//         .status(200)
//         .json(new ApiResponse(200, user, "Account details updated successfully!"))

// })



const updateProfileRequest = asyncHandler(async (req, res) => {
    const {
        email,
        phone,
        fullname,
        gender,
        address,
        pincode,
        state,
        city,
        street
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, "User not found");

    let otpRequired = false;

    // 🔹 EMAIL PRE-CHECK
    if (email && email !== user.email) {
        const emailExists = await User.findOne({ email });

        if (emailExists) {
            throw new ApiError(409, "Email already exists");
        }

        // 🔹 OTP LOGIC
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        otpStore.set(req.user._id.toString(), {
            otp,
            newEmail: email,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        await sendEmailOTP(email, otp);
        otpRequired = true;
    }

    // 🔹 Update other fields
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            fullname,
            phone,
            gender,
            address,
            pincode,
            street,
            city,
            state
        }
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            { otpRequired },
            otpRequired
                ? "OTP sent to email"
                : "Profile updated successfully"
        )
    );
});



const verifyEmailOTP = asyncHandler(async (req, res) => {
    const { otp } = req.body

    const stored = otpStore.get(req.user._id.toString())

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(req.user._id.toString())
        throw new ApiError(400, "OTP expired")
    }

    if (!stored) {
        throw new ApiError(400, "No email verification pending")
    }

    if (stored.otp !== otp) {
        throw new ApiError(400, "Invalid OTP")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { email: stored.newEmail },
        { new: true }
    ).select("-password")

    otpStore.delete(req.user._id.toString())

    return res.status(200).json(
        new ApiResponse(200, user, "Email updated successfully")
    )
})


const forgotPasswordRequest = asyncHandler(async (req, res) => {
    const { email } = req.body

    if (!email) {
        throw new ApiError(400, "Email is required")
    }

    const user = await User.findOne({ email })

    if (!user) {
        throw new ApiError(404, "User not found with this email")
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();


    otpStore.set(`forgot_${email}`, {
        otp,
        userId: user._id,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 min
    })

    await sendEmailOTP(email, otp)

    return res.status(200).json(
        new ApiResponse(200, {}, "OTP sent to email")
    )
})


const verifyForgotPasswordOTP = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body

    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "All fields are required")
    }

    const stored = otpStore.get(`forgot_${email}`)

    if (!stored) {
        throw new ApiError(400, "OTP expired or invalid")
    }

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(`forgot_${email}`)
        throw new ApiError(400, "OTP expired")
    }

    if (stored.otp !== otp.toString()) {
        throw new ApiError(400, "Invalid OTP")
    }

    const user = await User.findById(stored.userId)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    // 🔥 THIS triggers pre("save")
    user.password = newPassword
    await user.save()

    otpStore.delete(`forgot_${email}`)

    return res.status(200).json(
        new ApiResponse(200, null, "Password reset successfully")
    )
})



export {
    registerRetailUser,
    registerUser,
    registerWholesaleUser,
    logInUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    // updateAccountDetails,
    registerDeliveryPerson,
    verifyEmailOTP,
    updateProfileRequest,
    forgotPasswordRequest,
    verifyForgotPasswordOTP,
    getAllUsers,
    deleteUser,
    getUserById
}

