// controllers/purchaseReturn.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Purchase } from "../models/purchase.model.js";
import { PurchaseReturn } from "../models/purchase_returns.model.js";
import { RawMaterial } from "../models/raw_material.model.js";
import { Product } from "../models/products.model.js";
import mongoose from "mongoose";


// const createPurchaseReturn = asyncHandler(async (req, res) => {

//     const { purchaseID, items, reason } = req.body;

//     // 1️⃣ Basic validation
//     if (!purchaseID || !items || !Array.isArray(items) || items.length === 0) {
//         throw new ApiError(400, "Purchase ID and return items are required");
//     }

//     // 2️⃣ Fetch purchase
//     const purchase = await Purchase.findById(purchaseID);

//     if (!purchase) {
//         throw new ApiError(404, "Purchase not found");
//     }

//     if (purchase.status !== "RECEIVED") {
//         throw new ApiError(
//             400,
//             "Purchase return can only be created for RECEIVED purchases"
//         );
//     }

//     // 3️⃣ Validate return items against purchase items
//     let returnAmount = 0;

//     const validatedItems = items.map((returnItem) => {
//         const { itemType, itemID, quantity, reason } = returnItem;

//         if (!itemType || !itemID || !quantity || quantity <= 0) {
//             throw new ApiError(400, "Invalid return item data");
//         }

//         const purchaseItem = purchase.items.find(
//             (pItem) =>
//                 pItem.itemType === itemType &&
//                 pItem.itemId.toString() === itemID.toString()
//         );

//         if (!purchaseItem) {
//             throw new ApiError(
//                 400,
//                 "Returned item does not exist in the purchase"
//             );
//         }

//         if (quantity > purchaseItem.quantity) {
//             throw new ApiError(
//                 400,
//                 "Return quantity cannot exceed purchased quantity"
//             );
//         }

//         const lineTotal = quantity * purchaseItem.unitPrice;
//         returnAmount += lineTotal;

//         return {
//             itemType,
//             itemID,
//             quantity,
//             unitPrice: purchaseItem.unitPrice, // snapshot
//             lineTotal,
//             reason,
//         };
//     });

//     // 4️⃣ Create purchase return (final state)
//     const purchaseReturn = await PurchaseReturn.create({
//         purchaseID: purchase._id,
//         vendorID: purchase.vendorId,
//         items: validatedItems,
//         returnAmount,
//         reason,
//         status: "CREATED",
//     });


//     return res.status(201).json(
//         new ApiResponse(
//             201,
//             purchaseReturn,
//             "Purchase return created successfully"
//         )
//     );
// });

const createPurchaseReturn = asyncHandler(async (req, res) => {
  const { purchaseID, items, reason } = req.body;

  if (!purchaseID || !items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Purchase ID and items are required");
  }

  // 1️⃣ Fetch purchase
  const purchase = await Purchase.findById(purchaseID);
  if (!purchase) {
    throw new ApiError(404, "Purchase not found");
  }

  // 2️⃣ Fetch ALL existing returns for this purchase
  // IMPORTANT: count both CREATED and COMPLETED
  const existingReturns = await PurchaseReturn.find({
    purchaseID,
    status: { $ne: "CANCELLED" }, // future-proof
  });

  let returnAmount = 0;

  // 3️⃣ Validate each return item
  const validatedItems = items.map((returnItem) => {
    const { itemType, itemID, quantity, reason } = returnItem;

    if (!itemType || !itemID || !quantity || quantity <= 0) {
      throw new ApiError(400, "Invalid return item data");
    }

    // 3.1 Find item in purchase
    const purchaseItem = purchase.items.find(
      (pItem) =>
        pItem.itemType === itemType &&
        pItem.itemId.toString() === itemID.toString()
    );

    if (!purchaseItem) {
      throw new ApiError(400, "Return item not found in purchase");
    }

    // 3.2 Calculate already returned quantity for this item
    const alreadyReturnedQty = existingReturns.reduce((sum, pr) => {
      const matchedItem = pr.items.find(
        (i) =>
          i.itemType === itemType &&
          i.itemID.toString() === itemID.toString()
      );
      return sum + (matchedItem ? matchedItem.quantity : 0);
    }, 0);

    // 3.3 Net quantity validation
    const maxAllowedQty =
      purchaseItem.quantity - alreadyReturnedQty;

    if (quantity > maxAllowedQty) {
      throw new ApiError(
        400,
        `Max returnable quantity for this item is ${maxAllowedQty}`
      );
    }

    // 3.4 Calculate line total
    const lineTotal = quantity * purchaseItem.unitPrice;
    returnAmount += lineTotal;

    return {
      itemType,
      itemID,
      quantity,
      unitPrice: purchaseItem.unitPrice, // snapshot
      lineTotal,
      reason,
    };
  });

  // 4️⃣ Create purchase return
  const purchaseReturn = await PurchaseReturn.create({
    purchaseID,
    vendorID: purchase.vendorId,
    items: validatedItems,
    returnAmount,
    reason,
    status: "CREATED",
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      purchaseReturn,
      "Purchase return created successfully"
    )
  );
});




const completePurchaseReturn = asyncHandler(async (req, res) => {
    const { returnID } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1️⃣ Fetch purchase return
        const purchaseReturn = await PurchaseReturn.findById(returnID).session(session);

        if (!purchaseReturn) {
            throw new ApiError(404, "Purchase return not found");
        }

        // 2️⃣ Status validation
        if (purchaseReturn.status !== "CREATED") {
            throw new ApiError(
                400,
                "Only CREATED purchase returns can be completed"
            );
        }

        // 3️⃣ Inventory reversal (DECREASE stock)
        for (const item of purchaseReturn.items) {
            if (item.itemType === "PRODUCT") {
                const product = await Product.findById(item.itemID).session(session);

                if (!product) {
                    throw new ApiError(404, "Product not found during return completion");
                }

                if (product.stock < item.quantity) {
                    throw new ApiError(
                        400,
                        "Insufficient product stock to complete return"
                    );
                }

                product.stock -= item.quantity;
                await product.save({ session });
            }

            if (item.itemType === "RAWMATERIAL") {
                const rawMaterial = await RawMaterial.findById(item.itemID).session(session);

                if (!rawMaterial) {
                    throw new ApiError(
                        404,
                        "Raw material not found during return completion"
                    );
                }

                if (rawMaterial.quantity < item.quantity) {
                    throw new ApiError(
                        400,
                        "Insufficient raw material stock to complete return"
                    );
                }

                rawMaterial.quantity -= item.quantity;
                await rawMaterial.save({ session });
            }
        }

        // 4️⃣ Finalize return
        purchaseReturn.status = "COMPLETED";
        await purchaseReturn.save({ session });

        // 5️⃣ Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json(
            new ApiResponse(
                200,
                purchaseReturn,
                "Purchase return completed successfully"
            )
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});


//pdf

import PDFDocument from "pdfkit";

export const downloadPurchaseReturnsPDF = asyncHandler(async (req, res) => {
  const { status, vendorID, fromDate, toDate } = req.query;

  const query = {};
  if (status) query.status = status;
  if (vendorID) query.vendorID = vendorID;

  if (fromDate || toDate) {
    query.createdAt = {
      ...(fromDate && { $gte: new Date(fromDate) }),
      ...(toDate && { $lte: new Date(toDate) }),
    };
  }

  const returns = await PurchaseReturn.find(query)
    .populate("vendorID", "name")
    .sort({ createdAt: -1 })
    .lean();

  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=purchase_returns_report.pdf"
  );

  doc.pipe(res);

  // ===== Title =====
  doc.fontSize(18).text("Purchase Returns Report", { align: "center" });
  doc.moveDown(1);

  doc.fontSize(10).text(
    `Generated on: ${new Date().toLocaleDateString()}`,
    { align: "center" }
  );

  doc.moveDown(2);

  // ===== Table Header =====
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Date", 40);
  doc.text("Vendor", 120);
  doc.text("Items", 280);
  doc.text("Amount", 340);
  doc.text("Status", 420);
  doc.moveDown(0.5);

  doc.font("Helvetica");

  // ===== Rows =====
  returns.forEach((r) => {
    doc.text(new Date(r.createdAt).toLocaleDateString(), 40);
    doc.text(r.vendorID?.name || "-", 120);
    doc.text(String(r.items.length), 280);
    doc.text(`₹${r.returnAmount}`, 340);
    doc.text(r.status, 420);
    doc.moveDown(0.3);
  });

  doc.moveDown(2);
  doc.fontSize(8).text("Generated by furniOS", { align: "center" });

  doc.end();
});



const getPurchaseReturns = asyncHandler(async (req, res) => {
    const {
        status,
        vendorID,
        fromDate,
        toDate,
        page = 1,
        limit = 10,
    } = req.query;

    const query = {};

    // Filters
    if (status) query.status = status;
    if (vendorID) query.vendorID = vendorID;

    if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [returns, total] = await Promise.all([
        PurchaseReturn.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate("vendorID","name")
            .populate({
                path: "items.itemID",
                select: "name images price", // ONLY UI fields
            })
            .lean(), // 🔥 important for performance

        PurchaseReturn.countDocuments(query),
    ]);
    return res.status(200).json(
        new ApiResponse(200, {
            data: returns,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        })
    );
});


const getPurchaseReturnById = asyncHandler(async (req, res) => {
    const { returnID } = req.params;

    const purchaseReturn = await PurchaseReturn.findById(returnID)
    .populate("vendorID","name")
        .lean();

    if (!purchaseReturn) {
        throw new ApiError(404, "Purchase return not found");
    }

    // 🔥 Manual population based on itemType
    for (const item of purchaseReturn.items) {
        if (item.itemType === "PRODUCT") {
            item.itemID = await Product.findById(item.itemID)
                .select("name images price")
                .lean();
        }

        if (item.itemType === "RAWMATERIAL") {
            item.itemID = await RawMaterial.findById(item.itemID)
                .select("name")
                .lean();
        }
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            purchaseReturn,
            "Purchase return fetched successfully"
        )
    );
});



const updatePurchaseReturn = asyncHandler(async (req, res) => {
    const { returnID } = req.params; // ✅ matches route
    const { items, reason } = req.body;

    const purchaseReturn = await PurchaseReturn.findById(returnID);
    if (!purchaseReturn) {
        throw new ApiError(404, "Purchase return not found");
    }

    if (purchaseReturn.status !== "CREATED") {
        throw new ApiError(400, "Only CREATED purchase returns can be updated");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, "Items are required");
    }

    const purchase = await Purchase.findById(purchaseReturn.purchaseID);
    if (!purchase) {
        throw new ApiError(404, "Associated purchase not found");
    }

    // 🔥 fetch other returns of same purchase (excluding current)
    const otherReturns = await PurchaseReturn.find({
        purchaseID: purchaseReturn.purchaseID,
        _id: { $ne: purchaseReturn._id },
    });

    let returnAmount = 0;

    const validatedItems = items.map((returnItem) => {
        const { itemType, itemID, quantity, reason } = returnItem;

        const purchaseItem = purchase.items.find(
            (pItem) =>
                pItem.itemType === itemType &&
                pItem.itemId.toString() === itemID.toString()
        );

        if (!purchaseItem) {
            throw new ApiError(400, "Invalid return item");
        }

        // 🔥 calculate already returned qty (excluding current return)
        const alreadyReturnedQty = otherReturns.reduce((sum, pr) => {
            const item = pr.items.find(
                (i) =>
                    i.itemType === itemType &&
                    i.itemID.toString() === itemID.toString()
            );
            return sum + (item ? item.quantity : 0);
        }, 0);

        const maxAllowedQty =
            purchaseItem.quantity - alreadyReturnedQty;

        if (quantity > maxAllowedQty) {
            throw new ApiError(
                400,
                `Max returnable quantity is ${maxAllowedQty}`
            );
        }

        const lineTotal = quantity * purchaseItem.unitPrice;
        returnAmount += lineTotal;

        return {
            itemType,
            itemID,
            quantity,
            unitPrice: purchaseItem.unitPrice,
            lineTotal,
            reason,
        };
    });

    purchaseReturn.items = validatedItems;
    purchaseReturn.returnAmount = returnAmount;
    if (reason) purchaseReturn.reason = reason;

    await purchaseReturn.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            purchaseReturn,
            "Purchase return updated successfully"
        )
    );
});




const deletePurchaseReturn = asyncHandler(async (req, res) => {
    const { returnID } = req.params;

    const purchaseReturn = await PurchaseReturn.findById(returnID);

    if (!purchaseReturn) {
        throw new ApiError(404, "Purchase return not found");
    }

    if (purchaseReturn.status !== "CREATED") {
        throw new ApiError(
            400,
            "Only CREATED purchase returns can be deleted"
        );
    }

    await PurchaseReturn.findByIdAndDelete(returnID);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Purchase return deleted successfully"
        )
    );
});




export {
    createPurchaseReturn,
    completePurchaseReturn,
    getPurchaseReturns,
    getPurchaseReturnById,
    updatePurchaseReturn,
    deletePurchaseReturn
}