import { Order } from "../models/orders.model.js";
import { Product } from "../models/products.model.js";
import { REPORT_TYPES } from "../utils/reportTypes.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateReportPDF } from "../utils/reportPdfGenerator.js";
import Production from "../models/production.model.js";
import { Purchase } from "../models/purchase.model.js";
import { OrderReturn } from "../models/orders_return.model.js";
import { WholesaleQuotation } from "../models/quotation_master.model.js";
import { Payment } from "../models/payments.model.js";
/* =======================
   MAIN REPORT GENERATOR
======================= */

export const generateReport = asyncHandler(async (req, res) => {
  const { reportType, dateFrom, dateTo, status } = req.body;

  let data;

  switch (reportType) {
    case REPORT_TYPES.ORDER:
      data = await generateOrderReport({ from: dateFrom, to: dateTo, status });  // ✅ Pass as object
      break;

    case REPORT_TYPES.REVENUE:
      data = await generateRevenueReport({ from: dateFrom, to: dateTo });  // ✅ Pass as object
      break;

    case REPORT_TYPES.STOCK:
      data = await generateStockReport();
      break;
    case REPORT_TYPES.PRODUCTION:
      data = await generateProductionReport({
        from: dateFrom,
        to: dateTo,
        status,
      });
      break;
    case REPORT_TYPES.PURCHASE:
      data = await generatePurchaseReport({
        from: dateFrom,
        to: dateTo,
        status,
      });
      break;

       case REPORT_TYPES.ORDER_RETURN: // ✅ NEW
      data = await generateOrderReturnReport({
        status,
      });
      break;
      case REPORT_TYPES.WHOLESALE_QUOTATION:
  data = await generateWholesaleQuotationReport({ status });
  break;
  case REPORT_TYPES.PAYMENT:
  data = await generatePaymentReport({
    status,
    method: req.body.method,
    from: dateFrom,
    to: dateTo,
  });
  break;





    default:
      throw new ApiError(400, "Invalid report type");
  }

  return res.status(200).json(
    new ApiResponse(200, data, "Report generated successfully")
  );
});


const generateWholesaleQuotationReport = async ({ status }) => {
  const filter = {};
  if (status) filter.status = status;

  return WholesaleQuotation.find(filter)
    .select(
      "quotationNumber status totalQuantity totalAmount createdAt userID"
    )
    .populate("userID", "fullname email")
    .sort({ createdAt: -1 })
    .lean();
};


const generateOrderReturnReport = async ({ status }) => {
  const matchStage = {};
  if (status) {
    matchStage.status = status;
  }

  return OrderReturn.aggregate([
    { $match: matchStage },

    {
      $lookup: {
        from: "orderreturndetails",
        localField: "_id",
        foreignField: "orderReturnID",
        as: "items",
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "userID",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    {
      $addFields: {
        totalItems: { $sum: "$items.quantity" },
        productCount: {
          $size: { $setUnion: ["$items.productID"] },
        },
      },
    },

    {
      $project: {
        returnId: "$_id",
        orderId: "$orderID",
        status: 1,
        refundAmount: 1,
        refundMode: 1,
        requestedAt: 1,
        customerName: "$user.fullname",
        customerEmail: "$user.email",
        totalItems: 1,
        productCount: 1,
      },
    },

    { $sort: { requestedAt: -1 } },
  ]);
};


const generateOrderReport = async ({ from, to, status }) => {
  const match = {};

  if (status) match.status = status;

  // ✅ USE createdAt (reliable)
  if (from && to) {
    match.createdAt = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  return Order.aggregate([
    { $match: match },

    {
      $lookup: {
        from: "users",
        localField: "userID",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    {
      $lookup: {
        from: "roles",
        localField: "user.roleID",
        foreignField: "_id",
        as: "role",
      },
    },
    { $unwind: "$role" },

    {
      $project: {
        orderId: "$_id",
        customerName: "$user.fullname",
        customerType: "$role.name",
        status: 1,
        total: 1,
        orderedAt: 1,
        deliveredAt: 1,
        createdAt: 1,
      },
    },

    { $sort: { createdAt: -1 } },
  ]);
};

/* =======================
   REVENUE REPORT
======================= */

const generateRevenueReport = async ({ from, to }) => {
  const match = {
    status: "DELIVERED",
  };

  // ✅ DO NOT rely on deliveredAt
  if (from && to) {
    match.createdAt = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const result = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$total" },
        totalOrders: { $sum: 1 },
      },
    },
  ]);

  return result[0] || { totalRevenue: 0, totalOrders: 0 };
};

/* =======================
   STOCK REPORT
======================= */

const generateStockReport = async () => {
  return Product.aggregate([
    {
      $project: {
        productName: "$name",
        stock: 1,
        price: 1,
        isLowStock: {
          $cond: [{ $lte: ["$stock", 5] }, true, false],
        },
      },
    },
    { $sort: { stock: 1 } },
  ]);
};

const generateProductionReport = async ({ from, to, status }) => {
  const match = {};

  if (status) match.status = status;

  if (from && to) {
    match.productionDate = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  return Production.aggregate([
    { $match: match },

    // 🔹 Count total quantity produced
    {
      $addFields: {
        totalQuantityProduced: {
          $sum: "$products.quantityProduced",
        },
      },
    },

    {
      $project: {
        productionNumber: 1,
        productionDate: 1,
        status: 1,
        totalQuantityProduced: 1,
        totalProductionCost: 1,
        createdAt: 1,
      },
    },

    { $sort: { productionDate: -1 } },
  ]);
};


const generatePurchaseReport = async ({ from, to, status }) => {
  const match = {};

  // 🔹 Since purchase is meaningful only when RECEIVED
  if (status) {
    match.status = status;
  } else {
    match.status = "RECEIVED";
  }

  if (from && to) {
    match.purchaseDate = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  return Purchase.aggregate([
    { $match: match },

    // 🔹 Join Vendor
    {
      $lookup: {
        from: "vendors",
        localField: "vendorId",
        foreignField: "_id",
        as: "vendor",
      },
    },
    { $unwind: "$vendor" },

    {
      $addFields: {
        totalItems: { $size: "$items" },
      },
    },

    {
      $project: {
        purchaseId: "$_id",
        vendorName: "$vendor.name",
        purchaseDate: 1,
        status: 1,
        totalAmount: 1,
        totalItems: 1,
      },
    },

    { $sort: { purchaseDate: -1 } },
  ]);
};

const generatePaymentReport = async ({
  status,
  method,
  from,
  to,
}) => {
  const filter = {};

  if (status) filter.status = status;
  if (method) filter.method = method;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  return Payment.find(filter)
    .populate("orderID", "orderNumber")
    .sort({ createdAt: -1 })
    .lean();
};




export const downloadReportPDF = asyncHandler(async (req, res) => {
  const source =
    req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
  const { reportType, dateFrom, dateTo, status } = source;

  let data;

  switch (reportType) {
    case REPORT_TYPES.ORDER:
      data = await generateOrderReport({
        from: dateFrom,
        to: dateTo,
        status,
      });

      return generateReportPDF({
        res,
        title: "Order Report",
        columns: [
          { label: "Order ID", key: "orderId", width: 120 },
          { label: "Customer", key: "customerName", width: 100 },
          { label: "Type", key: "customerType", width: 80 },
          { label: "Status", key: "status", width: 80 },
          { label: "Total", key: "total", width: 60 },
        ],
        rows: data,
      });

    case REPORT_TYPES.REVENUE:
      data = await generateRevenueReport({
        from: dateFrom,
        to: dateTo,
      });

      return generateReportPDF({
        res,
        title: "Revenue Report",
        columns: [
          { label: "Metric", key: "label", width: 200 },
          { label: "Value", key: "value", width: 200 },
        ],
        rows: [
          { label: "Total Revenue", value: data.totalRevenue },
          { label: "Total Orders", value: data.totalOrders },
        ],
      });

    case REPORT_TYPES.STOCK:
      data = await generateStockReport();

      return generateReportPDF({
        res,
        title: "Stock Report",
        columns: [
          { label: "Product", key: "productName", width: 150 },
          { label: "Stock", key: "stock", width: 80 },
          { label: "Price", key: "price", width: 80 },
          { label: "Low Stock", key: "isLowStock", width: 80 },
        ],
        rows: data,
      });
    case REPORT_TYPES.PRODUCTION:
      data = await generateProductionReport({
        from: dateFrom,
        to: dateTo,
        status,
      });

      return generateReportPDF({
        res,
        title: "Production Report",
        columns: [
          { label: "Production No", key: "productionNumber", width: 120 },
          { label: "Date", key: "productionDate", width: 90 },
          { label: "Status", key: "status", width: 90 },
          { label: "Total Qty", key: "totalQuantityProduced", width: 80 },
          { label: "Total Cost", key: "totalProductionCost", width: 90 },
        ],
        rows: data,
      });
    case REPORT_TYPES.PURCHASE:
      data = await generatePurchaseReport({
        from: dateFrom,
        to: dateTo,
        status,
      });


      return generateReportPDF({
        res,
        title: "Purchase Report",
        columns: [
          { label: "Purchase ID", key: "purchaseId", width: 120 },
          { label: "Vendor", key: "vendorName", width: 120 },
          { label: "Date", key: "purchaseDate", width: 90 },
          { label: "Status", key: "status", width: 90 },
          { label: "Items", key: "totalItems", width: 60 },
          { label: "Amount", key: "totalAmount", width: 80 },
        ],
        rows: data,
      });

      case REPORT_TYPES.ORDER_RETURN:
  data = await generateOrderReturnReport({ status });

  return generateReportPDF({
    res,
    title: "Order Returns Report",
    columns: [
      { label: "Return ID", key: "returnId", width: 120 },
      { label: "Order ID", key: "orderId", width: 120 },
      { label: "Customer", key: "customerName", width: 120 },
      { label: "Items", key: "totalItems", width: 60 },
      { label: "Products", key: "productCount", width: 70 },
      { label: "Refund", key: "refundAmount", width: 80 },
      { label: "Mode", key: "refundMode", width: 80 },
      { label: "Status", key: "status", width: 80 },
    ],
    rows: data.map((r) => ({
      ...r,
      refundAmount: `₹${r.refundAmount}`,
    })),
  });

  case REPORT_TYPES.WHOLESALE_QUOTATION:
  data = await generateWholesaleQuotationReport({ status });

  return generateReportPDF({
    res,
    title: "Wholesale Quotations Report",
    columns: [
      { label: "Quotation #", key: "quotationNumber", width: 120 },
      { label: "Customer", key: "customerName", width: 140 },
      { label: "Email", key: "customerEmail", width: 180 },
      { label: "Qty", key: "totalQuantity", width: 60 },
      { label: "Amount", key: "totalAmount", width: 80 },
      { label: "Status", key: "status", width: 100 },
      { label: "Created", key: "createdAt", width: 100 },
    ],
    rows: data.map((q) => ({
      quotationNumber: q.quotationNumber,
      customerName: q.userID?.fullname || "-",
      customerEmail: q.userID?.email || "-",
      totalQuantity: q.totalQuantity,
      totalAmount: `₹${q.totalAmount}`,
      status: q.status,
      createdAt: new Date(q.createdAt).toLocaleDateString(),
    })),
  });

  case REPORT_TYPES.PAYMENT:
  data = await generatePaymentReport({
    status,
    method: source.method,
    from: dateFrom,
    to: dateTo,
  });

  return generateReportPDF({
    res,
    title: "Payments Report",
    columns: [
      { label: "Order", key: "order", width: 120 },
      { label: "Amount", key: "amount", width: 80 },
      { label: "Method", key: "method", width: 80 },
      { label: "Status", key: "status", width: 80 },
      { label: "Date", key: "date", width: 100 },
    ],
    rows: data.map((p) => ({
      order: p.orderID?.orderNumber || p.orderID?._id,
      amount: `₹${p.amount}`,
      method: p.method,
      status: p.status,
      date: new Date(p.createdAt).toLocaleDateString(),
    })),
  });




    default:
      throw new ApiError(400, "Invalid report type");
  }
});


