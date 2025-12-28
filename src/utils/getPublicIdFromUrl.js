const getPublicIdFromUrl = (url) => {
  if (!url) return null;

  const parts = url.split("/");
  const uploadIndex = parts.indexOf("upload");

  if (uploadIndex === -1) return null;

  const publicPath = parts
    .slice(uploadIndex + 1)
    .join("/")
    .split(".")[0];

  return publicPath;
};

export { getPublicIdFromUrl };
