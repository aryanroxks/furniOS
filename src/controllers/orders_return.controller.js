import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/products.model.js";
import { Order } from "../models/orders.model.js";
import mongoose from "mongoose";
import { OrderReturnDetail } from "../models/orders_return_details.model.js";
import { OrderReturn } from "../models/orders_return.model.js";
import { roles } from "../constants.js"
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
    { $match: { userID: userId } },

    {
      $lookup: {
        from: "orderreturndetails",
        localField: "_id",
        foreignField: "orderReturnID",
        as: "items"
      }
    },

    { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "products",
        localField: "items.productID",
        foreignField: "_id",
        as: "product"
      }
    },

    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

    {
      $group: {
        _id: "$_id",
        orderID: { $first: "$orderID" },
        status: { $first: "$status" },
        refundAmount: { $first: "$refundAmount" },
        refundMode: { $first: "$refundMode" },
        requestedAt: { $first: "$requestedAt" },
        createdAt: { $first: "$createdAt" },

        items: {
          $push: {
            productID: "$items.productID",
            quantity: "$items.quantity",
            price: "$items.price",
            name: "$product.name",

            image: {
              $let: {
                vars: {
                  primary: {
                    $filter: {
                      input: "$product.images",
                      as: "img",
                      cond: { $eq: ["$$img.primaryImage", true] }
                    }
                  }
                },
                in: {
                  $cond: [
                    { $gt: [{ $size: "$$primary" }, 0] },
                    { $arrayElemAt: ["$$primary", 0] },
                    { $arrayElemAt: ["$product.images", 0] }
                  ]
                }
              }
            }
          }
        }
      }
    }
    ,

    { $sort: { createdAt: -1 } }
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, returns, "Returns with products fetched"));
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
  const userId = req.user._id;

  const returns = await OrderReturn.aggregate([
    {
      $match: { userID: new mongoose.Types.ObjectId(userId) }
    },

    {
      $lookup: {
        from: "orderreturndetails",
        localField: "_id",
        foreignField: "orderReturnID",
        as: "items"
      }
    },

    { $unwind: "$items" },

    {
      $lookup: {
        from: "products",
        localField: "items.productID",
        foreignField: "_id",
        as: "product"
      }
    },

    { $unwind: "$product" },

    {
      $group: {
        _id: "$_id",
        orderID: { $first: "$orderID" },
        status: { $first: "$status" },
        refundAmount: { $first: "$refundAmount" },
        refundMode: { $first: "$refundMode" },
        createdAt: { $first: "$createdAt" },

        items: {
          $push: {
            name: "$product.name",
            price: "$items.price",
            quantity: "$items.quantity"
          }
        }
      }
    },

    { $sort: { createdAt: -1 } }
  ]);

  return res.status(200).json(
    new ApiResponse(200, returns, "My returns fetched successfully")
  );
});




const adminGetAllReturns = asyncHandler(async (req, res) => {
  const { status } = req.query;
  console.log("ADMIN GET ALL RETURNS HIT", req.user._id, req.user.roleID);

  const matchStage = {};
  if (status) {
    matchStage.status = status;
  }

  const returns = await OrderReturn.aggregate([
    /* =====================
       Filter (optional)
    ===================== */
    { $match: matchStage },

    /* =====================
       Join return items
    ===================== */
    {
      $lookup: {
        from: "orderreturndetails",
        localField: "_id",
        foreignField: "orderReturnID",
        as: "items",
      },
    },

    /* =====================
       Join user
    ===================== */
    {
      $lookup: {
        from: "users",
        localField: "userID",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    /* =====================
       Compute aggregates
    ===================== */
    {
      $addFields: {
        totalItems: {
          $sum: "$items.quantity",
        },
        productCount: {
          $size: {
            $setUnion: ["$items.productID"],
          },
        },
      },
    },

    /* =====================
       Shape final response
    ===================== */
    {
      $project: {
        _id: 0,
        returnId: "$_id",
        orderId: "$orderID",
        status: 1,
        refundAmount: 1,
        refundMode: 1,
        requestedAt: 1,

        user: {
          id: "$user._id",
          name: "$user.fullname",
          email: "$user.email",
        },

        productCount: 1,
        totalItems: 1,
      },
    },

    /* =====================
       Sort latest first
    ===================== */
    { $sort: { requestedAt: -1 } },
  ]);

  return res.status(200).json(
    new ApiResponse(200, returns, "Admin returns list fetched successfully")
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

  orderReturn.status = "REJECTED";
  await orderReturn.save();

  return res.status(200).json(
    new ApiResponse(200, orderReturn, "Return cancelled successfully")
  );
});



const adminGetReturnDetails = asyncHandler(async (req, res) => {
  const { returnId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(returnId)) {
    throw new ApiError(400, "Invalid return ID");
  }

  const result = await OrderReturnDetail.aggregate([
    /* =====================
       Match return
    ===================== */
    {
      $match: {
        orderReturnID: new mongoose.Types.ObjectId(returnId),
      },
    },

    /* =====================
       Join OrderReturn (parent)
    ===================== */
    {
      $lookup: {
        from: "orderreturns",
        localField: "orderReturnID",
        foreignField: "_id",
        as: "return",
      },
    },
    { $unwind: "$return" },

    /* =====================
       Join Order
    ===================== */
    {
      $lookup: {
        from: "orders",
        localField: "return.orderID",
        foreignField: "_id",
        as: "order",
      },
    },
    { $unwind: "$order" },

    /* =====================
       Join User
    ===================== */
    {
      $lookup: {
        from: "users",
        localField: "return.userID",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    /* =====================
       Join Product
    ===================== */
    {
      $lookup: {
        from: "products",
        localField: "productID",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },

    /* =====================
       Shape fields
    ===================== */
    {
      $project: {
        _id: 0,

        return: {
          id: "$return._id",
          status: "$return.status",
          reason: "$return.reason",
          refundAmount: "$return.refundAmount",
          refundMode: "$return.refundMode",
          requestedAt: "$return.requestedAt",
          approvedAt: "$return.approvedAt",
          refundedAt: "$return.refundedAt",
        },

        order: {
          id: "$order._id",
          deliveredAt: "$order.deliveredAt",
        },

        user: {
          id: "$user._id",
          name: "$user.fullname",
          email: "$user.email",
        },

        item: {
          productId: "$product._id",
          name: "$product.name",
          image: {
            $let: {
              vars: {
                primary: {
                  $filter: {
                    input: "$product.images",
                    as: "img",
                    cond: { $eq: ["$$img.isPrimary", true] },
                  },
                },
              },
              in: {
                $cond: [
                  { $gt: [{ $size: "$$primary" }, 0] },
                  { $arrayElemAt: ["$$primary.url", 0] },
                  { $arrayElemAt: ["$product.images.url", 0] },
                ],
              },
            },
          },
          quantity: "$quantity",
          unitPrice: "$price",
          total: "$total",
        },
      },
    },

    /* =====================
       Group items
    ===================== */
    {
      $group: {
        _id: "$return.id",
        return: { $first: "$return" },
        order: { $first: "$order" },
        user: { $first: "$user" },
        items: { $push: "$item" },
      },
    },
  ]);

  if (!result.length) {
    throw new ApiError(404, "Return details not found");
  }

  return res.status(200).json(
    new ApiResponse(200, result[0], "Return details fetched successfully")
  );
});




export {
  createOrderReturn,
  getMyReturnsWithItems,
  getReturnsByOrder,
  updateReturnStatus,
  getReturnDetails,
  adminGetAllReturns,
  cancelReturnRequest,
  adminGetReturnDetails
  
}