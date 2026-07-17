// SINGLE SOURCE OF TRUTH FOR ALL PRICING
const TAX_RATE = 0.18; // 18% GST
const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_COST = 40;

exports.calculateOrderTotals = (subtotal) => {
  const subtotalNum = parseFloat(subtotal);
  const tax = parseFloat((subtotalNum * TAX_RATE).toFixed(2));
  const shippingCost = subtotalNum > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = parseFloat((subtotalNum + tax + shippingCost).toFixed(2));

  return {
    subtotal: subtotalNum.toFixed(2),
    tax: tax.toFixed(2),
    shippingCost: shippingCost.toFixed(2),
    total: total.toFixed(2)
  };
};