import axios from "axios";

const API = "http://localhost:3000";

export const createOrder = async (data: {
  costumerId: number;
  eventId: number;
  quantity: number;
}) => {
  const res = await axios.post(`${API}/orders`, data);
  return res.data;
};