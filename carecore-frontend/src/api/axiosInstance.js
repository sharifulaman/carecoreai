// @ts-nocheck
import axios from "axios";

// Local vs server API is controlled by VITE_API_BASE_URL in .env.
// In dev, requests always go through the Vite proxy (same-origin, no CORS), which
// forwards to whichever backend VITE_API_BASE_URL points at (see vite.config.js).
const baseURL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'https://app.carecoreai.co.uk/api');


const axiosInstance = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers:{
        'Content-Type':'application/json'
    }
});
axiosInstance.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('token');
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
export default axiosInstance;