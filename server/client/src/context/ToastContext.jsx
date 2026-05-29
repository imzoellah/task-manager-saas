import { Toaster, toast } from "react-hot-toast";

export function ToastProvider({ children }) {
  return (
    <>
      {children}

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#18181b",
            color: "#fff",
            borderRadius: "14px",
          },
        }}
      />
    </>
  );
}

export { toast };