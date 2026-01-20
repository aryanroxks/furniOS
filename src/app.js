import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))

app.use(express.urlencoded({extended:true,limit:"16kb"}))

app.use(express.static("public"))

app.use(cookieParser())


//Routes

import userRouter from "./routes/user.routes.js"
import roleRouter from "./routes/role.routes.js"
import categoryRouter from "./routes/category.routes.js"
import subCategoryRouter from "./routes/subCategory.routes.js"
import productRouter from "./routes/products.routes.js"
import wishlistRouter from "./routes/wishlist.routes.js"
import cartRouter from "./routes/cart.routes.js"



app.use("/api/v1/users",userRouter)
app.use("/api/v1/roles",roleRouter)
app.use("/api/v1/categories",categoryRouter)
app.use("/api/v1/subcategories",subCategoryRouter)
app.use("/api/v1/products",productRouter)
app.use("/api/v1/wishlists",wishlistRouter)
app.use("/api/v1/carts",cartRouter)




























// import userRouter from "./routes/user.routes.js"
// import healthcheckRouter from "./routes/healthcheck.routes.js"
// import tweetRouter from "./routes/tweet.routes.js"
// import subscriptionRouter from "./routes/subscription.routes.js"
// import videoRouter from "./routes/video.routes.js"
// import commentRouter from "./routes/comment.routes.js"
// import likeRouter from "./routes/like.routes.js"
// import playlistRouter from "./routes/playlist.routes.js"
// import dashboardRouter from "./routes/dashboard.routes.js"

// //declaration


// app.use("/api/v1/healthcheck", healthcheckRouter)
// app.use("/api/v1/users", userRouter)
// app.use("/api/v1/tweets", tweetRouter)
// app.use("/api/v1/subscriptions", subscriptionRouter)
// app.use("/api/v1/videos", videoRouter)
// app.use("/api/v1/comments", commentRouter)
// app.use("/api/v1/likes", likeRouter)
// app.use("/api/v1/playlist", playlistRouter)
// app.use("/api/v1/dashboard", dashboardRouter)

export {app}
