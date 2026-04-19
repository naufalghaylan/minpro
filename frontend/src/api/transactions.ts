import api from "./index";

export const getTransactions = async () => {
  const res = await api.get("/admin/transactions");
  return res.data;
};

export const approveTransaction = async (id: string) => {
  const res = await api.post(`/admin/transactions/${id}/approve`);
  return res.data;
};

export const rejectTransaction = async (id: string) => {
  const res = await api.post(`/admin/transactions/${id}/reject`);
  return res.data;
};