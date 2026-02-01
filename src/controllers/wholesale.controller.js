import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { WholesaleQuotation } from "../models/quotation_master.model.js";
import { WholesaleQuotationItem } from "../models/quotation_items.model.js";
import { Product } from "../models/products.model.js";
import { Order } from "../models/orders.model.js";
import { User } from "../models/user.model.js";

const createWholesaleQuotation = asyncHandler(async (req, res) => {
  const userID = req.user?._id;
  const { products, userNote } = req.body;



  if (!products || !Array.isArray(products) || products.length === 0) {
    throw new ApiError(400, "Products are required to create quotation");
  }

  for (const item of products) {
    if (
      !item.productID ||
      !item.quantity ||
      item.quantity <= 0 ||
      !item.requestedPrice ||
      item.requestedPrice <= 0
    ) {
      throw new ApiError(
        400,
        "Each product must have productID, quantity and requestedPrice"
      );
    }
  }



  const productIDs = products.map(p => p.productID);

  const dbProducts = await Product.find({
    _id: { $in: productIDs }
  }).select("_id price");

  if (dbProducts.length !== products.length) {
    throw new ApiError(404, "One or more products not found");
  }


  const quotation = await WholesaleQuotation.create({
    userID,
    quotationNumber: `WQ-${Date.now()}`,
    status: "REQUESTED",
    userNote
  });



  let totalQuantity = 0;
  let totalAmount = 0;

  const quotationItems = products.map(item => {
    totalQuantity += item.quantity;
    totalAmount += item.quantity * item.requestedPrice;

    return {
      quotationID: quotation._id,
      productID: item.productID,
      quantity: item.quantity,
      requestedPrice: item.requestedPrice
    };
  });



  await WholesaleQuotationItem.insertMany(quotationItems);


  quotation.totalQuantity = totalQuantity;
  quotation.totalAmount = totalAmount;
  await quotation.save();

  // 8️⃣ Final response
  return res.status(201).json(
    new ApiResponse(
      201,
      {
        quotationID: quotation._id,
        quotationNumber: quotation.quotationNumber
      },
      "Wholesale quotation created successfully"
    )
  );
});



const revertWholesaleQuotation = asyncHandler(async (req, res) => {


  const { quotationID } = req.params;
  const { items, adminNote } = req.body;

  if (!mongoose.Types.ObjectId.isValid(quotationID)) {
    throw new ApiError(400, "Invalid quotation ID");
  }


  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Quotation items are required");
  }

  for (const item of items) {
    if (
      !item.quotationItemID ||
      !item.approvedPrice ||
      item.approvedPrice <= 0
    ) {
      throw new ApiError(
        400,
        "Each item must have quotationItemID and approvedPrice"
      );
    }
  }


  const quotation = await WholesaleQuotation.findById(quotationID);

  if (!quotation) {
    throw new ApiError(404, "Wholesale quotation not found");
  }


  if (quotation.status !== "REQUESTED") {
    throw new ApiError(
      400,
      "Only REQUESTED quotations can be reverted"
    );
  }


  const bulkOps = items.map(item => ({
    updateOne: {
      filter: {
        _id: item.quotationItemID,
        quotationID: quotation._id
      },
      update: {
        $set: {
          approvedPrice: item.approvedPrice
        }
      }
    }
  }));

  const bulkResult = await WholesaleQuotationItem.bulkWrite(bulkOps);

  if (bulkResult.modifiedCount === 0) {
    throw new ApiError(400, "No quotation items were updated");
  }

  quotation.status = "REVERTED";
  quotation.adminNote = adminNote;
  await quotation.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        quotationID: quotation._id,
        status: quotation.status
      },
      "Wholesale quotation reverted successfully"
    )
  );
});


const approveWholesaleQuotation = asyncHandler(async (req, res) => {
  const { quotationID } = req.params;
  const userID = req.user._id;

  /* -------------------- 1. Validate quotation ID -------------------- */
  if (!mongoose.Types.ObjectId.isValid(quotationID)) {
    throw new ApiError(400, "Invalid quotation ID");
  }

  /* -------------------- 2. Fetch quotation -------------------- */
  const quotation = await WholesaleQuotation.findById(quotationID);
  if (!quotation) {
    throw new ApiError(404, "Wholesale quotation not found");
  }

  /* -------------------- 3. Ownership check -------------------- */
  if (quotation.userID.toString() !== userID.toString()) {
    throw new ApiError(403, "You are not allowed to approve this quotation");
  }

  /* -------------------- 4. Status guard -------------------- */
  if (quotation.status !== "REVERTED") {
    throw new ApiError(
      400,
      "Only REVERTED quotations can be approved"
    );
  }

  /* -------------------- 5. Fetch quotation items -------------------- */
  const quotationItems = await WholesaleQuotationItem
    .find({ quotationID: quotation._id })
    .populate("productID", "name price");

  if (!quotationItems.length) {
    throw new ApiError(400, "Quotation has no items");
  }

  /* -------------------- 6. Build order products & freeze prices -------------------- */
  let subTotal = 0;
  const orderProducts = [];

  for (const item of quotationItems) {
    if (!item.approvedPrice || item.approvedPrice <= 0) {
      throw new ApiError(
        400,
        "Approved price missing for one or more quotation items"
      );
    }

    // Freeze negotiated price
    item.finalPrice = item.approvedPrice;
    await item.save();

    const lineTotal = item.finalPrice * item.quantity;
    subTotal += lineTotal;

    orderProducts.push({
      productID: item.productID._id,
      name: item.productID.name,
      quantity: item.quantity,
      price: item.productID.price,          // original price snapshot
      finalUnitPrice: item.finalPrice,       // negotiated price
      appliedOfferSnapshot: {
        title: "Wholesale Quotation",
        discountType: "NEGOTIATED",
        discountValue: item.productID.price - item.finalPrice
      }
    });
  }

  /* -------------------- 7. Fetch user address -------------------- */
  const user = await User.findById(userID).select(
    "address street city state pincode"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const deliveryAddress1 = `${user.address}, ${user.city}, ${user.state} - ${user.pincode}`;

  /* -------------------- 8. Tax & total calculation -------------------- */
  const CGST = subTotal * 0.09;
  const SGST = subTotal * 0.09;
  const shippingCharge = 0; // usually included / negotiated in wholesale
  const total = subTotal + CGST + SGST + shippingCharge;

  /* -------------------- 9. Create order -------------------- */
  const orderPayload = {
    userID,
    products: orderProducts,
    CGST,
    SGST,
    shippingCharge,
    deliveryAddress1,
    total,
    status: "PLACED"
  };

  // Optional fields (safe even if schema doesn't have them)
  orderPayload.quotationID = quotation._id;
  orderPayload.orderType = "WHOLESALE";

  const order = await Order.create(orderPayload);

  /* -------------------- 10. Update quotation status -------------------- */
  quotation.status = "ORDER_CREATED";
  await quotation.save();

  /* -------------------- 11. Response -------------------- */
  return res.status(201).json(
    new ApiResponse(
      201,
      {
        orderID: order._id,
        quotationID: quotation._id
      },
      "Wholesale quotation approved and order placed successfully"
    )
  );
});



const getWholesaleQuotationDetails = asyncHandler(async (req, res) => {
  const { quotationID } = req.params;
  const userID = req.user._id;

  // 1️⃣ Validate quotationID
  if (!mongoose.Types.ObjectId.isValid(quotationID)) {
    throw new ApiError(400, "Invalid quotation ID");
  }

  // 2️⃣ Aggregate quotation + items + products
  const result = await WholesaleQuotation.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(quotationID),
      },
    },

    // Fetch quotation items
    {
      $lookup: {
        from: "wholesalequotationitems",
        localField: "_id",
        foreignField: "quotationID",
        as: "items",
      },
    },

    // Fetch product details (including images)
    {
      $lookup: {
        from: "products",
        localField: "items.productID",
        foreignField: "_id",
        as: "products",
      },
    },

    // Shape response
    {
      $addFields: {
        items: {
          $map: {
            input: "$items",
            as: "item",
            in: {
              quotationItemID: "$$item._id",
              productID: "$$item.productID",

              quantity: "$$item.quantity",
              requestedPrice: "$$item.requestedPrice",
              approvedPrice: "$$item.approvedPrice",
              finalPrice: "$$item.finalPrice",

              product: {
                $let: {
                  vars: {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$products",
                            as: "p",
                            cond: {
                              $eq: ["$$p._id", "$$item.productID"],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    name: "$$product.name",
                    images: "$$product.images",
                    primaryImage: {
                      $first: {
                        $filter: {
                          input: "$$product.images",
                          as: "img",
                          cond: {
                            $eq: ["$$img.isPrimary", true],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // Cleanup
    {
      $project: {
        products: 0,
      },
    },
  ]);

  if (!result.length) {
    throw new ApiError(404, "Wholesale quotation not found");
  }

  const quotation = result[0];

  // 3️⃣ Ownership check (ONLY rule)
  if (quotation.userID.toString() !== userID.toString()) {
    throw new ApiError(
      403,
      "You are not allowed to view this quotation"
    );
  }

  // 4️⃣ Response
  return res.status(200).json(
    new ApiResponse(
      200,
      quotation,
      "Wholesale quotation details fetched successfully"
    )
  );
});

const getWholesaleQuotationById = asyncHandler(async (req, res) => {
  const { quotationID } = req.params;
  const userID = req.user._id;

  // 1️⃣ Validate ID
  if (!mongoose.Types.ObjectId.isValid(quotationID)) {
    throw new ApiError(400, "Invalid quotation ID");
  }

  // 2️⃣ Aggregate quotation + items + product details
  const result = await WholesaleQuotation.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(quotationID),
      },
    },

    {
      $lookup: {
        from: "wholesalequotationitems",
        localField: "_id",
        foreignField: "quotationID",
        as: "items",
      },
    },

    {
      $lookup: {
        from: "products",
        localField: "items.productID",
        foreignField: "_id",
        as: "products",
      },
    },

    {
      $addFields: {
        items: {
          $map: {
            input: "$items",
            as: "item",
            in: {
              quotationItemID: "$$item._id",
              productID: "$$item.productID",
              quantity: "$$item.quantity",
              requestedPrice: "$$item.requestedPrice",
              approvedPrice: "$$item.approvedPrice",
              finalPrice: "$$item.finalPrice",

              product: {
                $let: {
                  vars: {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$products",
                            as: "p",
                            cond: {
                              $eq: ["$$p._id", "$$item.productID"],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    name: "$$product.name",
                    images: "$$product.images",
                    primaryImage: {
                      $first: {
                        $filter: {
                          input: "$$product.images",
                          as: "img",
                          cond: {
                            $eq: ["$$img.isPrimary", true],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    {
      $project: {
        products: 0,
      },
    },
  ]);

  if (!result.length) {
    throw new ApiError(404, "Wholesale quotation not found");
  }

  const quotation = result[0];



  // 4️⃣ Response
  return res.status(200).json(
    new ApiResponse(
      200,
      quotation,
      "Wholesale quotation fetched successfully"
    )
  );
});


const getMyWholesaleQuotations = asyncHandler(async (req, res) => {
  const userID = req.user._id;

  // 1️⃣ Fetch only required fields
  const quotations = await WholesaleQuotation.find({ userID })
    .select(
      "quotationNumber status totalQuantity totalAmount createdAt updatedAt"
    )
    .sort({ createdAt: -1 });

  // 2️⃣ No error if empty — empty list is valid
  return res.status(200).json(
    new ApiResponse(
      200,
      quotations,
      "Wholesale quotations fetched successfully"
    )
  );
});

const getAllWholesaleQuotations = asyncHandler(async (req, res) => {
  const { status } = req.query; // optional filter

  const filter = {};
  if (status) {
    filter.status = status;
  }

  const quotations = await WholesaleQuotation.find(filter)
    .select(
      "quotationNumber userID status totalQuantity totalAmount createdAt"
    )
    .populate("userID", "fullname email")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      quotations,
      "All wholesale quotations fetched successfully"
    )
  );
});



const rejectWholesaleQuotation = asyncHandler(async (req, res) => {
  const { quotationID } = req.params;
  const userID = req.user._id;

  // 1️⃣ Validate ID
  if (!mongoose.Types.ObjectId.isValid(quotationID)) {
    throw new ApiError(400, "Invalid quotation ID");
  }

  // 2️⃣ Fetch quotation
  const quotation = await WholesaleQuotation.findById(quotationID);

  if (!quotation) {
    throw new ApiError(404, "Wholesale quotation not found");
  }

  // 3️⃣ Ownership check
  if (quotation.userID.toString() !== userID.toString()) {
    throw new ApiError(403, "Not allowed to reject this quotation");
  }

  // 4️⃣ Status guard
  if (!["REQUESTED", "REVERTED"].includes(quotation.status)) {
    throw new ApiError(
      400,
      "Quotation cannot be rejected in its current state"
    );
  }


  // 5️⃣ Reject
  quotation.status = "REJECTED";
  await quotation.save();

  // 6️⃣ Response
  return res.status(200).json(
    new ApiResponse(
      200,
      { quotationID: quotation._id, status: quotation.status },
      "Wholesale quotation rejected successfully"
    )
  );
});


const rejectWholesaleQuotationByAdmin = asyncHandler(async (req, res) => {
  const { quotationID } = req.params;

  // 1️⃣ Validate ID
  if (!mongoose.Types.ObjectId.isValid(quotationID)) {
    throw new ApiError(400, "Invalid quotation ID");
  }

  // 2️⃣ Fetch quotation
  const quotation = await WholesaleQuotation.findById(quotationID);

  if (!quotation) {
    throw new ApiError(404, "Wholesale quotation not found");
  }

  // 3️⃣ Status guard
  if (quotation.status !== "REQUESTED") {
    throw new ApiError(
      400,
      "Only REQUESTED quotations can be rejected by admin"
    );
  }

  // 4️⃣ Reject
  quotation.status = "REJECTED";
  await quotation.save();

  // 5️⃣ Response
  return res.status(200).json(
    new ApiResponse(
      200,
      { quotationID: quotation._id, status: quotation.status },
      "Wholesale quotation rejected by admin"
    )
  );
});


export {
  createWholesaleQuotation,
  revertWholesaleQuotation,
  approveWholesaleQuotation,
  getWholesaleQuotationDetails,
  getWholesaleQuotationById,
  getMyWholesaleQuotations,
  getAllWholesaleQuotations,
  rejectWholesaleQuotation,
  rejectWholesaleQuotationByAdmin



}