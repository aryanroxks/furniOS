// import Razorpay from "razorpay";
import { Payment } from "../models/payments.model.js";
import { Order } from "../models/orders.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

 const createPayment = asyncHandler(async (req, res) => {
  const { orderId, method } = req.body;

  if (!orderId || !method) {
    throw new ApiError(400, "Order ID and payment method are required");
  }

  // 1️⃣ Fetch order
  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // 🚨 Payment allowed ONLY when order is PLACED
  if (order.status !== "PLACED") {
    throw new ApiError(
      400,
      "Payment can only be initiated for placed orders"
    );
  }

  // 2️⃣ COD FLOW
  if (method === "COD") {
    const payment = await Payment.create({
      orderID: order._id,
      amount: order.total,
      method: "COD",
      status: "PENDING",
    });

    // COD → confirm order immediately
    order.status = "CONFIRMED";
    await order.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        { payment, order },
        "Order placed successfully with COD"
      )
    );
  }

  // 3️⃣ ONLINE PAYMENT FLOW
  if (method === "ONLINE") {
    const razorpayOrder = await razorpay.orders.create({
      amount: order.totalAmount * 100,
      currency: "INR",
      receipt: `order_${order._id}`,
    });

    const payment = await Payment.create({
      orderID: order._id,
      amount: order.totalAmount,
      method: "ONLINE",
      status: "PENDING",
      razorpayOrderId: razorpayOrder.id,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          razorpayOrderId: razorpayOrder.id,
          amount: order.totalAmount,
          paymentId: payment._id,
        },
        "Razorpay order created"
      )
    );
  }

  throw new ApiError(400, "Invalid payment method");
});


export{
    createPayment
}