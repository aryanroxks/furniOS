import { UOM } from "../models/uom.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { RawMaterial } from "../models/raw_material.model.js";


const createUOM = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw new ApiError(400, "UOM name is required");
  }

  const exists = await UOM.findOne({ name: name.toUpperCase() });
  if (exists) {
    throw new ApiError(400, "UOM already exists");
  }

  const uom = await UOM.create({
    name: name.toUpperCase(),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, uom, "UOM created successfully"));
});

const getAllUOMs = asyncHandler(async (req, res) => {
  const uoms = await UOM.find().sort({ name: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, uoms, "UOMs fetched successfully"));
});

const updateUOM = asyncHandler(async (req, res) => {

  const { id } = req.params;
  const { name } = req.body;

  const uom = await UOM.findById(id);
  if (!uom) {
    throw new ApiError(404, "UOM not found");
  }

  if (name) {
    const exists = await UOM.findOne({
      name: name.toUpperCase(),
      _id: { $ne: id },
    });

    if (exists) {
      throw new ApiError(400, "UOM with this name already exists");
    }

    uom.name = name.toUpperCase();
  }

  await uom.save();

  return res
    .status(200)
    .json(new ApiResponse(200, uom, "UOM updated successfully"));
});


const deleteUOM = asyncHandler(async (req, res) => {

  const { id } = req.params;

  const uom = await UOM.findById(id);
  if (!uom) {
    throw new ApiError(404, "UOM not found");
  }

  const used = await RawMaterial.exists({ uomId: id });
  if (used) {
    throw new ApiError(
      400,
      "Cannot delete UOM used by raw materials"
    );
  }

  await uom.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "UOM deleted successfully"));
});



export{
    createUOM,
    getAllUOMs,
    updateUOM,
    deleteUOM
}