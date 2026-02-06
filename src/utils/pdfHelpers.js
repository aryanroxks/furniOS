export const drawLine = (doc) => {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();
};

 const formatINR = (amount) => {
    return `₹${Number(amount).toLocaleString("en-IN")}`;
};
