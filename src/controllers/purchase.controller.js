// controllers/purchase.controller.js
import { Purchase } from "../models/purchase.model.js";
import { Product } from "../models/products.model.js";
import { Vendor } from "../models/vendor.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { PurchaseDetail } from "../models/purchase_details.model.js";

 const createPurchase = asyncHandler(async (req, res) => {
    const { vendorId, purchaseDate, items } = req.body;

    // 1️⃣ Basic validations
    if (!vendorId) {
        throw new ApiError(400, "Vendor is required");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, "At least one purchase item is required");
    }

    // 2️⃣ Validate vendor exists
    const vendorExists = await Vendor.findById(vendorId);
    if (!vendorExists) {
        throw new ApiError(404, "Vendor not found");
    }

    // 3️⃣ Validate items & calculate totals
    let totalAmount = 0;

    const processedItems = items.map((item, index) => {
        const { itemType, itemId, quantity, unitPrice } = item;

        if (!itemType || !itemId || !quantity || !unitPrice) {
            throw new ApiError(
                400,
                `Invalid data in item at index ${index}`
            );
        }

        if (!["product", "rawMaterial"].includes(itemType)) {
            throw new ApiError(
                400,
                `Invalid itemType at index ${index}`
            );
        }

        if (quantity <= 0 || unitPrice < 0) {
            throw new ApiError(
                400,
                `Invalid quantity or unitPrice at index ${index}`
            );
        }

        const lineTotal = quantity * unitPrice;
        totalAmount += lineTotal;

        return {
            itemType,
            itemId,
            quantity,
            unitPrice,
            lineTotal,
        };
    });

    // 4️⃣ Create purchase (status defaults to pending)
    const purchase = await Purchase.create({
        vendorId,
        purchaseDate,
        items: processedItems,
        totalAmount,
    });

    // 5️⃣ Response
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                purchase,
                "Purchase created successfully!"
            )
        );
});


const getAllPurchases = asyncHandler(async (req, res) => {

    const { status, vendorId, startDate, endDate } = req.query;

    const query = {};

    // 1️⃣ Filter by status
    if (status) {
        query.status = status;
    }

    // 2️⃣ Filter by vendor
    if (vendorId) {
        query.vendorId = vendorId;
    }

    // 3️⃣ Filter by date range
    if (startDate || endDate) {
        query.purchaseDate = {};
        if (startDate) query.purchaseDate.$gte = new Date(startDate);
        if (endDate) query.purchaseDate.$lte = new Date(endDate);
    }

    // 4️⃣ Fetch purchases
    const purchases = await Purchase.find(query)
        .populate("vendorId", "name email")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                purchases,
                "Purchases fetched successfully!"
            )
        );
});



const getPurchaseById = asyncHandler(async (req, res) => {
    const { purchaseId } = req.params;

    if (!purchaseId) {
        throw new ApiError(400, "Purchase ID is required");
    }

    const purchase = await Purchase.findById(purchaseId)
        .populate("vendorId", "name email");

    if (!purchase) {
        throw new ApiError(404, "Purchase not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                purchase,
                "Purchase fetched successfully!"
            )
        );
});




const receivePurchase = asyncHandler(async (req, res) => {
    const { purchaseId } = req.params;

    if (!purchaseId) {
        throw new ApiError(400, "Purchase ID is required");
    }

    // 1️⃣ Fetch purchase
    const purchase = await Purchase.findById(purchaseId);

    if (!purchase) {
        throw new ApiError(404, "Purchase not found");
    }

    // 2️⃣ Status validation
    if (purchase.status === "RECEIVED") {
        throw new ApiError(400, "Purchase already received");
    }

    if (purchase.status === "CANCELLED") {
        throw new ApiError(400, "Cancelled purchase cannot be received");
    }

    // 3️⃣ Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 4️⃣ Update stock item-wise
        for (const item of purchase.items) {
            const { itemType, itemId, quantity, unitPrice, lineTotal } = item;

            if (itemType === "RAWMATERIAL") {
                const rawMaterial = await RawMaterial.findById(itemId).session(session);
                if (!rawMaterial) {
                    throw new ApiError(404, "Raw material not found");
                }

                rawMaterial.quantity += quantity;
                await rawMaterial.save({ session });
            }

            if (itemType === "PRODUCT") {
                const product = await Product.findById(itemId).session(session);
                if (!product) {
                    throw new ApiError(404, "Product not found");
                }

                product.stock += quantity;
                await product.save({ session });
            }

            // 5️⃣ Insert analytics row
            await PurchaseDetail.create(
                [
                    {
                        purchaseId: purchase._id,
                        vendorId: purchase.vendorId,
                        itemType,
                        itemId,
                        quantity,
                        unitPrice,
                        lineTotal,
                        purchaseDate: purchase.purchaseDate,
                        status: "RECEIVED",
                    },
                ],
                { session }
            );
        }

        // 6️⃣ Update purchase status
        purchase.status = "RECEIVED";
        await purchase.save({ session });

        // 7️⃣ Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    purchase,
                    "Purchase received successfully"
                )
            );
    } catch (error) {
        // 8️⃣ Rollback
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});




const updatePurchase = asyncHandler(async (req, res) => {

  const { purchaseId } = req.params;
  const { purchaseDate, items } = req.body;

  if (!purchaseId) {
    throw new ApiError(400, "Purchase ID is required");
  }

  // 1️⃣ Fetch purchase
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new ApiError(404, "Purchase not found");
  }

  // 2️⃣ Status validation
  if (purchase.status !== "PENDING") {
    throw new ApiError(
      400,
      "Only pending purchases can be updated!"
    );
  }

  // 3️⃣ Update purchase date (optional)
  if (purchaseDate) {
    purchase.purchaseDate = purchaseDate;
  }

  // 4️⃣ Update items (optional)
  if (items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Items must be a non-empty array");
    }

    let totalAmount = 0;

    const updatedItems = items.map((item, index) => {
      const { itemType, itemId, quantity, unitPrice } = item;

      if (!itemType || !itemId || !quantity || !unitPrice) {
        throw new ApiError(
          400,
          `Invalid item data at index ${index}`
        );
      }

      if (!["PRODUCT", "RAWMATERIAL"].includes(itemType)) {
        throw new ApiError(
          400,
          `Invalid itemType at index ${index}`
        );
      }

      if (quantity <= 0 || unitPrice < 0) {
        throw new ApiError(
          400,
          `Invalid quantity or unitPrice at index ${index}`
        );
      }

      const lineTotal = quantity * unitPrice;
      totalAmount += lineTotal;

      return {
        itemType,
        itemId,
        quantity,
        unitPrice,
        lineTotal,
      };
    });

    purchase.items = updatedItems;
    purchase.totalAmount = totalAmount;
  }

  // 5️⃣ Save changes
  await purchase.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        purchase,
        "Purchase updated successfully!"
      )
    );
});


const cancelPurchase = asyncHandler(async (req, res) => {
  const { purchaseId } = req.params;

  if (!purchaseId) {
    throw new ApiError(400, "Purchase ID is required");
  }

  // 1️⃣ Fetch purchase
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new ApiError(404, "Purchase not found");
  }

  // 2️⃣ Status validation
  if (purchase.status === "RECEIVED") {
    throw new ApiError(
      400,
      "Received purchase cannot be cancelled"
    );
  }

  if (purchase.status === "CANCELLED") {
    throw new ApiError(
      400,
      "Purchase is already cancelled"
    );
  }

  // 3️⃣ Cancel purchase
  purchase.status = "CANCELLED";
  await purchase.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        purchase,
        "Purchase cancelled successfully!"
      )
    );
});


export {
    createPurchase,
    getAllPurchases,
    getPurchaseById,
    receivePurchase,
    updatePurchase,
    cancelPurchase
}