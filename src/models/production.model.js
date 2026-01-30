import mongoose from "mongoose";

const materialUsedSchema = new mongoose.Schema(
  {
    rawMaterialID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },

    quantityUsed: {
      type: Number,
      required: true,
      min: 0,
    },

    unitCostAtTime: {
      type: Number,
      required: true,
      min: 0,
    },

    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const productProductionSchema = new mongoose.Schema(
  {
    productID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantityProduced: {
      type: Number,
      required: true,
      min: 1,
    },

    materialsUsed: {
      type: [materialUsedSchema],
      required: true,
    },

    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },

    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const productionRawMaterial = new mongoose.Schema(
  {
    rawMaterialID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },

    totalQuantityUsed: {
      type: Number,
      required: true,
      min: 0,
    },

    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const productionSchema = new mongoose.Schema(
  {
    productionNumber: {
      type: String,
      required: true,
      unique: true,
    },

    productionDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PLANNED",
    },

    products: {
      type: [productProductionSchema],
      required: true,
    },

    rawMaterials: {
      type: [productionRawMaterial],
      required: true,
    },

    totalProductionCost: {
      type: Number,
      required: true,
      min: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Production", productionSchema);
