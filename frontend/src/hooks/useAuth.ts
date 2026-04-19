import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  role: string;
}

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 🔥 TAMBAH INI

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false); // 🔥 selesai loading
  }, []);

  return { user, isLoading }; // 🔥 RETURN DUA-DUANYA
}