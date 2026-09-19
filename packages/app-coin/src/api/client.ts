import axios from "axios";
const client = axios.create({ baseURL: "https://nevo-live.onrender.com/api" });
client.interceptors.request.use((c) => {
  const s = localStorage.getItem("coin-auth");
  if (s) {
    try {
      const d = JSON.parse(s);
      // zustand persist format: { state: { user, token, isAuth } }
      const token = d?.state?.token || d?.token;
      if (token) c.headers.Authorization = `Bearer ${token}`;
    } catch {}
  }
  return c;
});
client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("coin-auth");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);
export default client;
