import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Category } from "../models/category.model.js";

const createCategory = asyncHandler(async (req, res) => {

    const { name, description } = req.body

    if (!name && !description) {
        throw new ApiError(400, "Provide name and description of category!")
    }

    const existedCategory = await Category.findOne({
        name: name
    })

    if (existedCategory) {
        throw new ApiError(401, "Category already exists!")
    }

    const newCategory = await Category.create({
        name,
        description
    })

    const createdCategory = await Category.findById(newCategory._id)

    if (!createdCategory) {
        throw new ApiError(401, "Category could not be created!")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, createdCategory, "Category successfully created!"))
})


const updateCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { id } = req.params; 

  const categoryToUpdate = await Category.findById(id);
  if (!categoryToUpdate) throw new ApiError(404, "Category not found");

  const duplicate = await Category.findOne({
    name,
    _id: { $ne: id } 
  });
  if (duplicate) throw new ApiError(409, "Category name already exists");

  categoryToUpdate.name = name || categoryToUpdate.name;
  categoryToUpdate.description = description || categoryToUpdate.description;

  const updatedCategory = await categoryToUpdate.save();


  return res
  .status(200)
  .json(
    new ApiResponse(200,updatedCategory,"Category updated successfully!")
  )
});



export {
    createCategory,
    updateCategory
}