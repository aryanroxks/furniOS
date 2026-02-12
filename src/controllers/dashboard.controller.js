import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Order } from "../models/orders.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

 const getDashboardStats = asyncHandler(async (req, res) => {
    const [
        totalCustomers,
        totalOrders,
        revenueAgg
    ] = await Promise.all([
        User.countDocuments(),
        Order.countDocuments(),
        Order.aggregate([
            {
                $match: { status: "DELIVERED" }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" }
                }
            }
        ])
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalCustomers,
                totalOrders,
                totalRevenue
            },
            "Dashboard stats fetched successfully"
        )
    );
});


 const getDashboardRevenueTrend = asyncHandler(async (req, res) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 11); // last 12 days including today

    const revenueTrend = await Order.aggregate([
        {
            $match: {
                status: "DELIVERED",
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%d %b",
                        date: "$createdAt"
                    }
                },
                revenue: { $sum: "$total" },
                orders: { $sum: 1 }
            }
        },
        { $sort: { "_id": 1 } },
        {
            $project: {
                _id: 0,
                day: "$_id",
                revenue: 1,
                orders: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            revenueTrend,
            "Dashboard revenue trend fetched successfully"
        )
    );
});


const getDashboardCategorySales = asyncHandler(async (req, res) => {
    const categorySales = await Order.aggregate([
        // 1️⃣ Only delivered orders
        {
            $match: { status: "DELIVERED" }
        },

        // 2️⃣ Break products array
        {
            $unwind: "$products"
        },

        // 3️⃣ Join Product
        {
            $lookup: {
                from: "products",
                localField: "products.productID",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },

        // 4️⃣ Join SubCategory
        {
            $lookup: {
                from: "subcategories",
                localField: "product.subCategoryID",
                foreignField: "_id",
                as: "subCategory"
            }
        },
        { $unwind: "$subCategory" },

        // 5️⃣ Join Category
        {
            $lookup: {
                from: "categories",
                localField: "subCategory.categoryID",
                foreignField: "_id",
                as: "category"
            }
        },
        { $unwind: "$category" },

        // 6️⃣ Group by category name
        {
            $group: {
                _id: "$category.name",
                value: { $sum: "$products.quantity" }
            }
        },

        // 7️⃣ Sort (largest first)
        {
            $sort: { value: -1 }
        },

        // 8️⃣ Final shape for frontend
        {
            $project: {
                _id: 0,
                name: "$_id",
                value: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            categorySales,
            "Category-wise sales fetched successfully"
        )
    );
});


const getDashboardSubCategorySales = asyncHandler(async (req, res) => {
    const subCategorySales = await Order.aggregate([
        // 1️⃣ Only delivered orders
        {
            $match: { status: "DELIVERED" }
        },

        // 2️⃣ Break products array
        {
            $unwind: "$products"
        },

        // 3️⃣ Join Product
        {
            $lookup: {
                from: "products",
                localField: "products.productID",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },

        // 4️⃣ Join SubCategory
        {
            $lookup: {
                from: "subcategories",
                localField: "product.subCategoryID",
                foreignField: "_id",
                as: "subCategory"
            }
        },
        { $unwind: "$subCategory" },

        // 5️⃣ Group by subcategory name
        {
            $group: {
                _id: "$subCategory.name",
                value: { $sum: "$products.quantity" }
            }
        },

        // 6️⃣ Sort descending
        {
            $sort: { value: -1 }
        },

        // 7️⃣ Frontend-ready format
        {
            $project: {
                _id: 0,
                name: "$_id",
                value: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            subCategorySales,
            "Sub-category sales fetched successfully"
        )
    );
});

export {
    getDashboardStats,
    getDashboardRevenueTrend,
    getDashboardCategorySales,
    getDashboardSubCategorySales
}