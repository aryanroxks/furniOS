export const applyBestOffer = async (product) => {
  const now = new Date();

  const offers = await Offer.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { appliesTo: "ALL" },
      { appliesTo: "PRODUCT", products: product._id },
      { appliesTo: "SUBCATEGORY", subCategories: product.subCategoryID },
    ],
  }).sort({ priority: -1 });

  if (!offers.length) {
    return {
      finalPrice: product.price,
      appliedOffer: null,
    };
  }

  const offer = offers[0];
  let finalPrice = product.price;

  if (offer.discountType === "PERCENTAGE") {
    finalPrice -= (product.price * offer.discountValue) / 100;
  } else if (offer.discountType === "FLAT") {
    finalPrice -= offer.discountValue;
  }

  if (finalPrice < 0) finalPrice = 0;

  return {
    finalPrice,
    appliedOffer: {
      id: offer._id,
      title: offer.title,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
    },
  };
};
