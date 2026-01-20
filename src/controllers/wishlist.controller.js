import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/products.model.js";
import { Wishlist } from "../models/wishlist.model.js";



const addProduct = asyncHandler(async (req, res) => {
    const { productId } = req.body

    const product = await Product.findById(productId)

    if (!product) {
        throw new ApiError(404, "Product not found!")
    }

    let wishlist = await Wishlist.findOne({ userID: req.user._id })

    if (wishlist) {
        const duplicateProduct = wishlist.products.includes(productId)
        if (duplicateProduct) {
            throw new ApiError(400, "Product already in wishlist!")
        }

        wishlist.products.push(productId)
        await wishlist.save()
    }
    else {

        wishlist = await Wishlist.create({
            userID: req.user._id,
            products: [productId]
        })

    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                wishlist,
                "Product added to wishlist successfully"
            )
        )
})



const removeProduct = asyncHandler(async (req, res) => {

    const { productId } = req.params

    const product = await Product.findById(productId)

    if (!product) {
        throw new ApiError(404, "Product not found!")
    }

    const nonExistedProduct = await Wishlist.findOne({
        userID: req.user._id,
        products: productId
    })
    if (!nonExistedProduct) {
        throw new ApiError(404, "Product not found!")
    }
    const updatedWishlist = await Wishlist.findOneAndUpdate(
        { userID: req.user?._id }, //filter
        {
            $pull: { products: productId }
        },
        {
            new: true
        }
    )

    if (!updatedWishlist) {
        throw new ApiError(404, "Wishlist not found!")
    }


    return res
        .status(200)
        .json(new ApiResponse(200, updatedWishlist, "Product removed from wishlist successfully!"))

})

const removeWishlist = asyncHandler(async (req, res) => {


    const wishlist = await Wishlist.findOneAndDelete(
        {
            userID: req.user?._id
        }
    )

    if (!wishlist) {
        throw new ApiError(404, "Wishlist not found!")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Wishlist deleted successfully!"))
})


const getWishlist = asyncHandler(async (req, res) => {

    //check if it exists for logged in user
    //from that wishlist fetch productid
    //fetch details from products with corresponding productid
    //extract only primary image of product


    const wishlist = await Wishlist.findOne({
        userID: req.user?._id
    })

    if (!wishlist) {
        throw new ApiError(404, "Wishlist not found!")
    }

    const wishList = await Wishlist.aggregate([

            {
                $match:{
                    userID:req.user._id
                }
            },
            {
                $lookup:{
                   from:"products",
                   localField:"products",
                   foreignField:"_id",
                   as:"products" 
                }
            },
            {
                $project:{
                    _id:1,
                    products:{
                        $map:{
                            input:"$products",
                            as:"product",
                            in:{
                                _id:"$$product._id",
                                name:"$$product.name",
                                price:"$$product.price",
                                primaryImage:{
                                    $first:{
                                        $filter:{
                                            input:"$$product.images",
                                            as:"img",
                                            cond:{$eq:["$$img.isPrimary",true]}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        
    ])




    return res
        .status(200)
        .json(new ApiResponse(200,wishList , "Wishlist fetched successfully!"))
})

export {
    addProduct,
    removeProduct,
    removeWishlist,
    getWishlist
}