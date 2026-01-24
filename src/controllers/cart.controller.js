import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/products.model.js";
import { Cart } from "../models/cart.model.js";



const addProductToCart = asyncHandler(async (req, res) => {
    const { productId, qty = 1 } = req.body;

    if (qty < 1) {
        throw new ApiError(400, "Quantity must be at least 1");
    }

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found!");
    }

    let cart = await Cart.findOne({ userID: req.user._id });

    if (cart) {
        const existingProduct = cart.products.find(
            (item) => item.productID.toString() === productId
        );

        if (existingProduct) {
            existingProduct.quantity += qty; // 🔥 FIX
            existingProduct.price = product.price;
        } else {
            cart.products.push({
                productID: product._id,
                quantity: qty, // 🔥 FIX
                price: product.price
            });
        }

        await cart.save();
    } else {
        cart = await Cart.create({
            userID: req.user._id,
            products: [{
                productID: product._id,
                quantity: qty, // 🔥 FIX
                price: product.price
            }]
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
    const { productId } = req.body

    const decreased = await Cart.findOneAndUpdate({
        userID: req.user?._id,
        "products.productID": productId,
        "products.quantity": { $gt: 1 }
    },
        {
            $inc: { "products.$.quantity": -1 }
        },
        {
            new: true
        }
    )
    if (!decreased) {
        await Cart.findOneAndUpdate({
            userID: req.user?._id
        }, {
            $pull: {
                products: { productID: productId }
            }
        }
        )
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Quantity of product decreased!"))

})


const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({
    userID: req.user._id
  }).populate("products.productID");

  if (!cart) {
    throw new ApiError(404, "Cart not found!");
  }

  const totalCartValue = cart.products.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // 🔥 FLATTEN FOR FRONTEND
  const products = cart.products.map((item) => ({
    _id: item.productID._id,
    name: item.productID.name,
    image: item.productID.images?.[0]?.url,
    price: item.price,
    qty: item.quantity,
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
