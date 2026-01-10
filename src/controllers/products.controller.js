import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Category } from "../models/category.model.js";
import { isValidObjectId } from "mongoose";
import { Product } from "../models/products.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { SubCategory } from "../models/sub_category.model.js";



const createProduct = asyncHandler(async (req, res) => {

    const { subCategoryId, name, description, price } = req.body

    const existedSubCategory = await SubCategory.findById(subCategoryId)

    if(!existedSubCategory){
        throw new ApiError(404,"Sub category not found!")
    }

    const imageNames = req.body.imageNames

    if (!subCategoryId || !name || !description || !price) {
        throw new ApiError(400, "All fields are required");
    }

    if(!req.files?.images || req.files.images.length === 0){
        throw new ApiError(400,"At least one image is required!")
    }

    if(!imageNames || imageNames.length !== req.files.images.length){
        throw new ApiError(400,"Image names count must match with images!")
    }



    const existedProduct = await Product.findOne({
        subCategoryId,
        name: name.trim(),
        price
    })

    if (existedProduct) {
        throw new ApiError(409, "Product already exists!")
    }

    const images = [];

    for(let i=0; i < req.files.images.length; i++){
        const imageLocalPath = req.files.images[i].path

        const imageUpload = await uploadOnCloudinary(imageLocalPath)

        if(!imageUpload){
            throw new ApiError(400,"Image upload failed!")
        }

        images.push({
            name:imageNames[i],
            url:imageUpload.url,
            publicID:imageUpload.publicId,
            isPrimary:i===0
        })
    }

    const videos= [];

    if(req.files.videos && req.files.videos.length > 0){
        for(let i=0; i<req.files.videos.length; i++){

                const videoLocalPath = req.files.videos[i].path

                const videoUpload = await uploadOnCloudinary(videoLocalPath,{
                    resource_type:"video"
                })

                if(!videoUpload){
                    throw new ApiError("Video upload failed!")
                }

                videos.push({
                    url:videoUpload.url,
                    publicID:videoUpload.publicId
                })
        }
    }

    const product = await Product.create({
        subCategoryID:subCategoryId,
        name,
        price,
        description,
        images,
        videos

    })

    return res
    .status(200)
    .json(new ApiResponse(200,product,"Product created successfully!"))

})

export {
    createProduct
}