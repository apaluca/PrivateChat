import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";

interface AuthProps {
  onAuthSuccess: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="w-full flex items-center justify-center">
      {isLogin ? (
        <Login onToggleForm={toggleForm} />
      ) : (
        <Register onToggleForm={toggleForm} />
      )}
    </div>
  );
};

export default Auth;
