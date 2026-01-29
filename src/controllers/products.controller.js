import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Category } from "../models/category.model.js";
import { isValidObjectId } from "mongoose";
import { Product } from "../models/products.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { SubCategory } from "../models/sub_category.model.js";
import mongoose from "mongoose";



// const createProduct = asyncHandler(async (req, res) => {

//     const { subCategoryId, name, description, price } = req.body

//     const existedSubCategory = await SubCategory.findById(subCategoryId)

//     if (!existedSubCategory) {
//         throw new ApiError(404, "Sub category not found!")
//     }

//     const imageNames = req.body.imageNames

//     if (!subCategoryId || !name || !description || !price) {
//         throw new ApiError(400, "All fields are required");
//     }

//     if (!req.files?.images || req.files.images.length === 0) {
//         throw new ApiError(400, "At least one image is required!")
//     }

//     if (!imageNames || imageNames.length !== req.files.images.length) {
//         throw new ApiError(400, "Image names count must match with images!")
//     }



//     const existedProduct = await Product.findOne({
//         subCategoryId,
//         name: name.trim(),
//         price
//     })

//     if (existedProduct) {
//         throw new ApiError(409, "Product already exists!")
//     }

//     const images = [];

//     for (let i = 0; i < req.files.images.length; i++) {
//         const imageLocalPath = req.files.images[i].path

//         const imageUpload = await uploadOnCloudinary(imageLocalPath)

//         if (!imageUpload) {
//             throw new ApiError(400, "Image upload failed!")
//         }

//         images.push({
//             name: imageNames[i],
//             url: imageUpload.url,
//             publicID: imageUpload.publicId,
//             isPrimary: i === 0
//         })
//     }

//     const videos = [];

//     if (req.files.videos && req.files.videos.length > 0) {
//         for (let i = 0; i < req.files.videos.length; i++) {

//             const videoLocalPath = req.files.videos[i].path

//             const videoUpload = await uploadOnCloudinary(videoLocalPath, {
//                 resource_type: "video"
//             })

//             if (!videoUpload) {
//                 throw new ApiError("Video upload failed!")
//             }

//             videos.push({
//                 url: videoUpload.url,
//                 publicID: videoUpload.publicId
//             })
//         }
//     }

//     const product = await Product.create({
//         subCategoryID: subCategoryId,
//         name,
//         price,
//         description,
//         images,
//         videos

//     })

//     return res
//         .status(200)
//         .json(new ApiResponse(200, product, "Product created successfully!"))

// })


const createProduct = asyncHandler(async (req, res) => {

    const { subCategoryId, name, description, price, features } = req.body;

    /* ---------- BASIC VALIDATION ---------- */

    if (!subCategoryId || !name || !description || price === undefined) {
        throw new ApiError(400, "All fields are required");
    }

    if (
        !features ||
        !features.material ||
        !features.color ||
        !features.height ||
        !features.width ||
        !features.length
    ) {
        throw new ApiError(
            400,
            "Features must include material, color, height, width and length"
        );
    }

    /* ---------- SUB CATEGORY CHECK ---------- */

    const existedSubCategory = await SubCategory.findById(subCategoryId);
    if (!existedSubCategory) {
        throw new ApiError(404, "Sub category not found!");
    }

    /* ---------- IMAGE VALIDATION ---------- */

    const imageNames = req.body.imageNames;

    if (!req.files?.images || req.files.images.length === 0) {
        throw new ApiError(400, "At least one image is required!");
    }

    if (!imageNames || imageNames.length !== req.files.images.length) {
        throw new ApiError(400, "Image names count must match with images!");
    }

    /* ---------- DUPLICATE PRODUCT CHECK ---------- */
    /* Uses correct field name: subCategoryID */

    const existedProduct = await Product.findOne({
        subCategoryID: subCategoryId,
        name: name.trim(),
        "features.color": features.color
    });


    if (existedProduct) {
        throw new ApiError(409, "Product already exists!");
    }

    /* ---------- IMAGE UPLOAD ---------- */

    const images = [];

    for (let i = 0; i < req.files.images.length; i++) {
        const imageUpload = await uploadOnCloudinary(
            req.files.images[i].path
        );

        if (!imageUpload) {
            throw new ApiError(400, "Image upload failed!");
        }

        images.push({
            name: imageNames[i],
            url: imageUpload.url,
            publicID: imageUpload.publicId,
            isPrimary: i === 0
        });
    }

    /* ---------- VIDEO UPLOAD (OPTIONAL) ---------- */

    const videos = [];

    if (req.files.videos?.length) {
        for (const video of req.files.videos) {
            const videoUpload = await uploadOnCloudinary(video.path, {
                resource_type: "video"
            });

            if (!videoUpload) {
                throw new ApiError(400, "Video upload failed!");
            }

            videos.push({
                url: videoUpload.url,
                publicID: videoUpload.publicId
            });
        }
    }

    /* ---------- PRODUCT CREATE ---------- */

    const product = await Product.create({
        subCategoryID: subCategoryId,
        name: name.trim(),
        description,
        price,
        features,
        images,
        videos
    });

    return res
        .status(200)
        .json(new ApiResponse(200, product, "Product created successfully!"));
});



// const updateProduct = asyncHandler(async (req, res) => {

//     const { name, price, description, subCategoryId } = req.body
//     const { productId } = req.params


//     const existedProduct = await Product.findById(productId)

//     if (!existedProduct) {
//         throw new ApiError(404, "Product not found!")
//     }

//     const data = {}

//     if (name !== undefined) data.name = name
//     if (price !== undefined) data.price = price
//     if (description !== undefined) data.description = description

//     if (subCategoryId !== undefined) {
//         const existedSubCategory = await SubCategory.findById(subCategoryId)

//         if (!existedSubCategory) {
//             throw new ApiError(404, "Sub category not found!")
//         }
//         data.subCategoryID = subCategoryId
//     }




//     const updatedProduct = await Product.findByIdAndUpdate(
//         existedProduct._id,
//         {
//             $set: data
//         },
//         {
//             new: true
//         }
//     )

//     return res
//         .status(200)
//         .json(new ApiResponse(200, updatedProduct, "Product details updated successfully!"))

// })

// const updateProduct = asyncHandler(async (req, res) => {

//     const {
//         name,
//         price,
//         description,
//         subCategoryId,
//         features
//     } = req.body;

//     const { productId } = req.params;

//     const existedProduct = await Product.findById(productId);
//     if (!existedProduct) {
//         throw new ApiError(404, "Product not found!");
//     }

//     const data = {};

//     /* ---------- BASIC FIELDS ---------- */

//     if (name !== undefined) data.name = name.trim();
//     if (price !== undefined) data.price = price;
//     if (description !== undefined) data.description = description;

//     /* ---------- SUB CATEGORY UPDATE ---------- */

//     if (subCategoryId !== undefined) {
//         const existedSubCategory = await SubCategory.findById(subCategoryId);
//         if (!existedSubCategory) {
//             throw new ApiError(404, "Sub category not found!");
//         }
//         data.subCategoryID = subCategoryId;
//     }

//     /* ---------- FEATURES UPDATE ---------- */

//     if (features !== undefined) {

//         if (
//             !features.material ||
//             !features.color ||
//             !features.height ||
//             !features.width ||
//             !features.length
//         ) {
//             throw new ApiError(
//                 400,
//                 "Complete features object is required when updating features"
//             );
//         }

//         data.features = features;
//     }

//     /* ---------- NO-OP UPDATE GUARD ---------- */

//     if (Object.keys(data).length === 0) {
//         throw new ApiError(400, "No valid fields provided for update");
//     }

//     const updatedProduct = await Product.findByIdAndUpdate(
//         existedProduct._id,
//         { $set: data },
//         { new: true }
//     );

//     return res
//         .status(200)
//         .json(
//             new ApiResponse(
//                 200,
//                 updatedProduct,
//                 "Product details updated successfully!"
//             )
//         );
// });


const updateProduct = asyncHandler(async (req, res) => {

    const {
        name,
        price,
        description,
        subCategoryId,
        features
    } = req.body;

    const { productId } = req.params;

    /* ---------- FIND PRODUCT ---------- */

    const existedProduct = await Product.findById(productId);

    if (!existedProduct) {
        throw new ApiError(404, "Product not found!");
    }

    const data = {};

    /* ---------- BASIC FIELD UPDATES ---------- */

    if (name !== undefined) {
        data.name = name.trim();
    }

    if (price !== undefined) {
        data.price = price;
    }

    if (description !== undefined) {
        data.description = description;
    }

    /* ---------- SUB CATEGORY UPDATE ---------- */

    if (subCategoryId !== undefined) {
        const existedSubCategory = await SubCategory.findById(subCategoryId);

        if (!existedSubCategory) {
            throw new ApiError(404, "Sub category not found!");
        }

        data.subCategoryID = subCategoryId;
    }

    /* ---------- PARTIAL FEATURES UPDATE ---------- */

    if (features !== undefined) {

        if (typeof features !== "object" || Array.isArray(features)) {
            throw new ApiError(400, "Features must be an object");
        }

        // merge incoming features with existing ones
        const mergedFeatures = {
            ...existedProduct.features.toObject(),
            ...features
        };

        // validate final merged features
        if (
            !mergedFeatures.material ||
            !mergedFeatures.color ||
            !mergedFeatures.height ||
            !mergedFeatures.width ||
            !mergedFeatures.length
        ) {
            throw new ApiError(
                400,
                "Features must include material, color, height, width and length"
            );
        }

        data.features = mergedFeatures;
    }

    /* ---------- PREVENT EMPTY UPDATE ---------- */

    if (Object.keys(data).length === 0) {
        throw new ApiError(400, "No valid fields provided for update");
    }

    /* ---------- UPDATE PRODUCT ---------- */

    const updatedProduct = await Product.findByIdAndUpdate(
        existedProduct._id,
        { $set: data },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedProduct,
            "Product updated successfully!"
        )
    );
});




const addMedia = asyncHandler(async (req, res) => {
    const { productId } = req.params
    const imageNames = req.body.imageNames || []

    const product = await Product.findById(productId)
    if (!product) {
        throw new ApiError(404, "Product not found!")
    }

    const MAX_IMAGES = 10
    const MAX_VIDEOS = 2

    const incomingImages = req.files?.images || []
    const incomingVideos = req.files?.videos || []

    const currentImagesCount = product.images.length
    const currentVideosCount = product.videos.length


    if (incomingImages.length) {
        if (incomingImages.length !== imageNames.length) {
            throw new ApiError(400, "Image names count must match images")
        }

        if (currentImagesCount + incomingImages.length > MAX_IMAGES) {
            throw new ApiError(
                400,
                "Images limit exceeded!"
            )
        }
    }


    if (incomingVideos.length) {
        if (currentVideosCount + incomingVideos.length > MAX_VIDEOS) {
            throw new ApiError(
                400,
                "Videos limit exceeded!"
            )
        }
    }

    const images = []
    const videos = []


    for (let i = 0; i < incomingImages.length; i++) {
        const imageUpload = await uploadOnCloudinary(incomingImages[i].path)
        if (!imageUpload) throw new ApiError(400, "Image upload failed")

        images.push({
            name: imageNames[i],
            url: imageUpload.url,
            publicID: imageUpload.publicId
        })
    }


    for (let i = 0; i < incomingVideos.length; i++) {
        const videoUpload = await uploadOnCloudinary(incomingVideos[i].path, {
            resource_type: "video"
        })
        if (!videoUpload) throw new ApiError(400, "Video upload failed")

        videos.push({
            url: videoUpload.url,
            publicID: videoUpload.publicId
        })
    }


    product.images.push(...images)
    product.videos.push(...videos)

    await product.save()

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                product,
                "Media added successfully!"
            )
        )
})


const removeMedia = asyncHandler(async (req, res) => {
    const { productId } = req.params
    const { publicId } = req.body

    if (!publicId) {
        throw new ApiError(400, "Public ID is required!")
    }

    const product = await Product.findById(productId)
    if (!product) {
        throw new ApiError(404, "Product not found!")
    }

    let mediaType = "image"
    let mediaExists = product.images.find(img => img.publicID === publicId)

    if (!mediaExists) {
        mediaType = "video"
        mediaExists = product.videos.find(video => video.publicID === publicId)
    }

    if (!mediaExists) {
        throw new ApiError(404, "Media not found in product!")
    }
    // console.log(mediaExists)

    const deletedFromCloudinary = await deleteOnCloudinary(publicId, mediaType)

    // console.log(deletedFromCloudinary)

    if (!deletedFromCloudinary || deletedFromCloudinary.result !== "ok") {
        throw new ApiError(400, "Media deletion from Cloudinary failed!")
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        product._id,
        {
            $pull: {
                [mediaType === "image" ? "images" : "videos"]: { publicID: publicId }
            }
        },
        { new: true }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedProduct, "Media deleted successfully!"))
})


const deleteProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params

    if (!isValidObjectId(productId)) {
        throw new ApiError(400, "Invalid product id!")
    }

    const product = await Product.findByIdAndDelete(productId)

    if (!product) {
        throw new ApiError(404, "Product not found!")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Product deleted successfully!"))
})

const replaceMedia = asyncHandler(async (req, res) => {
    //find product
    //check if current exists
    //take new media store it
    //then delete and save db

    const { publicId } = req.body
    const { productId } = req.params

    const incomingMedia = req.file

    if (!incomingMedia) {
        throw new ApiError(400, "Media file is required!");
    }

    const product = await Product.findById(productId)

    if (!product) {
        throw new ApiError(404, "Product not found!")
    }

    let mediaType = "image"

    let mediaExists = product.images.find(
        img => img.publicID === publicId
    )

    if (!mediaExists) {
        mediaType = "video"
        mediaExists = product.videos.find(
            video => video.publicID === publicId
        )
    }

    if (!mediaExists) {
        throw new ApiError(404, "Media not found!")
    }



    const upload = await uploadOnCloudinary(
        incomingMedia.path,
        mediaType === "video" ? { resource_type: "video" } : {}
    );

    if (!upload) {
        throw new ApiError(400, "Media upload failed!")
    }


    const mediaDelete = await deleteOnCloudinary(publicId, mediaType)

    if (!mediaDelete || mediaDelete.result !== "ok") {
        throw new ApiError(400, "Media deletion failed!")
    }

    mediaExists.url = upload.url
    mediaExists.publicID = upload.publicId

    await product.save()

    return res
        .status(200)
        .json(new ApiResponse(200, product, "Media replaced successfully!"))

})


const getProductById = asyncHandler(async (req, res) => {
    const { productId } = req.params

    const product = await Product.findById(
        productId
    )

    if (!product) {
        throw new ApiError(404, "Product not found!")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, product, "Product fetched successfully!"))
})

const getProducts = asyncHandler(async (req, res) => {
  const { subcategory } = req.query;

  const filter = {};

  if (subcategory) {
    if (!mongoose.isValidObjectId(subcategory)) {
      throw new ApiError(400, "Invalid subcategory id");
    }
    filter.subCategoryID = subcategory;
  }

  const products = await Product.find(filter)
    .populate("subCategoryID", "name"); // ✅ images preserved

  return res.status(200).json(
    new ApiResponse(200, products, "Products fetched successfully")
  );
});



const getProductsBySubCategory = asyncHandler(async (req, res) => {
    const { subCategoryId } = req.params

    const subCategory = await SubCategory.findById(subCategoryId)

    if (!subCategory) {
        throw new ApiError(404, "Sub category not found!")
    }

    const products = await Product.find({
        subCategoryID: subCategoryId
    })

    if (products.length === 0) {
        throw new ApiError(404, "Products not found!")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, products, "Products fetched sub category wise successfully!"))
})

// const filterProducts = asyncHandler(async (req, res) => {
//   const { subcategory } = req.query;

//   const filter = {};

//   // 🔹 Filter by subcategory (from navbar click)
//   if (subcategory) {
//     if (!mongoose.isValidObjectId(subcategory)) {
//       throw new ApiError(400, "Invalid subcategory id");
//     }

//     filter.subCategoryID = subcategory;
//   }

//   const products = await Product.find(filter)
//     .populate("subCategoryID", "name")
//     .select("_id name price primaryImage");

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       products,
//       "Products fetched successfully"
//     )
//   );
// });


export {
     createProduct, updateProduct, deleteProduct, addMedia, removeMedia, replaceMedia, getProductById, getProducts, getProductsBySubCategory
}

