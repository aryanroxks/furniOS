import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/products.model.js";
import { Cart } from "../models/cart.model.js";



import { applyBestOffer } from "../utils/applyBestOffer.js";


const addProductToCart = asyncHandler(async (req, res) => {
    const { productId, qty = 1 } = req.body;

    const quantityToAdd = Number(qty);

    if (!Number.isInteger(quantityToAdd) || quantityToAdd < 1) {
        throw new ApiError(400, "Quantity must be a valid number greater than 0");
    }

    if (quantityToAdd > 5) {
        throw new ApiError(400, "Maximum 5 quantities allowed per product");
    }

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found!");
    }

    const { finalPrice } = await applyBestOffer(product);

    let cart = await Cart.findOne({ userID: req.user._id });

    if (cart) {
        const existingProduct = cart.products.find(
            (item) => item.productID.toString() === productId
        );

        if (existingProduct) {
            const newQty = existingProduct.quantity + quantityToAdd;

            if (newQty > 5) {
                throw new ApiError(
                    400,
                    "You can add a maximum of 5 quantities of this product"
                );
            }

            existingProduct.quantity = newQty;
            existingProduct.price = product.price;
            existingProduct.finalUnitPrice = finalPrice;
        } else {
            // ✅ VALIDATE HERE ALSO
            if (quantityToAdd > 5) {
                throw new ApiError(
                    400,
                    "You can add a maximum of 5 quantities of this product"
                );
            }

            cart.products.push({
                productID: product._id,
                quantity: quantityToAdd,
                price: product.price,
                finalUnitPrice: finalPrice,
            });
        }

        await cart.save();
    } else {
        cart = await Cart.create({
            userID: req.user._id,
            products: [
                {
                    productID: product._id,
                    quantity: quantityToAdd,
                    price: product.price,
                    finalUnitPrice: finalPrice,
                },
            ],
        });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, cart, "Product added to cart successfully!"));
});






const removeProductFromCart = asyncHandler(async (req, res) => {

    const { productId } = req.body;

    const cart = await Cart.findOneAndUpdate(
        { userID: req.user._id },
        {
            $pull: {
                products: { productID: productId }
            }
        },
        { new: true }
    );

    if (!cart) {
        throw new ApiError(404, "Cart not found!");
    }

    return res.status(200).json(
        new ApiResponse(200, cart, "Product removed from cart successfully!")
    );

})


const decreaseQuantity = asyncHandler(async (req, res) => {
    const { productId } = req.body;

    const updated = await Cart.findOneAndUpdate(
        {
            userID: req.user._id,
            "products.productID": productId,
            "products.quantity": { $gt: 1 },
        },
        {
            $inc: { "products.$.quantity": -1 },
        },
        { new: true }
    );

    if (!updated) {
        await Cart.findOneAndUpdate(
            { userID: req.user._id },
            { $pull: { products: { productID: productId } } }
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Quantity of product decreased!"));
});



const getCart = asyncHandler(async (req, res) => {
    const cart = await Cart.findOne({
        userID: req.user._id,
    }).populate("products.productID");

    if (!cart) {
        throw new ApiError(404, "Cart not found!");
    }

    // ✅ Use finalUnitPrice
    const totalCartValue = cart.products.reduce(
        (sum, item) => sum + item.finalUnitPrice * item.quantity,
        0
    );

    // ✅ Flatten response for frontend
    const products = cart.products.map((item) => ({
        _id: item.productID._id,
        name: item.productID.name,
        image: item.productID.images?.[0]?.url,
        price: item.price,                    // original
        finalUnitPrice: item.finalUnitPrice,  // discounted
        quantity: item.quantity,              // ✅ consistent
    }));

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                products,
                totalCartValue,
                totalItems: products.length,
            },
            "Cart fetched successfully"
        )
    );
});





export {
    addProductToCart,
    removeProductFromCart,
    decreaseQuantity,
    getCart
}
