import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/products.model.js";
import { DeliveryPerson } from "../models/delivery_person.model.js";
import { Order } from "../models/orders.model.js";
import mongoose, { now } from "mongoose";
import { isValidObjectId } from "mongoose";
import { roles } from "../constants.js";
import { OrderDetail } from "../models/orders_details.model.js";
import PDFDocument from "pdfkit";
import { WholesaleQuotation } from "../models/quotation_master.model.js";
import { WholesaleQuotationItem } from "../models/quotation_items.model.js";
import { sendNotification } from "../utils/sendNotification.js";

// const createOrder = asyncHandler(async (req, res) => {

//     const { items, deliveryAddress1, deliveryAddress2 } = req.body;

//     if (!deliveryAddress1) {
//         throw new ApiError(400, "Delivery address is compulsory");
//     }

//     if (!Array.isArray(items) || items.length === 0) {
//         throw new ApiError(400, "Order must contain at least one item");
//     }

//     let subTotal = 0;
//     const orderProducts = [];

//     // 1️⃣ Validate & calculate
//     for (const item of items) {
//         if (!mongoose.Types.ObjectId.isValid(item.productID)) {
//             throw new ApiError(400, "Invalid product ID");
//         }

//         const qty = Number(item.quantity);
//         if (!qty || qty < 1 || qty > 5) {
//             throw new ApiError(400, "Invalid quantity");
//         }

//         const product = await Product.findById(item.productID);
//         if (!product) {
//             throw new ApiError(404, "Product not found");
//         }

//         if (qty > product.stock) {
//             throw new ApiError(400, `${product.name} out of stock`);
//         }

//         subTotal += product.price * qty;

//         orderProducts.push({
//             product,
//             quantity: qty
//         });
//     }

//     // 2️⃣ Pricing
//     const GST_RATE = 0.18;
//     const CGST = subTotal * 0.09;
//     const SGST = subTotal * 0.09;
//     const shippingCharge = 500;
//     const total = subTotal + CGST + SGST + shippingCharge;

//     // 3️⃣ Create order
//     const order = await Order.create({
//         userID: req.user._id,
//         products: orderProducts.map(item => ({
//             productID: item.product._id,
//             name: item.product.name,
//             quantity: item.quantity,
//             price: item.product.price
//         })),
//         CGST,
//         SGST,
//         shippingCharge,
//         deliveryAddress1,
//         deliveryAddress2,
//         status: "PLACED",
//         total
//     });

//     // 4️⃣ Create order_details
//     for (const item of orderProducts) {
//         await OrderDetail.create({
//             orderID: order._id,
//             productID: item.product._id,
//             quantity: item.quantity,
//             price: item.product.price
//         });
//     }

//     return res
//         .status(201)
//         .json(new ApiResponse(201, order, "Order placed successfully!"));
// });


import { applyBestOffer } from "../utils/applyBestOffer.js";
import { Payment } from "../models/payments.model.js";

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

        const { finalPrice, appliedOffer } = await applyBestOffer(product);

        subTotal += finalPrice * qty;

        orderProducts.push({
            productID: product._id,
            name: product.name,
            quantity: qty,
            price: product.price,
            finalUnitPrice: finalPrice,
            appliedOfferSnapshot: appliedOffer,
        });
    }

    const CGST = subTotal * 0.09;
    const SGST = subTotal * 0.09;
    const shippingCharge = 500;
    const total = subTotal + CGST + SGST + shippingCharge;

    const order = await Order.create({
        userID: req.user._id,
        products: orderProducts,
        CGST,
        SGST,
        shippingCharge,
        deliveryAddress1,
        deliveryAddress2,
        total,
    });

    /* OPTIONAL: OrderDetail (keep in sync) */
    for (const item of orderProducts) {
        await OrderDetail.create({
            orderID: order._id,
            productID: item.productID,
            quantity: item.quantity,
            price: item.price,
            finalUnitPrice: item.finalUnitPrice,
            appliedOfferSnapshot: item.appliedOfferSnapshot
        });
    }

    try {
        await sendNotification({
            targetType: "single",
            userID: req.user._id,
            type: "order",
            title: "Order Placed",
            message: `Your order has been placed successfully`
        });
    } catch (err) {
        console.error("Order notification failed:", err.message);
    }

    return res
        .status(201)
        .json(new ApiResponse(201, order, "Order placed successfully!"));
});


export const createWholesaleOrder = asyncHandler(async (req, res) => {
    const { quotationID, deliveryAddress1, deliveryAddress2 } = req.body;
    const userID = req.user._id;
    console.log("HIT")

    if (!mongoose.Types.ObjectId.isValid(quotationID)) {
        throw new ApiError(400, "Invalid quotation ID");
    }

    const quotation = await WholesaleQuotation.findById(quotationID);
    if (!quotation) {
        throw new ApiError(404, "Quotation not found");
    }

    if (quotation.userID.toString() !== userID.toString()) {
        throw new ApiError(403, "Not allowed");
    }

    /* ✅ FIXED STATUS CHECK */
    if (quotation.status !== "APPROVED") {
        throw new ApiError(
            400,
            "Quotation must be approved before checkout"
        );
    }

    const items = await WholesaleQuotationItem
        .find({ quotationID })
        .populate("productID", "name price stock");

    let subTotal = 0;
    const orderProducts = [];

    for (const item of items) {
        if (!item.finalPrice || item.finalPrice <= 0) {
            throw new ApiError(
                400,
                "Final price not frozen for one or more items"
            );
        }

        if (item.quantity > item.productID.stock) {
            throw new ApiError(
                400,
                `${item.productID.name} out of stock`
            );
        }

        const lineTotal = item.finalPrice * item.quantity;
        subTotal += lineTotal;

        orderProducts.push({
            productID: item.productID._id,
            name: item.productID.name,
            quantity: item.quantity,
            price: item.productID.price,
            finalUnitPrice: item.finalPrice,
            appliedOfferSnapshot: {
                title: "Wholesale Quotation",
                discountType: "NEGOTIATED",
                discountValue:
                    item.productID.price - item.finalPrice,
            },
        });
    }

    const CGST = subTotal * 0.09;
    const SGST = subTotal * 0.09;
    const shippingCharge = 0;
    const total = subTotal + CGST + SGST;

    const order = await Order.create({
        userID,
        products: orderProducts,
        CGST,
        SGST,
        shippingCharge,
        deliveryAddress1,
        deliveryAddress2,
        total,
        orderType: "WHOLESALE",
        quotationID,
        status: "PLACED",
    });

    quotation.status = "ORDER_CREATED";
    await quotation.save();

    /* ================= CREATE ORDER DETAILS ================= */
    for (const item of orderProducts) {
        await OrderDetail.create({
            orderID: order._id,
            productID: item.productID,
            quantity: item.quantity,
            price: item.price,
            finalUnitPrice: item.finalUnitPrice,
            appliedOfferSnapshot: item.appliedOfferSnapshot,
        });
    }


    try {
        await sendNotification({
            targetType: "single",
            userID,
            type: "order",
            title: "Wholesale Order Placed",
            message: "Your wholesale order has been placed successfully"
        });
    } catch (err) {
        console.error("Wholesale user notification failed:", err.message);
    }

    // 🔔 NOTIFICATION — Admin
    try {
        await sendNotification({
            targetType: "role",
            roleID: roles.admin, // assuming admin role is used in admin dashboard
            type: "order",
            title: "New Wholesale Order",
            message: "A new wholesale order has been placed"
        });
    } catch (err) {
        console.error("Admin order notification failed:", err.message);
    }



    return res.status(201).json(
        new ApiResponse(
            201,
            order,
            "Wholesale order placed successfully"
        )
    );
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
    // if (order.status === "CONFIRMED" && newStatus === "SHIPPED") {
    //     for (const item of order.products) {
    //         const product = await Product.findById(item.productID);

    //         if (!product) {
    //             throw new ApiError(404, "Product not found");
    //         }

    //         if (item.quantity > product.stock) {
    //             throw new ApiError(400, "Insufficient stock for shipping");
    //         }

    //         await Product.findByIdAndUpdate(
    //             item.productID,
    //             { $inc: { stock: -item.quantity } }
    //         );
    //     }
    // }

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

            // Deduct stock
            await Product.findByIdAndUpdate(
                item.productID,
                { $inc: { stock: -item.quantity } }
            );

            // Re-fetch updated product
            const updatedProduct = await Product.findById(item.productID);

            // 🔔 LOW STOCK ALERT (Admin)
            if (updatedProduct.stock <= 5) {
                try {
                    await sendNotification({
                        targetType: "role",
                        roleID: roles.admin,
                        type: "stock",
                        title: "Low Stock Alert",
                        message: `${updatedProduct.name} stock is low (${updatedProduct.stock} left)`
                    });
                } catch (err) {
                    console.error("Stock notification failed:", err.message);
                }
            }
        }
    }




    // ❌ NO stock restore logic needed
    // because cancellation is not allowed after shipping


    order.status = newStatus;

    if (newStatus === "DELIVERED" && !order.deliveredAt) {
        order.deliveredAt = new Date();
    }

    const updatedOrder = await order.save();

    try {
        let title = "Order Update";
        let message = "";

        switch (newStatus) {
            case "CONFIRMED":
                message = "Your order has been confirmed.";
                break;

            case "SHIPPED":
                message = "Your order has been shipped.";
                break;

            case "OUT_FOR_DELIVERY":
                message = "Your order is out for delivery.";
                break;

            case "DELIVERED":
                message = "Your order has been delivered successfully.";
                break;

            case "CANCELLED":
                message = "Your order has been cancelled.";
                break;
        }

        // Only send if message is set (extra safety)
        if (message) {
            await sendNotification({
                targetType: "single",
                userID: order.userID,
                type: "order",
                title,
                message
            });
        }
    } catch (err) {
        console.error("Order status notification failed:", err.message);
    }


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
            price: item.finalUnitPrice,
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

    const orders = await Order.find().sort({ createdAt: -1 })
        .populate("userID", "username");

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
                price: item.finalUnitPrice,
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
    order.deliveredAt = new Date()
    deliveryPerson.status = "AVAILABLE";

    const payment = await Payment.findOne({ orderID: order._id })
    if (payment.method === "COD") {
        payment.status = "SUCCESS"
    }
    await payment.save();


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


const getFilteredOrders = asyncHandler(async (req, res) => {

    const {
        status,
        deliveryAssigned,
        page = 1,
        limit = 10
    } = req.query

    const filter = {};

    if (status) {
        filter.status = status
    }

    if (deliveryAssigned === "true") {
        filter.deliveryPersonID = { $ne: null }
    }

    if (deliveryAssigned === "false") {
        filter.deliveryPersonID = null
    }

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)).populate("userID", "fullname");

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

import { generateReportPDF } from "../utils/reportPdfGenerator.js";

export const downloadFilteredOrdersPDF = asyncHandler(async (req, res) => {
  const { status, deliveryAssigned } = req.query;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (deliveryAssigned === "true") {
    filter.deliveryPersonID = { $ne: null };
  }

  if (deliveryAssigned === "false") {
    filter.deliveryPersonID = null;
  }

  // 🔥 NO pagination here
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .populate("userID", "fullname")
    .lean();

  const rows = orders.map((o) => ({
    orderId: o._id.toString().slice(-6),
    customer: o.userID?.fullname || "Customer",
    status: o.status,
    total: o.total,
    delivery: o.deliveryPersonID ? "Assigned" : "Not Assigned",
    createdAt: new Date(o.createdAt).toLocaleDateString(),
  }));

  return generateReportPDF({
    res,
    title: "Orders Report",
    subtitle: "Filtered orders report",
    columns: [
      { label: "Order", key: "orderId", width: 80 },
      { label: "Customer", key: "customer", width: 150 },
      { label: "Total", key: "total", width: 80 },
      { label: "Delivery", key: "delivery", width: 100 },
      { label: "Status", key: "status", width: 100 },
      { label: "Date", key: "createdAt", width: 100 },
    ],
    rows,
  });
});




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


const formatINR = (amount) => `₹ ${amount.toLocaleString("en-IN")}`;

const drawLine = (doc) => {
    doc
        .strokeColor("#cccccc")
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown();
};

/* =======================
   CONTROLLER
======================= */
const generateOrderInvoice = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    if (!isValidObjectId(orderId)) {
        throw new ApiError(400, "Invalid order ID");
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    /* =======================
       DERIVED VALUES
    ======================= */
    const subtotal = order.products.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const invoiceNo = `INV-${new Date(order.orderedAt).getFullYear()}-${order._id
        .toString()
        .slice(-6)}`;

    /* =======================
       PDF SETUP
    ======================= */
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=${invoiceNo}.pdf`
    );

    doc.pipe(res);

    /* =======================
       COMPANY HEADER
    ======================= */
    doc
        .fontSize(22)
        .text("FurniOS Pvt. Ltd.", { align: "center" });

    doc
        .fontSize(10)
        .text("GSTIN: 24ABCDE1234F1Z5", { align: "center" });

    doc.moveDown();
    drawLine(doc);

    /* =======================
       INVOICE META
    ======================= */
    doc.fontSize(11);

    doc.text(`Invoice No: ${invoiceNo}`, 50);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString("en-IN")}`, 350);

    doc.text(`Order ID: ${order._id}`, 50);
    doc.text(
        `Order Date: ${new Date(order.orderedAt).toLocaleDateString("en-IN")}`,
        350
    );

    doc.text(`Order Status: ${order.status}`, 50);

    doc.moveDown();
    drawLine(doc);

    /* =======================
       ADDRESS
    ======================= */
    doc
        .fontSize(12)
        .text("Billing / Shipping Address", { underline: true })
        .moveDown(0.5);

    doc.fontSize(11).text(order.deliveryAddress1);

    if (order.deliveryAddress2) {
        doc.text(order.deliveryAddress2);
    }

    doc.moveDown();
    drawLine(doc);

    /* =======================
       ITEMS TABLE
    ======================= */
    doc.fontSize(12).text("Invoice Items");
    doc.moveDown(0.5);

    doc.fontSize(10);
    drawLine(doc);

    doc.text("Item", 50);
    doc.text("Qty", 300);
    doc.text("Unit Price", 360);
    doc.text("Total", 460);

    doc.moveDown();
    drawLine(doc);

    order.products.forEach((item) => {
        const lineTotal = item.price * item.quantity;

        doc.text(item.name, 50, doc.y, { width: 220 });
        doc.text(item.quantity.toString(), 300);
        doc.text(formatINR(item.price), 360);
        doc.text(formatINR(lineTotal), 460);

        doc.moveDown();
    });

    drawLine(doc);

    /* =======================
       SUMMARY
    ======================= */
    doc.moveDown();
    doc.fontSize(11);

    doc.text(`Subtotal: ${formatINR(subtotal)}`, { align: "right" });
    doc.text(`CGST (9%): ${formatINR(order.CGST)}`, { align: "right" });
    doc.text(`SGST (9%): ${formatINR(order.SGST)}`, { align: "right" });
    doc.text(
        `Shipping: ${formatINR(order.shippingCharge)}`,
        { align: "right" }
    );

    drawLine(doc);

    doc
        .fontSize(13)
        .text(`GRAND TOTAL: ${formatINR(order.total)}`, {
            align: "right",
        });

    /* =======================
       FOOTER
    ======================= */
    doc.moveDown(2);

    doc
        .fontSize(9)
        .fillColor("gray")
        .text(
            "This is a system-generated invoice and does not require a signature.",
            { align: "center" }
        )
        .fillColor("black");

    if (order.status === "CANCELLED") {
        doc
            .moveDown()
            .fontSize(10)
            .fillColor("red")
            .text("⚠ This order has been cancelled.", { align: "center" })
            .fillColor("black");
    }

    doc.end();
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
    generateOrderInvoice
    // returnOrder
}