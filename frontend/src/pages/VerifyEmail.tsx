import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { verifyEmail } from "../api/api";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader, ArrowRight } from "lucide-react";

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Enlace inválido o sin token adjunto.");
      return;
    }

    const verify = async () => {
      try {
        const res = await verifyEmail(token);
        setStatus("success");
        setMessage(res.message || "Correo verificado exitosamente. Ya puedes iniciar sesión.");
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.detail || "Enlace expirado o inválido.");
      }
    };

    // Agregar un pequeño delay para que la transición sea visible si es muy rápido
    setTimeout(verify, 1000);
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative overflow-hidden">
      {/* Fondo Decorativo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-f1-red/10 rounded-full blur-3xl -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -ml-20 -mb-20" />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative z-10 text-center"
      >
        <div className="flex justify-center mb-6">
          {status === "loading" && (
            <Loader className="animate-spin text-gray-400" size={64} />
          )}
          {status === "success" && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <CheckCircle className="text-green-500" size={64} />
            </motion.div>
          )}
          {status === "error" && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <XCircle className="text-red-500" size={64} />
            </motion.div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {status === "loading" ? "Verificando..." : 
           status === "success" ? "¡Cuenta Verificada!" : "Error en Verificación"}
        </h2>
        
        <p className={`text-sm mb-8 ${status === 'error' ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
          {status === "loading" ? "Estamos comprobando el tu enlace mágico en boxes..." : message}
        </p>

        {status !== "loading" && (
             <Link
                to="/login"
                className="w-full bg-f1-red text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                >
                Ir a Iniciar Sesión <ArrowRight size={20} />
             </Link>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
