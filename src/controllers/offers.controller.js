import mongoose from "mongoose";
import { Offer } from "../models/offers.model.js";
import { Product } from "../models/products.model.js";
import { SubCategory } from "../models/sub_category.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";

const createOffer = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    discountType,
    discountValue,
    appliesTo,
    products = [],
    subCategories = [],
    startDate,
    endDate,
    priority,
  } = req.body;

  /* ---------- BASIC VALIDATIONS ---------- */

  if (!title || !discountType || discountValue == null || !appliesTo || !startDate || !endDate) {
    throw new ApiError(400, "All required fields must be provided");
  }

  if (!["PERCENTAGE", "FLAT"].includes(discountType)) {
    throw new ApiError(400, "Invalid discount type");
  }

  if (discountValue <= 0) {
    throw new ApiError(400, "Discount value must be greater than 0");
  }

  if (!["PRODUCT", "SUBCATEGORY", "ALL"].includes(appliesTo)) {
    throw new ApiError(400, "Invalid appliesTo value");
  }

  /* ---------- DATE VALIDATION ---------- */

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    throw new ApiError(400, "startDate must be before endDate");
  }

  /* ---------- APPLIES-TO VALIDATION ---------- */

  if (appliesTo === "PRODUCT") {
    if (!products.length) {
      throw new ApiError(400, "Products are required when appliesTo is PRODUCT");
    }

    for (const productId of products) {
      if (!mongoose.isValidObjectId(productId)) {
        throw new ApiError(400, "Invalid product ID");
      }
    }

    const count = await Product.countDocuments({ _id: { $in: products } });
    if (count !== products.length) {
      throw new ApiError(400, "One or more products do not exist");
    }
  }

  if (appliesTo === "SUBCATEGORY") {
    if (!subCategories.length) {
      throw new ApiError(400, "SubCategories are required when appliesTo is SUBCATEGORY");
    }

    for (const subCatId of subCategories) {
      if (!mongoose.isValidObjectId(subCatId)) {
        throw new ApiError(400, "Invalid subCategory ID");
      }
    }

    const count = await SubCategory.countDocuments({ _id: { $in: subCategories } });
    if (count !== subCategories.length) {
      throw new ApiError(400, "One or more subCategories do not exist");
    }
  }

  if (appliesTo === "ALL") {
    if (products.length || subCategories.length) {
      throw new ApiError(400, "Products or SubCategories not allowed when appliesTo is ALL");
    }
  }

  /* ---------- CREATE OFFER ---------- */

  const offer = await Offer.create({
    title,
    description,
    discountType,
    discountValue,
    appliesTo,
    products,
    subCategories,
    startDate: start,
    endDate: end,
    priority: priority ?? 1,
  });

  return res.status(201).json(
    new ApiResponse(201, offer, "Offer created successfully")
  );
});


const getOfferById = asyncHandler(async (req, res) => {
  const { offerId } = req.params;

  /* ---------- ID VALIDATION ---------- */

  if (!mongoose.isValidObjectId(offerId)) {
    throw new ApiError(400, "Invalid offer id");
  }

  /* ---------- FETCH OFFER ---------- */

  const offer = await Offer.findById(offerId)
    .populate("products", "name price")
    .populate("subCategories", "name");

  if (!offer) {
    throw new ApiError(404, "Offer not found");
  }

  return res.status(200).json(
    new ApiResponse(200, offer, "Offer fetched successfully")
  );
});


const updateOffer = asyncHandler(async (req, res) => {

  const { offerId } = req.params;

  if (!mongoose.isValidObjectId(offerId)) {
    throw new ApiError(400, "Invalid offer id");
  }

  const offer = await Offer.findById(offerId);
  if (!offer) {
    throw new ApiError(404, "Offer not found");
  }

  const {
    title,
    description,
    discountType,
    discountValue,
    appliesTo,
    products,
    subCategories,
    startDate,
    endDate,
    priority,
    isActive,
  } = req.body;

  /* ---------- DISCOUNT VALIDATION ---------- */

  if (discountType && !["PERCENTAGE", "FLAT"].includes(discountType)) {
    throw new ApiError(400, "Invalid discount type");
  }

  if (discountValue !== undefined && discountValue <= 0) {
    throw new ApiError(400, "Discount value must be greater than 0");
  }

  /* ---------- APPLIES-TO VALIDATION ---------- */

  const finalAppliesTo = appliesTo ?? offer.appliesTo;

  if (finalAppliesTo === "PRODUCT") {
    const finalProducts = products ?? offer.products;

    if (!finalProducts || !finalProducts.length) {
      throw new ApiError(400, "Products are required when appliesTo is PRODUCT");
    }

    for (const productId of finalProducts) {
      if (!mongoose.isValidObjectId(productId)) {
        throw new ApiError(400, "Invalid product ID");
      }
    }

    const count = await Product.countDocuments({ _id: { $in: finalProducts } });
    if (count !== finalProducts.length) {
      throw new ApiError(400, "One or more products do not exist");
    }

    offer.products = finalProducts;
    offer.subCategories = [];
  }

  if (finalAppliesTo === "SUBCATEGORY") {
    const finalSubCategories = subCategories ?? offer.subCategories;

    if (!finalSubCategories || !finalSubCategories.length) {
      throw new ApiError(400, "SubCategories are required when appliesTo is SUBCATEGORY");
    }

    for (const subCatId of finalSubCategories) {
      if (!mongoose.isValidObjectId(subCatId)) {
        throw new ApiError(400, "Invalid subCategory ID");
      }
    }

    const count = await SubCategory.countDocuments({
      _id: { $in: finalSubCategories },
    });

    if (count !== finalSubCategories.length) {
      throw new ApiError(400, "One or more subCategories do not exist");
    }

    offer.subCategories = finalSubCategories;
    offer.products = [];
  }

  if (finalAppliesTo === "ALL") {
    offer.products = [];
    offer.subCategories = [];
  }

  /* ---------- DATE VALIDATION ---------- */

  const updatedStart = startDate ? new Date(startDate) : offer.startDate;
  const updatedEnd = endDate ? new Date(endDate) : offer.endDate;

  if (updatedStart >= updatedEnd) {
    throw new ApiError(400, "startDate must be before endDate");
  }

  /* ---------- APPLY UPDATES ---------- */

  if (title !== undefined) offer.title = title;
  if (description !== undefined) offer.description = description;
  if (discountType !== undefined) offer.discountType = discountType;
  if (discountValue !== undefined) offer.discountValue = discountValue;
  if (appliesTo !== undefined) offer.appliesTo = appliesTo;
  if (priority !== undefined) offer.priority = priority;
  if (isActive !== undefined) offer.isActive = isActive;

  offer.startDate = updatedStart;
  offer.endDate = updatedEnd;

  await offer.save();

  return res.status(200).json(
    new ApiResponse(200, offer, "Offer updated successfully")
  );
});


const toggleOfferStatus = asyncHandler(async (req, res) => {
  const { offerId } = req.params;

  if (!mongoose.isValidObjectId(offerId)) {
    throw new ApiError(400, "Invalid offer id");
  }

  const offer = await Offer.findById(offerId);
  if (!offer) {
    throw new ApiError(404, "Offer not found");
  }

  offer.isActive = !offer.isActive;
  await offer.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      offer,
      `Offer ${offer.isActive ? "activated" : "deactivated"} successfully`
    )
  );
});



const getAllOffers = asyncHandler(async (req, res) => {
    
  const {
    isActive,
    appliesTo,
    status, // active | expired | upcoming
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const filter = {};
  const now = new Date();

  /* ---------- BASIC FILTERS ---------- */

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  if (appliesTo) {
    if (!["PRODUCT", "SUBCATEGORY", "ALL"].includes(appliesTo)) {
      throw new ApiError(400, "Invalid appliesTo filter");
    }
    filter.appliesTo = appliesTo;
  }

  /* ---------- STATUS FILTER ---------- */

  if (status) {
    if (!["active", "expired", "upcoming"].includes(status)) {
      throw new ApiError(400, "Invalid status filter");
    }

    if (status === "active") {
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
    }

    if (status === "expired") {
      filter.endDate = { $lt: now };
    }

    if (status === "upcoming") {
      filter.startDate = { $gt: now };
    }
  }

  /* ---------- PAGINATION ---------- */

  const pageNumber = Number(page);
  const pageSize = Number(limit);
  const skip = (pageNumber - 1) * pageSize;

  /* ---------- SORTING ---------- */

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  /* ---------- QUERY ---------- */

  const [offers, totalOffers] = await Promise.all([
    Offer.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .populate("products", "name price")
      .populate("subCategories", "name"),
    Offer.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      offers,
      pagination: {
        total: totalOffers,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(totalOffers / pageSize),
      },
    }, "Offers fetched successfully")
  );
});

const deleteOffer  = asyncHandler(async(req,res) => {

  const {offerId} = req.params;

  const offer = Offer.findByIdAndDelete(offerId)

  if(!offer){
    throw new ApiError(404,"Offer not found!")
  }

  return res
  .status(200)
  .json(new ApiResponse(200,{},"Offer deleted successfully!"))

})



export {
    createOffer,
    updateOffer,
    toggleOfferStatus,
    getAllOffers,
    getOfferById,
    deleteOffer
}