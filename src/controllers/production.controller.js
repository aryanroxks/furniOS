import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Production from "../models/production.model.js";
import mongoose from "mongoose";
import {Product} from "../models/products.model.js";
import {RawMaterial} from "../models/raw_material.model.js";



const createProduction = asyncHandler(async (req, res) => {
  const {
    productionNumber,
    productionDate,
    products,
    productionRawMaterial,
    totalProductionCost,
  } = req.body;

  // 1️⃣ Basic validation
  if (
    !productionNumber ||
    !productionDate ||
    !products ||
    products.length === 0
  ) {
    throw new ApiError(400, "Required production fields are missing");
  }

  // 2️⃣ Check duplicate production number
  const existingProduction = await Production.findOne({ productionNumber });
  if (existingProduction) {
    throw new ApiError(
      409,
      "Production with this production number already exists"
    );
  }

  // 3️⃣ Create production (NO STOCK CHANGE)
  const production = await Production.create({
    productionNumber,
    productionDate,
    status: "PLANNED",

    products,
    productionRawMaterial: productionRawMaterial || [],
    totalProductionCost: totalProductionCost || 0,

    createdBy: req.user._id,
  });

  // 4️⃣ Safety check
  if (!production) {
    throw new ApiError(500, "Failed to create production");
  }

  // 5️⃣ Response
  return res.status(201).json(
    new ApiResponse(
      201,
      production,
      "Production created successfully (PLANNED)"
    )
  );
});


const completeProduction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const production = await Production.findById(id).session(session);

    if (!production) {
      throw new ApiError(404, "Production not found");
    }

    if (production.status === "COMPLETED") {
      throw new ApiError(400, "Production is already completed");
    }

    if (production.status === "CANCELLED") {
      throw new ApiError(400, "Cancelled production cannot be completed");
    }


    for (const material of production.productionRawMaterial) {
      const rawMaterial = await RawMaterial.findById(
        material.rawMaterialID
      ).session(session);

      if (!rawMaterial) {
        throw new ApiError(404, "Raw material not found");
      }

      if (rawMaterial.stock < material.totalQuantityUsed) {
        throw new ApiError(
          400,
          `Insufficient stock for raw material: ${rawMaterial.name}`
        );
      }
    }

    // 3️⃣ Deduct raw material stock
    for (const material of production.productionRawMaterial) {
      await RawMaterial.findByIdAndUpdate(
        material.rawMaterialID,
        { $inc: { stock: -material.totalQuantityUsed } },
        { session }
      );
    }


    for (const item of production.products) {
      await Product.findByIdAndUpdate(
        item.productID,
        { $inc: { stock: item.quantityProduced } },
        { session }
      );
    }


    production.status = "COMPLETED";
    production.completedAt = new Date();

    await production.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(
      new ApiResponse(
        200,
        production,
        "Production completed successfully"
      )
    );
  } catch (error) {
    // ❌ Rollback everything
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
});


const startProduction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const production = await Production.findById(id);

  if (!production) {
    throw new ApiError(404, "Production not found");
  }

  if (production.status === "COMPLETED") {
    throw new ApiError(400, "Completed production cannot be started");
  }

  if (production.status === "CANCELLED") {
    throw new ApiError(400, "Cancelled production cannot be started");
  }

  if (production.status === "IN_PROGRESS") {
    throw new ApiError(400, "Production is already in progress");
  }

  production.status = "IN_PROGRESS";
  await production.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      production,
      "Production started successfully"
    )
  );
});




const cancelProduction = asyncHandler(async (req, res) => {

  const { id } = req.params;

  const production = await Production.findById(id);

  if (!production) {
    throw new ApiError(404, "Production not found");
  }

  if (production.status === "COMPLETED") {
    throw new ApiError(
      400,
      "Completed production cannot be cancelled"
    );
  }

  if (production.status === "CANCELLED") {
    throw new ApiError(400, "Production is already cancelled");
  }

  production.status = "CANCELLED";
  await production.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      production,
      "Production cancelled successfully"
    )
  );
});



const updateProduction = asyncHandler(async (req, res) => {

  const { id } = req.params;

  const {
    productionDate,
    products,
    productionRawMaterial,
    totalProductionCost,
  } = req.body;

  const production = await Production.findById(id);

  if (!production) {
    throw new ApiError(404, "Production not found");
  }

  if (["COMPLETED", "CANCELLED"].includes(production.status)) {
    throw new ApiError(
      400,
      `Production cannot be updated once it is ${production.status}`
    );
  }

  if (productionDate) {
    production.productionDate = productionDate;
  }

  if (products) {
    if (!Array.isArray(products) || products.length === 0) {
      throw new ApiError(400, "Products must be a non-empty array");
    }
    production.products = products;
  }

  if (productionRawMaterial) {
    if (
      !Array.isArray(productionRawMaterial) ||
      productionRawMaterial.length === 0
    ) {
      throw new ApiError(
        400,
        "productionRawMaterial must be a non-empty array"
      );
    }
    production.productionRawMaterial = productionRawMaterial;
  }

  if (totalProductionCost !== undefined) {
    production.totalProductionCost = totalProductionCost;
  }

  await production.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      production,
      "Production updated successfully"
    )
  );
});


const getProduction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const production = await Production.findById(id)
    .populate("products.productID", "name")
    .populate("products.materialsUsed.rawMaterialID", "name")
    .populate("productionRawMaterial.rawMaterialID", "name");

  if (!production) {
    throw new ApiError(404, "Production not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      production,
      "Production fetched successfully"
    )
  );
});



const getAllProductions = asyncHandler(async (req, res) => {

  const {
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = req.query;

  const query = {};

  if (status) {
    query.status = status.toUpperCase();
  }

  if (startDate || endDate) {
    query.productionDate = {};
    if (startDate) query.productionDate.$gte = new Date(startDate);
    if (endDate) query.productionDate.$lte = new Date(endDate);
  }

  const pageNumber = Math.max(Number(page), 1);
  const pageSize = Math.max(Number(limit), 1);
  const skip = (pageNumber - 1) * pageSize;

  const productions = await Production.find(query)
    .populate("products.productID", "name")
    .populate("productionRawMaterial.rawMaterialID", "name")
    .sort({ productionDate: -1 })
    .skip(skip)
    .limit(pageSize);

  const totalProductions = await Production.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        productions,
        pagination: {
          total: totalProductions,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(totalProductions / pageSize),
        },
      },
      "Productions fetched successfully"
    )
  );
});



export {
    createProduction,
    completeProduction,
    startProduction,
    cancelProduction,
    updateProduction,
    getProduction,
    getAllProductions
    

}