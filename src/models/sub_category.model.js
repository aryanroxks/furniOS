import mongoose,{Schema} from "mongoose";

const subCategorySchema = new Schema({
    name:{
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description:{
        type:String,
    },
    categoryID:{
        type:Schema.Types.ObjectId,
        ref:"Category"
    }
    
},
{
    timestamps:true
})

export const SubCategory = mongoose.model("SubCategory", subCategorySchema)