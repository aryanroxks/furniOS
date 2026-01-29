import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/products.model.js";
import { Order } from "../models/orders.model.js";
import mongoose from "mongoose";
import { OrderReturnDetail } from "../models/orders_return_details.model.js";
import { OrderReturn } from "../models/orders_return.model.js";
import {roles} from "../constants.js"
import { Payment } from "../models/payments.model.js";



const createOrderReturn = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { items, reason } = req.body;
  const userId = req.user._id;

  if (!items || !items.length) {
    throw new ApiError(400, "Return items are required");
  }

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  if (order.userID.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  if (order.status !== "DELIVERED") {
    throw new ApiError(400, "Order not delivered yet");
  }

  // ⏱️ Return window check
  const diffInDays =
    (Date.now() - order.deliveredAt) / (1000 * 60 * 60 * 24);

  if (diffInDays > 7) {
    throw new ApiError(400, "Return window expired");
  }

const payment = await Payment.findOne({
  orderID: order._id,
  status: "SUCCESS"
});

if (!payment) {
  throw new ApiError(400, "Payment record not found");
}

let refundMethod = "ORIGINAL";

if (payment.paymentMethod === "COD") {
  refundMethod = "WALLET";
}



  let refundAmount = 0;
  const returnItemsData = [];

  for (const item of items) {


    const orderProduct = order.products.find(
      p => p.productID.toString() === item.productID
    );

    if (!orderProduct) {
      throw new ApiError(400, "Product not found in order");
    }

    // 🔁 Calculate already returned quantity
    const previousReturns = await OrderReturnDetail.aggregate([
      {
        $lookup: {
          from: "orderreturns",
          localField: "orderReturnID",
          foreignField: "_id",
          as: "return"
        }
      },
      { $unwind: "$return" },
      {
        $match: {
          "return.orderID": order._id,
          productID: orderProduct.productID
        }
      },
      {
        $group: {
          _id: "$productID",
          totalReturned: { $sum: "$quantity" }
        }
      }
    ]);

    const alreadyReturned = previousReturns[0]?.totalReturned || 0;
    const remainingQty = orderProduct.quantity - alreadyReturned;

    if (item.quantity > remainingQty) {
      throw new ApiError(400, "Return quantity exceeds purchased quantity");
    }

    const total = orderProduct.price * item.quantity;
    refundAmount += total;

    returnItemsData.push({
      productID: orderProduct.productID,
      quantity: item.quantity,
      price: orderProduct.price,
      total
    });


  }

  // 🧾 Create parent return
  const orderReturn = await OrderReturn.create({
    orderID: order._id,
    userID: userId,
    reason,
    refundMethod,
    refundAmount,
    status: "REQUESTED"
  });

  // 🧾 Create return items
  const returnItems = returnItemsData.map(item => ({
    ...item,
    orderReturnID: orderReturn._id
  }));

  await OrderReturnDetail.insertMany(returnItems);

  return res.status(201).json(
    new ApiResponse(201, orderReturn, "Return request created")
  );
});



const getMyReturnsWithItems = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const returns = await OrderReturn.aggregate([
    {
      $match: { userID: userId }
    },
    {
      $lookup: {
        from: "orderreturndetails",
        localField: "_id",
        foreignField: "orderReturnID",
        as: "items"
      }
    },
    {
      $sort: { createdAt: -1 }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(200, returns, "Returns with items fetched")
  );
});



const getReturnsByOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const returns = await OrderReturn.find({ orderID: orderId });

  return res.status(200).json(
    new ApiResponse(200, returns, "Order returns fetched")
  );
});


const updateReturnStatus = asyncHandler(async (req, res) => {
  const { returnId } = req.params;
  const { status } = req.body;

  const allowedStatuses = [
    "APPROVED",
    "REJECTED",
    "PICKED_UP",
    "RECEIVED",
    "REFUNDED"
  ];

  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, "Invalid return status");
  }

  const orderReturn = await OrderReturn.findById(returnId);
  if (!orderReturn) {
    throw new ApiError(404, "Return request not found");
  }

  if (status === "RECEIVED") {
  const items = await OrderReturnDetail.find({
    orderReturnID: orderReturn._id
  });

  for (const item of items) {
    await Product.findByIdAndUpdate(
      item.productID,
      { $inc: { stock: item.quantity } }
    );
  }
}

  orderReturn.status = status;

  if (status === "REFUNDED") {
    orderReturn.refundedAt = new Date();
  }

  await orderReturn.save();

  return res.status(200).json(
    new ApiResponse(200, orderReturn, "Return status updated")
  );
});


const getReturnDetails = asyncHandler(async (req, res) => {

  const { returnId } = req.params;
  const userId = req.user._id;

  const result = await OrderReturn.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(returnId) }
    },
    {
      $lookup: {
        from: "orderreturndetails",
        localField: "_id",
        foreignField: "orderReturnID",
        as: "items"
      }
    }
  ]);

  if (!result.length) {
    throw new ApiError(404, "Return not found");
  }

  const orderReturn = result[0];

  // 🔐 user can see only own return (admin handled via middleware)
  if (
    orderReturn.userID.toString() !== userId.toString() &&
    req.user.roleID.toString() !== roles.admin
  ) {
    throw new ApiError(403, "Unauthorized!");
  }

  return res.status(200).json(
    new ApiResponse(200, orderReturn, "Return details fetched")
  );
});


const adminGetAllReturns = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const matchStage = {};
  if (status) {
    matchStage.status = status;
  }

  const returns = await OrderReturn.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: "orderreturndetails",
        localField: "_id",
        foreignField: "orderReturnID",
        as: "items"
      }
    },
    {
      $sort: { createdAt: -1 }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(200, returns, "All returns fetched")
  );
});



 const cancelReturnRequest = asyncHandler(async (req, res) => {
  const { returnId } = req.params;
  const userId = req.user._id;

  const orderReturn = await OrderReturn.findById(returnId);

  if (!orderReturn) {
    throw new ApiError(404, "Return not found");
  }

  if (orderReturn.userID.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  if (orderReturn.status !== "REQUESTED") {
    throw new ApiError(
      400,
      "Return cannot be cancelled after approval"
    );
  }

  orderReturn.status = "CANCELLED";
  await orderReturn.save();

  return res.status(200).json(
    new ApiResponse(200, orderReturn, "Return cancelled successfully")
  );
});



export {
    createOrderReturn,
    getMyReturnsWithItems,
    getReturnsByOrder,
    updateReturnStatus,
    getReturnDetails,
    adminGetAllReturns,
    cancelReturnRequest
    

}