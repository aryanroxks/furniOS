// import Razorpay from "razorpay";
import { Payment } from "../models/payments.model.js";
import { Order } from "../models/orders.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import razorpay from "../utils/razorpay.js";
import crypto from "crypto";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

const createPayment = asyncHandler(async (req, res) => {
  const { orderId, method } = req.body;

  if (!orderId || !method) {
    throw new ApiError(400, "Order ID and payment method are required");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Payment allowed only when order is PLACED
  if (order.status !== "PLACED") {
    throw new ApiError(
      400,
      "Payment can only be initiated for placed orders"
    );
  }

  // COD FLOW
  if (method === "COD") {
    const payment = await Payment.create({
      orderID: order._id,
      amount: order.total,
      method: "COD",
      status: "PENDING",
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        { payment },
        "COD payment initiated"
      )
    );
  }

  // ONLINE PAYMENT FLOW
  // ONLINE PAYMENT FLOW (NO VERIFICATION)
  if (method === "ONLINE") {
    const razorpayOrder = await razorpay.orders.create({
      amount: order.total * 100,
      currency: "INR",
      receipt: `order_${order._id}`,
    });

    const payment = await Payment.create({
      orderID: order._id,
      amount: order.total,
      method: "ONLINE",
      status: "SUCCESS", // ✅ directly success
      razorpayOrderId: razorpayOrder.id,
    });

    // ✅ confirm order immediately
    order.status = "CONFIRMED";
    await order.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          razorpayOrderId: razorpayOrder.id,
          amount: order.total,
          paymentId: payment._id,
        },
        "Payment marked successful (verification removed)"
      )
    );
  }


  throw new ApiError(400, "Invalid payment method");
});




const verifyPayment = asyncHandler(async (req, res) => {
  const {
    paymentId,
    razorpay_order_id,
    razorpay_payment_id,
  } = req.body;

  if (!paymentId || !razorpay_order_id || !razorpay_payment_id) {
    throw new ApiError(400, "Incompfffflete payment data");
  }

  // 1️⃣ Fetch payment
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new ApiError(404, "Payment record not found");
  }

  // 2️⃣ Mark payment as SUCCESS (⚠️ BYPASS VERIFICATION)
  payment.status = "SUCCESS";
  payment.razorpayPaymentId = razorpay_payment_id;
  await payment.save();

  // 3️⃣ Confirm order
  const order = await Order.findById(payment.orderID);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  order.status = "CONFIRMED";
  await order.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { orderId: order._id },
      "Payment marked successful (verification bypassed)"
    )
  );
});

const markPaymentSuccess = asyncHandler(async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    throw new ApiError(400, "Payment ID required");
  }

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  // mark payment success
  payment.status = "SUCCESS";
  await payment.save();

  const order = await Order.findById(payment.orderID);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // mark order confirmed
  order.status = "CONFIRMED";
  await order.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { orderId: order._id },
      "Payment and order marked successful"
    )
  );
});



export {
  createPayment,
  verifyPayment,
  markPaymentSuccess

}