import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY
});

//Upload Files Functionality...

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // console.log("File has been uploaded successfully!",response.url)
        fs.unlinkSync(localFilePath);
        return {
            url: response.secure_url,
            publicId: response.public_id
        };
    } catch (error) {
        // console.error("❌ Cloudinary Upload Error:", error);  // <--- LOG IT
        fs.unlinkSync(localFilePath)
        return null;

    }
}

const deleteOnCloudinary = async (publicId) => {

    try {

        await cloudinary.uploader.destroy(publicId)


    } catch (error) {
        console.log("Cloudinary delete error:", error)
    }

}


export {
    uploadOnCloudinary,
    deleteOnCloudinary
}