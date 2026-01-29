import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/products.model.js";
import { DeliveryPerson } from "../models/delivery_person.model.js";
import { Order } from "../models/orders.model.js";
import mongoose from "mongoose";
import { isValidObjectId } from "mongoose";
import { roles } from "../constants.js";
import { OrderDetail } from "../models/orders_details.model.js";



const createOrder = asyncHandler(async (req, res) => {

  const { items, deliveryAddress1, deliveryAddress2 } = req.body;

  if (!deliveryAddress1) {
    throw new ApiError(400, "Delivery address is compulsory");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Order must contain at least one item");
  }

  let subTotal = 0;
  const orderProducts = [];

  // 1️⃣ Validate & calculate
  for (const item of items) {
    if (!mongoose.Types.ObjectId.isValid(item.productID)) {
      throw new ApiError(400, "Invalid product ID");
    }

    const qty = Number(item.quantity);
    if (!qty || qty < 1 || qty > 5) {
      throw new ApiError(400, "Invalid quantity");
    }

    const product = await Product.findById(item.productID);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    if (qty > product.stock) {
      throw new ApiError(400, `${product.name} out of stock`);
    }

    subTotal += product.price * qty;

    orderProducts.push({
      product,
      quantity: qty
    });
  }

  // 2️⃣ Pricing
  const GST_RATE = 0.18;
  const CGST = subTotal * 0.09;
  const SGST = subTotal * 0.09;
  const shippingCharge = 500;
  const total = subTotal + CGST + SGST + shippingCharge;

  // 3️⃣ Create order
  const order = await Order.create({
    userID: req.user._id,
    products: orderProducts.map(item => ({
      productID: item.product._id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    })),
    CGST,
    SGST,
    shippingCharge,
    deliveryAddress1,
    deliveryAddress2,
    status: "PLACED",
    total
  });

  // 4️⃣ Create order_details
  for (const item of orderProducts) {
    await OrderDetail.create({
      orderID: order._id,
      productID: item.product._id,
      quantity: item.quantity,
      price: item.product.price
    });
  }

    return res
        .status(201)
        .json(new ApiResponse(201, order, "Order placed successfully!"));
});



// const orderStatus = asyncHandler(async (req, res) => {

//     const { orderId } = req.params;
//     const { newStatus } = req.body;

//     if (!newStatus) {
//         throw new ApiError(400, "New status is required");
//     }

//     if (!isValidObjectId(orderId)) {
//         throw new ApiError(400, "Invalid order id!");
//     }

//     const order = await Order.findById(orderId);

//     if (!order) {
//         throw new ApiError(404, "Order not found!");
//     }

//     const allowedTransitions = {
//         PLACED: ["CONFIRMED", "CANCELLED"],
//         CONFIRMED: ["SHIPPED", "CANCELLED"],
//         SHIPPED: ["OUT_FOR_DELIVERY"],
//         OUT_FOR_DELIVERY: ["DELIVERED"]
//     };

//     if (!allowedTransitions[order.status]?.includes(newStatus)) {
//         throw new ApiError(400, "Invalid order status transition");
//     }

//     // ✅ Deduct stock on CONFIRM
//     if (order.status === "PLACED" && newStatus === "CONFIRMED") {
//         for (const item of order.products) {
//             const product = await Product.findById(item.productID);

//             if (item.quantity > product.stock) {
//                 throw new ApiError(400, "Insufficient stock during confirmation");
//             }

//             await Product.findByIdAndUpdate(
//                 item.productID,
//                 { $inc: { stock: -item.quantity } }
//             );
//         }
//     }

//     // ✅ Restore stock on CANCEL (only if already deducted)
//     if (order.status === "CONFIRMED" && newStatus === "CANCELLED") {
//         for (const item of order.products) {
//             await Product.findByIdAndUpdate(
//                 item.productID,
//                 { $inc: { stock: item.quantity } }
//             );
//         }
//     }

//     order.status = newStatus;
//     const updatedOrder = await order.save();

//     return res
//         .status(200)
//         .json(new ApiResponse(200, updatedOrder, "Order status successfully changed!"));
// });

const orderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { newStatus } = req.body;

  if (!newStatus) {
    throw new ApiError(400, "New status is required");
  }

  if (!isValidObjectId(orderId)) {
    throw new ApiError(400, "Invalid order id!");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found!");
  }

  const allowedTransitions = {
    PLACED: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["OUT_FOR_DELIVERY"],
    OUT_FOR_DELIVERY: ["DELIVERED"]
  };

  if (!allowedTransitions[order.status]?.includes(newStatus)) {
    throw new ApiError(400, "Invalid order status transition");
  }

  // ✅ Deduct stock ONLY when shipping
  if (order.status === "CONFIRMED" && newStatus === "SHIPPED") {
    for (const item of order.products) {
      const product = await Product.findById(item.productID);

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      if (item.quantity > product.stock) {
        throw new ApiError(400, "Insufficient stock for shipping");
      }

      await Product.findByIdAndUpdate(
        item.productID,
        { $inc: { stock: -item.quantity } }
      );
    }
  }

   // ❌ NO stock restore logic needed
  // because cancellation is not allowed after shipping
  

  order.status = newStatus;
  const updatedOrder = await order.save();

  return res.status(200).json(
    new ApiResponse(200, updatedOrder, "Order status successfully changed!")
  );
});



const getOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    if (!isValidObjectId(orderId)) {
        throw new ApiError(400, "Invalid order id!");
    }

    const order = await Order.findById(orderId);

    if (!order) {
        throw new ApiError(404, "Order not found!");
    }

    const productsWithImages = [];

    for (const item of order.products) {
        const product = await Product.findById(item.productID).select("images");

        const primaryImage =
            product?.images?.find(img => img.isPrimary)?.url || null;

        productsWithImages.push({
            productID: item.productID,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            primaryImage
        });
    }

    const response = {
        ...order.toObject(),
        products: productsWithImages
    };

    return res
        .status(200)
        .json(new ApiResponse(200, response, "Order fetched successfully!"));
});



const getAllOrders = asyncHandler(async (req, res) => {

    const orders = await Order.find().sort({ createdAt: -1 });

    if (orders.length === 0) {
        throw new ApiError(404, "No orders found!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, orders, "Orders fetched successfully!"));
});

const getMyOrders = asyncHandler(async (req, res) => {

    const orders = await Order.find({ userID: req.user._id })
        .sort({ createdAt: -1 });

    if (orders.length === 0) {
        throw new ApiError(404, "No orders found!");
    }

    const enrichedOrders = [];

    for (const order of orders) {

        const enrichedProducts = [];

        for (const item of order.products) {

            const product = await Product
                .findById(item.productID)
                .select("images");

            const primaryImage =
                product?.images?.find(img => img.isPrimary)?.url || null;

            enrichedProducts.push({
                productID: item.productID,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                primaryImage
            });
        }

        enrichedOrders.push({
            _id: order._id,
            status: order.status,
            total: order.total,
            createdAt: order.createdAt,
            products: enrichedProducts
        });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, enrichedOrders, "My orders fetched successfully!"));
});




const assignOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { deliveryPersonId } = req.body;

    if (
        !mongoose.Types.ObjectId.isValid(orderId) ||
        !mongoose.Types.ObjectId.isValid(deliveryPersonId)
    ) {
        throw new ApiError(400, "Invalid orderId or deliveryPersonId!");
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, "Order not found!");
    }

    if (order.status !== "SHIPPED") {
        throw new ApiError(
            400,
            "Delivery person can be assigned only after order is SHIPPED!"
        );
    }

    const deliveryPerson = await DeliveryPerson.findById(deliveryPersonId);
    if (!deliveryPerson || !deliveryPerson.isActive) {
        throw new ApiError(404, "Delivery person not found or inactive!");
    }

    if (deliveryPerson.status !== "AVAILABLE") {
        throw new ApiError(400, "Delivery person is not available!");
    }

    order.deliveryPersonID = deliveryPerson._id;
    order.status = "OUT_FOR_DELIVERY";

    deliveryPerson.status = "ON_DELIVERY";

    await order.save();
    await deliveryPerson.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                orderId: order._id,
                deliveryPersonId: deliveryPerson._id,
                orderStatus: order.status,
                deliveryPersonStatus: deliveryPerson.status
            },
            "Delivery person assigned successfully"
        )
    );
});


const markOrderDelivered = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new ApiError(400, "Invalid order ID");
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    if (order.status !== "OUT_FOR_DELIVERY") {
        throw new ApiError(
            400,
            "Order must be OUT_FOR_DELIVERY to mark as delivered"
        );
    }

    if (!order.deliveryPersonID) {
        throw new ApiError(
            400,
            "No delivery person assigned to this order"
        );
    }

    const deliveryPerson = await DeliveryPerson.findById(order.deliveryPersonID);
    if (!deliveryPerson) {
        throw new ApiError(404, "Delivery person not found");
    }

    order.status = "DELIVERED";
    deliveryPerson.status = "AVAILABLE";

    await order.save();
    await deliveryPerson.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                orderId: order._id,
                orderStatus: order.status,
                deliveryPersonId: deliveryPerson._id,
                deliveryPersonStatus: deliveryPerson.status
            },
            "Order marked as delivered successfully"
        )
    );
});


const getFilteredOrders = asyncHandler(async(req,res)  => {

    const {
        status,
        deliveryAssigned,
        page=1,
        limit=10
    } = req.query

    const filter = {};

    if(status){
        filter.status = status
    }

    if(deliveryAssigned === "true"){
        filter.deliveryPersonID = {$ne:null}
    }

    if(deliveryAssigned==="false"){
        filter.deliveryPersonID=null
    }

    const skip = (Number(page)-1) * Number(limit);

    const orders = await Order.find(filter)
    .sort( {createdAt:-1} )
    .skip(skip)
    .limit(Number(limit));

    const totalOrders = await Order.countDocuments(filter);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                total: totalOrders,
                page: Number(page),
                limit: Number(limit),
                orders
            },
            "Orders fetched successfully"
        )
    );

})



const reassignOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { newDeliveryPersonId } = req.body;

    if (
        !mongoose.Types.ObjectId.isValid(orderId) ||
        !mongoose.Types.ObjectId.isValid(newDeliveryPersonId)
    ) {
        throw new ApiError(400, "Invalid orderId or deliveryPersonId");
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    if (!["SHIPPED", "OUT_FOR_DELIVERY"].includes(order.status)) {
        throw new ApiError(
            400,
            "Order cannot be reassigned at this stage"
        );
    }

    if (!order.deliveryPersonID) {
        throw new ApiError(
            400,
            "Order has no delivery person to reassign"
        );
    }

    const oldDeliveryPerson = await DeliveryPerson.findById(order.deliveryPersonID);
    const newDeliveryPerson = await DeliveryPerson.findById(newDeliveryPersonId);

    if (!newDeliveryPerson || !newDeliveryPerson.isActive) {
        throw new ApiError(404, "New delivery person not found or inactive");
    }

    if (newDeliveryPerson.status !== "AVAILABLE") {
        throw new ApiError(400, "New delivery person is not available");
    }

    if (oldDeliveryPerson) {
        oldDeliveryPerson.status = "AVAILABLE";
        await oldDeliveryPerson.save();
    }

    order.deliveryPersonID = newDeliveryPerson._id;
    order.status = "OUT_FOR_DELIVERY";

    newDeliveryPerson.status = "ON_DELIVERY";

    await order.save();
    await newDeliveryPerson.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                orderId: order._id,
                oldDeliveryPersonId: oldDeliveryPerson?._id,
                newDeliveryPersonId: newDeliveryPerson._id,
                orderStatus: order.status
            },
            "Delivery person reassigned successfully"
        )
    );
});



const cancelOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new ApiError(400, "Invalid order ID");
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    // 🔐 Authorization check (user can cancel only own order)
    if (req.user?.roleID.toString() !== roles.admin) {
        if (order.userID.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You are not allowed to cancel this order");
        }
    }

    // ❌ Invalid cancellation states
    if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) {
        throw new ApiError(400, "Order cannot be cancelled at this stage");
    }

    // 🔄 Restore stock ONLY if already deducted
    if (order.status === "CONFIRMED") {
        for (const item of order.products) {
            await Product.findByIdAndUpdate(
                item.productID,
                { $inc: { stock: item.quantity } }
            );
        }
    }

    // ✅ Cancel order
    order.status = "CANCELLED";
    await order.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                orderId: order._id,
                status: order.status
            },
            "Order cancelled successfully"
        )
    );
});



export {
    createOrder,
    orderStatus,
    getOrder,
    getAllOrders,
    getMyOrders,
    // updateOrder,
    assignOrder,
    markOrderDelivered,
    getFilteredOrders,
     reassignOrder,
    cancelOrder,
    // returnOrder
}