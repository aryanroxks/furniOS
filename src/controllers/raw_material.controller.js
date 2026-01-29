// controllers/rawMaterial.controller.js
import { RawMaterial } from "../models/raw_material.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { UOM } from "../models/uom.model.js";
import { ApiError } from "../utils/ApiError.js";


const getAllRawMaterials = asyncHandler(async (req, res) => {

    const { search, uomId, inStock } = req.query;

    const query = {};

    // 🔍 Search by name
    if (search) {
        query.name = { $regex: search, $options: "i" };
    }

    // 📐 Filter by UOM
    if (uomId) {
        query.uomId = uomId;
    }

    // 📦 Stock filter
    if (inStock === "true") {
        query.quantity = { $gt: 0 };
    }

    if (inStock === "false") {
        query.quantity = 0;
    }

    const rawMaterials = await RawMaterial.find(query)
        .populate("uomId", "name")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                rawMaterials,
                "Raw materials fetched successfully"
            )
        );
});


const createRawMaterial = asyncHandler(async (req, res) => {

    const { name, uomId } = req.body;

    if (!name || !uomId) {
        throw new ApiError(400, "Name and UOM are required");
    }

    const uomExists = await UOM.findById(uomId);
    if (!uomExists) {
        throw new ApiError(404, "UOM not found");
    }

    const exists = await RawMaterial.findOne({ name })
    if (exists) {
        throw new ApiError(400, "Raw material with this name exists!")
    }

    const rawMaterial = await RawMaterial.create({
        name,
        uomId,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, rawMaterial, "Raw material created"));
});


const getRawMaterialById = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const rawMaterial = await RawMaterial.findById(id).populate("uomId", "name");

    if (!rawMaterial) {
        throw new ApiError(404, "Raw material not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, rawMaterial, "Raw material fetched"));
});



const updateRawMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, uomId } = req.body;

  const rawMaterial = await RawMaterial.findById(id);

  if (!rawMaterial) {
    throw new ApiError(404, "Raw material not found");
  }

  if (name) {
    const exists = await RawMaterial.findOne({
      name,
      _id: { $ne: id },
    });

    if (exists) {
      throw new ApiError(400, "Raw material with this name already exists");
    }

    rawMaterial.name = name;
  }

  if (uomId) {
    rawMaterial.uomId = uomId;
  }

  await rawMaterial.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, rawMaterial, "Raw material updated successfully")
    );
});



const deleteRawMaterial = asyncHandler(async(req,res) => {

    const {id} = req.body

    const rawMaterial = await RawMaterial.findById(id)

    if(!rawMaterial){
        throw new ApiError(404,"Raw Material not found!")
    }

    const deleteRM =  await RawMaterial.findByIdAndDelete(id);

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Raw material deleted successfully!"));

})



export {
    getAllRawMaterials,
    createRawMaterial,
    getRawMaterialById,
    updateRawMaterial,
    deleteRawMaterial


}