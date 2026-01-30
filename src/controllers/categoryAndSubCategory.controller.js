import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Category } from "../models/category.model.js";
import { isValidObjectId } from "mongoose";
import { SubCategory } from "../models/sub_category.model.js";

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
    const { categoryId } = req.params;

    if (!isValidObjectId(categoryId)) {
        throw new ApiError(400, "Invalid category id!")
    }

    const categoryToUpdate = await Category.findById(categoryId);
    if (!categoryToUpdate) throw new ApiError(404, "Category not found");

    const duplicate = await Category.findOne({
        name,
        _id: { $ne: categoryId }
    });
    if (duplicate) throw new ApiError(409, "Category name already exists");

    categoryToUpdate.name = name || categoryToUpdate.name;
    categoryToUpdate.description = description || categoryToUpdate.description;

    const updatedCategory = await categoryToUpdate.save();


    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedCategory, "Category updated successfully!")
        )
})


const deleteCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params

    if (!isValidObjectId(categoryId)) {
        throw new ApiError(400, "Invalid category id!")
    }

    const existedCategory = await Category.findByIdAndDelete(categoryId)

    if (!existedCategory) {
        throw new ApiError(404, "Category not found!")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Category deleted successfully"))
})


const getCategories = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const query = search
    ? { name: { $regex: search, $options: "i" } }
    : {};

  const categories = await Category.find(query);

  res.status(200).json(
    new ApiResponse(200, categories, "Fetched successfully")
  );
});


const getCategoryById = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);

    if (!category) {
        throw new ApiError(404, "Category not found");
    }

    res
        .status(200)
        .json(
            new ApiResponse(200, category, "Category fetched successfully")
        );
});

//SUB CATEGORIES

const createSubCategory = asyncHandler(async (req, res) => {

    const { name, description } = req.body

    const { categoryId } = req.params

    const category = await Category.findById(categoryId)

    if (!category) {
        throw new ApiError(404, "Category not found!")
    }

    if (!name && !description) {
        throw new ApiError(400, "Provide name and description of sub category!")
    }

    const existedSubCategory = await SubCategory.findOne({
        name: name
    })

    if (existedSubCategory) {
        throw new ApiError(401, "Sub Category already exists!")
    }

    const newSubCategory = await SubCategory.create({
        name,
        description,
        categoryID: categoryId

    })

    const createdSubCategory = await SubCategory.findById(newSubCategory._id)

    if (!createdSubCategory) {
        throw new ApiError(401, "Sub Category could not be created!")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, createdSubCategory, "Sub Category successfully created!"))
})


const updateSubCategory = asyncHandler(async (req, res) => {

    const { name, description, categoryId } = req.body
    const { subCategoryId } = req.params

    if (!isValidObjectId(subCategoryId)) {
        throw new ApiError(400, "Invalid sub category id")
    }

    const subCategoryToUpdate = await SubCategory.findById(subCategoryId)

    if (!subCategoryToUpdate) {
        throw new ApiError(404, "Sub category does not exists!")
    }

    const duplicate = await SubCategory.findOne({
        name,
        _id: { $ne: subCategoryId }
    })

    if (duplicate) {
        throw new ApiError(409, "Sub category already exists!")
    }

    subCategoryToUpdate.name = name || subCategoryToUpdate.name
    subCategoryToUpdate.description = description || subCategoryToUpdate.description
    subCategoryToUpdate.categoryID = categoryId || subCategoryToUpdate.categoryID

    const updatedSubCategory = await subCategoryToUpdate.save()

    return res
        .status(200)
        .json(new ApiResponse(200, updatedSubCategory, "Sub category updated successfully!"))


})


const deleteSubCategory = asyncHandler(async (req, res) => {
    const { subCategoryId } = req.params

    if (!isValidObjectId(subCategoryId)) {
        throw new ApiError(400, "Invalid sub category id!")
    }
    const existedSubCategory = await SubCategory.findByIdAndDelete(subCategoryId)

    if (!existedSubCategory) {
        throw new ApiError(404, "Sub Category not found!")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Sub category deleted successfully!"))
})


const getSubCategories = asyncHandler(async (req, res) => {

    const { categoryId } = req.params

    const subCategories = await SubCategory.find({
        categoryID: categoryId
    }).select("-categoryID")

    if (!subCategories.length === 0) {
        throw new ApiError(404, "Sub categories does not exists for this category!")
    }

    // if(!categories){
    //     throw new ApiError(404,"Categories not found!")
    // }

    return res
        .status(200)
        .json(new ApiResponse(200, subCategories, "All Sub categories fetched successfully!"))
})

const getSubCategoryById = asyncHandler(async (req, res) => {
    const { subCategoryId } = req.params;

    if (!isValidObjectId(subCategoryId)) {
        throw new ApiError(400, "Invalid sub category id!");
    }

    const subCategory = await SubCategory.findById(subCategoryId).select("-categoryID");

    if (!subCategory) {
        throw new ApiError(404, "Sub category not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, subCategory, "Sub category fetched successfully")
        );
});

const getAllSubCategories = asyncHandler(async (req, res) => {
    const subCategories = await SubCategory.find()
        .populate("categoryID", "name")
        .sort({ name: 1 });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subCategories,
                "All sub categories fetched successfully"
            )
        );
});



export {
    createCategory,
    updateCategory,
    deleteCategory,
    getCategories,
    getCategoryById,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    getSubCategories,
    getSubCategoryById,
    getAllSubCategories

}